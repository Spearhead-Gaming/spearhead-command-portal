import { createHash, randomUUID } from "node:crypto";

import type { DiscordGatewayEventEnvelope, DiscordGatewayEventName } from "@/server/discord/gateway/types";

type DiscordGatewayPayload = {
  d?: unknown;
  s?: number | null;
  t?: DiscordGatewayEventName | null;
};

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function getObjectValue(payload: unknown, key: string) {
  return payload && typeof payload === "object" && key in payload
    ? (payload as Record<string, unknown>)[key]
    : null;
}

function getStringValue(payload: unknown, key: string) {
  const value = getObjectValue(payload, key);

  return typeof value === "string" ? value : null;
}

function getNestedUserId(payload: unknown) {
  const user = getObjectValue(payload, "user");

  return user && typeof user === "object" ? getStringValue(user, "id") : null;
}

function getDiscordUserId(payload: unknown) {
  return (
    getStringValue(payload, "user_id") ??
    getNestedUserId(payload) ??
    (getObjectValue(payload, "member") ? getNestedUserId(getObjectValue(payload, "member")) : null)
  );
}

function getDiscordResourceId(payload: unknown) {
  return getStringValue(payload, "id") ?? getStringValue(payload, "role_id") ?? getStringValue(payload, "channel_id");
}

function getGuildId(payload: unknown) {
  return getStringValue(payload, "guild_id") ?? getStringValue(payload, "id");
}

function getChannelId(payload: unknown) {
  return getStringValue(payload, "channel_id") ?? getStringValue(payload, "parent_id");
}

function sanitizeMetadata(payload: unknown) {
  return {
    channelId: getChannelId(payload),
    discordResourceId: getDiscordResourceId(payload),
    discordUserId: getDiscordUserId(payload),
    guildId: getGuildId(payload),
  };
}

export function createDiscordGatewayEventEnvelope(input: {
  handlerVersion?: string;
  payload: DiscordGatewayPayload;
  sessionId?: string | null;
  shardId?: number;
}): DiscordGatewayEventEnvelope | null {
  if (!input.payload.t) {
    return null;
  }

  const receivedAt = new Date();
  const guildId = getGuildId(input.payload.d);
  const channelId = getChannelId(input.payload.d);
  const discordUserId = getDiscordUserId(input.payload.d);
  const discordResourceId = getDiscordResourceId(input.payload.d);
  const sequence = input.payload.s ?? null;
  const eventId = [
    "gateway",
    input.payload.t,
    guildId ?? "global",
    discordUserId ?? discordResourceId ?? channelId ?? "event",
    sequence ?? receivedAt.getTime(),
  ].join(":");
  const idempotencyKey = hashValue(eventId);

  return {
    channelId,
    correlationId: randomUUID(),
    discordResourceId,
    discordUserId,
    eventId,
    eventName: input.payload.t,
    eventType: input.payload.t,
    guildId,
    handlerVersion: input.handlerVersion ?? "1",
    idempotencyKey,
    occurredAt: null,
    payload: input.payload.d,
    payloadVersion: 1,
    processingStatus: "received",
    receivedAt,
    safeMetadata: sanitizeMetadata(input.payload.d),
    sequence,
    sessionIdHash: input.sessionId ? hashValue(input.sessionId) : null,
    shardId: input.shardId ?? 0,
    source: "discord_gateway",
  };
}
