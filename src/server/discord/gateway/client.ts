import { getDiscordGatewayConfig } from "@/server/discord/config";
import { DiscordGatewayEventDispatcher } from "@/server/discord/gateway/dispatcher";
import { createDiscordGatewayEventEnvelope } from "@/server/discord/gateway/envelope";
import { calculateGatewayIntentBitmask, normalizeGatewayIntents } from "@/server/discord/gateway/intents";
import { getDiscordGatewayEventRegistry } from "@/server/discord/gateway/registry";
import {
  incrementGatewayReconnect,
  recordGatewayHeartbeatAck,
  setGatewayStatus,
} from "@/server/discord/gateway/state-store";
import type { DiscordGatewayEventName } from "@/server/discord/gateway/types";
import { prisma } from "@/server/database/client";

type DiscordGatewayPayload = {
  d?: unknown;
  op: number;
  s?: number | null;
  t?: DiscordGatewayEventName | null;
};

type DiscordHelloPayload = {
  heartbeat_interval: number;
};

function isHelloPayload(value: unknown): value is DiscordHelloPayload {
  return Boolean(value && typeof value === "object" && "heartbeat_interval" in value);
}

function calculateReconnectDelay(attempt: number, maxDelayMs: number) {
  const baseDelay = Math.min(1000 * 2 ** Math.min(attempt, 5), maxDelayMs);
  const jitter = Math.floor(Math.random() * 500);

  return baseDelay + jitter;
}

export class DiscordGatewayClient {
  private dispatcher: DiscordGatewayEventDispatcher;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatSentAt: number | null = null;
  private reconnectAttempts = 0;
  private sequence: number | null = null;
  private sessionId: string | null = null;
  private shouldReconnect = true;
  private socket: WebSocket | null = null;

  constructor() {
    const config = getDiscordGatewayConfig();
    const intents = normalizeGatewayIntents(config.intents);

    this.dispatcher = new DiscordGatewayEventDispatcher(getDiscordGatewayEventRegistry(intents));
  }

  getRegisteredHandlers() {
    return this.dispatcher.getHandlers();
  }

  async start() {
    const config = getDiscordGatewayConfig();

    if (!config.enabled) {
      await setGatewayStatus({
        enabled: false,
        intents: config.intents,
        status: "disabled",
      });
      console.log("Discord Gateway disabled. Set DISCORD_GATEWAY_ENABLED=true to start the worker.");
      return;
    }

    if (!config.botToken || !config.applicationId) {
      await setGatewayStatus({
        enabled: true,
        errorSummary: "DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID are required.",
        intents: config.intents,
        status: "failed",
      });
      throw new Error("Discord Gateway requires DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID.");
    }

    await setGatewayStatus({
      enabled: true,
      intents: config.intents,
      status: "connecting",
    });
    this.connect();
  }

  async stop(reason = "Gateway worker stopping.") {
    this.shouldReconnect = false;
    this.clearHeartbeat();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000, reason);
    }

    await setGatewayStatus({
      status: "disconnected",
    });
    await prisma.$disconnect();
  }

  private connect() {
    const gatewayUrl = "wss://gateway.discord.gg/?v=10&encoding=json";

    this.socket = new WebSocket(gatewayUrl);
    this.socket.addEventListener("open", () => {
      void setGatewayStatus({
        status: this.reconnectAttempts > 0 ? "reconnecting" : "connecting",
      });
    });
    this.socket.addEventListener("message", (event) => {
      void this.handleMessage(String(event.data));
    });
    this.socket.addEventListener("close", (event) => {
      this.clearHeartbeat();
      void this.handleClose(event.reason || `Gateway socket closed with code ${event.code}.`);
    });
    this.socket.addEventListener("error", () => {
      void setGatewayStatus({
        errorSummary: "Discord Gateway socket error.",
        status: "degraded",
      });
    });
  }

  private async handleClose(reason: string) {
    if (!this.shouldReconnect) {
      return;
    }

    this.reconnectAttempts += 1;
    await incrementGatewayReconnect(reason);

    const config = getDiscordGatewayConfig();
    const delay = calculateReconnectDelay(this.reconnectAttempts, config.reconnectMaxDelayMs);

    setTimeout(() => this.connect(), delay);
  }

  private async handleMessage(rawData: string) {
    const payload = JSON.parse(rawData) as DiscordGatewayPayload;

    if (typeof payload.s === "number") {
      this.sequence = payload.s;
    }

    switch (payload.op) {
      case 0:
        this.handleDispatch(payload);
        return;
      case 7:
        this.reconnect("Discord requested Gateway reconnect.");
        return;
      case 9:
        this.reconnect("Discord invalidated Gateway session.");
        return;
      case 10:
        if (isHelloPayload(payload.d)) {
          this.startHeartbeat(payload.d.heartbeat_interval);
          this.identify();
        }
        return;
      case 11:
        if (this.lastHeartbeatSentAt) {
          await recordGatewayHeartbeatAck(Date.now() - this.lastHeartbeatSentAt);
        }
        return;
      default:
        return;
    }
  }

  private handleDispatch(payload: DiscordGatewayPayload) {
    const event = createDiscordGatewayEventEnvelope({
      payload,
      sessionId: this.sessionId,
      shardId: 0,
    });

    if (!event) {
      return;
    }

    if (event.eventName === "READY" && event.payload && typeof event.payload === "object" && "session_id" in event.payload) {
      const sessionId = (event.payload as { session_id?: unknown }).session_id;

      this.sessionId = typeof sessionId === "string" ? sessionId : this.sessionId;
    }

    this.dispatcher.dispatch(event);
  }

  private identify() {
    const config = getDiscordGatewayConfig();
    const intents = normalizeGatewayIntents(config.intents);
    const bitmask = calculateGatewayIntentBitmask(intents);

    this.send({
      d: {
        intents: bitmask,
        presence: {
          activities: [
            {
              name: "Spearhead Command Portal",
              type: 0,
            },
          ],
          afk: false,
          status: "online",
        },
        properties: {
          browser: "spearhead-command-portal",
          device: "spearhead-command-portal",
          os: process.platform,
        },
        shard: [0, config.shardCount],
        token: config.botToken,
      },
      op: 2,
    });
  }

  private startHeartbeat(intervalMs: number) {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.lastHeartbeatSentAt = Date.now();
      this.send({
        d: this.sequence,
        op: 1,
      });
    }, intervalMs);
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private reconnect(reason: string) {
    this.clearHeartbeat();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(4000, reason);
    } else {
      void this.handleClose(reason);
    }
  }

  private send(payload: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }
}
