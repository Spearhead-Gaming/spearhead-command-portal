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
  | "GuildScheduledEvents"
  | "GuildVoiceStates"
  | "GuildMessages"
  | "MessageContent";

export type DiscordGatewayEventName =
  | "READY"
  | "RESUMED"
  | "GUILD_CREATE"
  | "GUILD_DELETE"
  | "GUILD_UPDATE"
  | "GUILD_MEMBER_ADD"
  | "GUILD_MEMBER_REMOVE"
  | "GUILD_MEMBER_UPDATE"
  | "GUILD_ROLE_CREATE"
  | "GUILD_ROLE_UPDATE"
  | "GUILD_ROLE_DELETE"
  | "CHANNEL_CREATE"
  | "CHANNEL_UPDATE"
  | "CHANNEL_DELETE"
  | "THREAD_CREATE"
  | "THREAD_UPDATE"
  | "THREAD_DELETE"
  | "THREAD_LIST_SYNC"
  | "GUILD_SCHEDULED_EVENT_CREATE"
  | "GUILD_SCHEDULED_EVENT_UPDATE"
  | "GUILD_SCHEDULED_EVENT_DELETE"
  | "GUILD_SCHEDULED_EVENT_USER_ADD"
  | "GUILD_SCHEDULED_EVENT_USER_REMOVE"
  | "VOICE_STATE_UPDATE"
  | "MESSAGE_CREATE"
  | "SHARD_ERROR";

export type DiscordGatewayEventEnvelope<TPayload = unknown> = {
  channelId: string | null;
  correlationId: string;
  discordResourceId: string | null;
  discordUserId: string | null;
  eventId: string;
  eventName: DiscordGatewayEventName;
  eventType: DiscordGatewayEventName;
  guildId: string | null;
  handlerVersion: string;
  idempotencyKey: string;
  occurredAt: Date | null;
  payload: TPayload;
  payloadVersion: number;
  processingStatus: "received" | "queued" | "processing" | "processed" | "skipped" | "failed";
  receivedAt: Date;
  safeMetadata: Record<string, unknown>;
  sequence: number | null;
  sessionIdHash: string | null;
  shardId: number;
  source: "discord_gateway";
};

export type LegacyDiscordGatewayEventEnvelope<TPayload = unknown> = {
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
  idempotencyScope?: "event" | "handler" | "resource" | "member" | "voice" | "message";
  getIdempotencyKey?: (event: DiscordGatewayEventEnvelope) => string;
  timeoutMs?: number;
  owningDomain: string;
  priority: number;
  requiredIntents: DiscordGatewayIntentName[];
  retentionDays?: number;
  version?: string;
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
    version: string;
  }>;
  failedEvents: Array<{
    correlationId: string | null;
    errorMessage: string | null;
    eventName: string;
    handlerId: string | null;
    id: string;
    occurredAtLabel: string;
    retryable: boolean;
    summary: string;
  }>;
  metrics: {
    failedEventCount: number;
    processedEventCount: number;
    skippedEventCount: number;
    staleEventCount: number;
  };
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
