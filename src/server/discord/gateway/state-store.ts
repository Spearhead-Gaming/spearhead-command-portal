import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/client";
import type { DiscordGatewayEventEnvelope, DiscordGatewayStatus } from "@/server/discord/gateway/types";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function sanitizeSessionId(value?: string | null) {
  return value ? `${value.slice(0, 8)}...${value.slice(-4)}` : null;
}

export async function setGatewayStatus(input: {
  enabled?: boolean;
  status: DiscordGatewayStatus;
  errorSummary?: string | null;
  intents?: string[];
}) {
  const now = new Date();

  return prisma.discordGatewayState.upsert({
    create: {
      enabled: input.enabled ?? false,
      enabledIntents: input.intents ? toJson(input.intents) : undefined,
      lastDisconnectedAt: ["disconnected", "failed", "degraded"].includes(input.status) ? now : null,
      lastErrorSummary: input.errorSummary ?? null,
      status: input.status,
    },
    update: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.intents ? { enabledIntents: toJson(input.intents) } : {}),
      lastDisconnectedAt: ["disconnected", "failed", "degraded"].includes(input.status) ? now : undefined,
      lastErrorSummary: input.errorSummary ?? undefined,
      status: input.status,
    },
    where: {
      id: "singleton",
    },
  });
}

export async function recordGatewayReady(input: {
  botUserId?: string | null;
  botUsername?: string | null;
  guildCount: number;
  intents: string[];
  resumeGatewayUrl?: string | null;
  sessionId?: string | null;
  shardCount: number;
}) {
  const now = new Date();

  return prisma.discordGatewayState.upsert({
    create: {
      botUserId: input.botUserId ?? null,
      botUsername: input.botUsername ?? null,
      enabled: true,
      enabledIntents: toJson(input.intents),
      guildCount: input.guildCount,
      lastConnectedAt: now,
      lastEventAt: now,
      lastReadyAt: now,
      resumeGatewayUrl: input.resumeGatewayUrl ?? null,
      sessionId: sanitizeSessionId(input.sessionId),
      shardCount: input.shardCount,
      status: "connected",
    },
    update: {
      botUserId: input.botUserId ?? null,
      botUsername: input.botUsername ?? null,
      enabled: true,
      enabledIntents: toJson(input.intents),
      guildCount: input.guildCount,
      lastConnectedAt: now,
      lastEventAt: now,
      lastReadyAt: now,
      lastErrorSummary: null,
      resumeGatewayUrl: input.resumeGatewayUrl ?? null,
      sessionId: sanitizeSessionId(input.sessionId),
      shardCount: input.shardCount,
      status: "connected",
    },
    where: {
      id: "singleton",
    },
  });
}

export async function recordGatewayHeartbeatAck(latencyMs: number) {
  return prisma.discordGatewayState.upsert({
    create: {
      enabled: true,
      lastHeartbeatAckAt: new Date(),
      latencyMs,
      status: "connected",
    },
    update: {
      lastHeartbeatAckAt: new Date(),
      latencyMs,
    },
    where: {
      id: "singleton",
    },
  });
}

export async function incrementGatewayReconnect(errorSummary?: string | null) {
  return prisma.discordGatewayState.upsert({
    create: {
      enabled: true,
      lastErrorSummary: errorSummary ?? null,
      reconnectCount: 1,
      status: "reconnecting",
    },
    update: {
      lastErrorSummary: errorSummary ?? undefined,
      reconnectCount: {
        increment: 1,
      },
      status: "reconnecting",
    },
    where: {
      id: "singleton",
    },
  });
}

export async function recordGatewayEvent(input: {
  event: DiscordGatewayEventEnvelope;
  handlerId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
  summary: string;
}) {
  const server = input.event.guildId
    ? await prisma.discordServer.findUnique({
        where: {
          guildId: input.event.guildId,
        },
        select: {
          id: true,
        },
      })
    : null;
  const data = {
    discordServerId: server?.id ?? null,
    eventName: input.event.eventName,
    guildId: input.event.guildId,
    handlerId: input.handlerId ?? null,
    metadata: input.metadata ? toJson(input.metadata) : undefined,
    occurredAt: input.event.receivedAt,
    status: input.status ?? "processed",
    summary: input.summary,
  };

  if (input.idempotencyKey) {
    await prisma.discordGatewayEventLog.upsert({
      create: {
        ...data,
        idempotencyKey: input.idempotencyKey,
      },
      update: {
        ...data,
      },
      where: {
        idempotencyKey: input.idempotencyKey,
      },
    });
  } else {
    await prisma.discordGatewayEventLog.create({
      data,
    });
  }

  await prisma.discordGatewayState.upsert({
    create: {
      enabled: true,
      eventCount: 1,
      lastEventAt: input.event.receivedAt,
      lastSequence: input.event.sequence ?? null,
      status: "connected",
    },
    update: {
      eventCount: {
        increment: 1,
      },
      lastEventAt: input.event.receivedAt,
      lastSequence: input.event.sequence ?? undefined,
    },
    where: {
      id: "singleton",
    },
  });
}

export async function recordGatewayEventFailure(input: {
  errorMessage: string;
  event: DiscordGatewayEventEnvelope;
  handlerId?: string | null;
  idempotencyKey?: string | null;
}) {
  await recordGatewayEvent({
    event: input.event,
    handlerId: input.handlerId,
    idempotencyKey: input.idempotencyKey,
    status: "failed",
    summary: input.errorMessage,
  });

  await setGatewayStatus({
    errorSummary: input.errorMessage,
    status: "degraded",
  });
}
