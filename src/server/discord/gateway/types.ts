import type { RuleEvaluationResult } from "@/server/rules/types";

export type DiscordGatewayStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "degraded"
  | "failed";

export type DiscordGatewayIntentName =
  | "Guilds"
  | "GuildMembers"
  | "GuildVoiceStates"
  | "GuildMessages"
  | "MessageContent";

export type DiscordGatewayEventName =
  | "READY"
  | "RESUMED"
  | "GUILD_CREATE"
  | "GUILD_DELETE"
  | "GUILD_MEMBER_ADD"
  | "GUILD_MEMBER_REMOVE"
  | "GUILD_MEMBER_UPDATE"
  | "VOICE_STATE_UPDATE"
  | "MESSAGE_CREATE"
  | "GUILD_ROLE_CREATE"
  | "GUILD_ROLE_UPDATE"
  | "SHARD_ERROR";

export type DiscordGatewayEventEnvelope<TPayload = unknown> = {
  eventName: DiscordGatewayEventName;
  guildId: string | null;
  payload: TPayload;
  sequence: number | null;
  receivedAt: Date;
};

export type DiscordGatewayEventHandler = {
  description: string;
  enabled: boolean;
  eventName: DiscordGatewayEventName;
  handlerId: string;
  handle: (event: DiscordGatewayEventEnvelope) => Promise<void>;
  owningDomain: string;
  priority: number;
  requiredIntents: DiscordGatewayIntentName[];
  retry: {
    attempts: number;
    backoffMs: number;
  };
};

export type DiscordGatewayHealthSummary = {
  botUsername: string | null;
  enabled: boolean;
  enabledIntents: string[];
  eventHandlers: Array<{
    description: string;
    enabled: boolean;
    eventName: string;
    handlerId: string;
    owningDomain: string;
    requiredIntents: string[];
  }>;
  guildCount: number;
  lastConnectedAtLabel: string | null;
  lastDisconnectedAtLabel: string | null;
  lastErrorSummary: string | null;
  lastEventAtLabel: string | null;
  latencyMs: number | null;
  recentEvents: Array<{
    eventName: string;
    id: string;
    occurredAtLabel: string;
    status: string;
    summary: string;
  }>;
  recommendations: Array<{
    action: string;
    id: string;
    priority: "high" | "medium" | "low" | "informational";
    title: string;
  }>;
  reconnectCount: number;
  rules: RuleEvaluationResult[];
  sessionId: string | null;
  status: DiscordGatewayStatus;
};
