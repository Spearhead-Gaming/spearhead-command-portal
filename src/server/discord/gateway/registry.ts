import {
  handleGatewayGuildMemberAdd,
  handleGatewayGuildMemberRemove,
  handleGatewayGuildMemberUpdate,
} from "@/server/discord/gateway/member-events";
import { handleGatewayAttachmentContinuation } from "@/server/discord/gateway/attachment-continuation";
import { handleGatewayVoiceStateUpdate } from "@/server/discord/gateway/voice-state";
import { recordGatewayEvent, recordGatewayReady, setGatewayStatus } from "@/server/discord/gateway/state-store";
import type { DiscordGatewayEventHandler } from "@/server/discord/gateway/types";
import { recordAuditEvent } from "@/server/services/audit-log-service";

type ReadyPayload = {
  guilds?: Array<{
    id: string;
    unavailable?: boolean;
  }>;
  resume_gateway_url?: string | null;
  session_id?: string | null;
  shard?: [number, number];
  user?: {
    id?: string;
    username?: string;
  };
};

function createGatewayEventHandlers(intents: string[]): DiscordGatewayEventHandler[] {
  const messageContinuationEnabled = intents.includes("GuildMessages");

  return [
    {
      description: "Records bot identity, guild count, session resume data, and connected health.",
      enabled: true,
      eventName: "READY",
      handlerId: "discord.gateway.ready",
      handle: async (event) => {
        const payload = event.payload as ReadyPayload;

        await recordGatewayReady({
          botUserId: payload.user?.id ?? null,
          botUsername: payload.user?.username ?? null,
          guildCount: payload.guilds?.length ?? 0,
          intents,
          resumeGatewayUrl: payload.resume_gateway_url ?? null,
          sessionId: payload.session_id ?? null,
          shardCount: payload.shard?.[1] ?? 1,
        });
        await recordAuditEvent({
          action: "discord.gateway.connected",
          entityType: "DiscordGatewayState",
          metadata: {
            guildCount: payload.guilds?.length ?? 0,
          },
          summary: "Discord Gateway connected.",
        });
      },
      owningDomain: "discord",
      priority: 10,
      requiredIntents: ["Guilds"],
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Records successful Gateway session resume.",
      enabled: true,
      eventName: "RESUMED",
      handlerId: "discord.gateway.resumed",
      handle: async (event) => {
        await setGatewayStatus({
          status: "connected",
        });
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.resumed",
          summary: "Discord Gateway session resumed.",
        });
      },
      owningDomain: "discord",
      priority: 20,
      requiredIntents: ["Guilds"],
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Tracks guild availability from Gateway events.",
      enabled: true,
      eventName: "GUILD_CREATE",
      handlerId: "discord.gateway.guild-create",
      handle: async (event) => {
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.guild-create",
          idempotencyKey: `guild-create:${event.guildId}:${event.sequence ?? event.receivedAt.getTime()}`,
          summary: "Discord guild became available to the Gateway.",
        });
      },
      owningDomain: "discord",
      priority: 30,
      requiredIntents: ["Guilds"],
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Tracks guild unavailability or removal from Gateway events.",
      enabled: true,
      eventName: "GUILD_DELETE",
      handlerId: "discord.gateway.guild-delete",
      handle: async (event) => {
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.guild-delete",
          idempotencyKey: `guild-delete:${event.guildId}:${event.sequence ?? event.receivedAt.getTime()}`,
          status: "degraded",
          summary: "Discord guild became unavailable or was removed from the Gateway.",
        });
      },
      owningDomain: "discord",
      priority: 35,
      requiredIntents: ["Guilds"],
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Processes human member joins through portal identity sync services.",
      enabled: true,
      eventName: "GUILD_MEMBER_ADD",
      handlerId: "discord.gateway.member-add",
      handle: async (event) => {
        await handleGatewayGuildMemberAdd(event.payload as never);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.member-add",
          idempotencyKey: `member-add:${event.guildId}:${(event.payload as { user?: { id?: string } }).user?.id ?? event.sequence}`,
          summary: "Discord member join processed through portal identity sync.",
        });
      },
      owningDomain: "personnel",
      priority: 40,
      requiredIntents: ["GuildMembers"],
      retry: {
        attempts: 2,
        backoffMs: 1000,
      },
    },
    {
      description: "Marks guild membership as left while preserving portal records.",
      enabled: true,
      eventName: "GUILD_MEMBER_REMOVE",
      handlerId: "discord.gateway.member-remove",
      handle: async (event) => {
        await handleGatewayGuildMemberRemove(event.payload as never);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.member-remove",
          idempotencyKey: `member-remove:${event.guildId}:${(event.payload as { user?: { id?: string } }).user?.id ?? event.sequence}`,
          summary: "Discord member leave processed while preserving portal profile history.",
        });
      },
      owningDomain: "personnel",
      priority: 45,
      requiredIntents: ["GuildMembers"],
      retry: {
        attempts: 2,
        backoffMs: 1000,
      },
    },
    {
      description: "Synchronizes Discord-owned identity fields only.",
      enabled: true,
      eventName: "GUILD_MEMBER_UPDATE",
      handlerId: "discord.gateway.member-update",
      handle: async (event) => {
        await handleGatewayGuildMemberUpdate(event.payload as never);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.member-update",
          idempotencyKey: `member-update:${event.guildId}:${(event.payload as { user?: { id?: string } }).user?.id ?? event.sequence}`,
          summary: "Discord member update synchronized identity fields only.",
        });
      },
      owningDomain: "personnel",
      priority: 50,
      requiredIntents: ["GuildMembers"],
      retry: {
        attempts: 2,
        backoffMs: 1000,
      },
    },
    {
      description: "Tracks optional voice presence suggestions without marking attendance.",
      enabled: true,
      eventName: "VOICE_STATE_UPDATE",
      handlerId: "discord.gateway.voice-state",
      handle: async (event) => {
        await handleGatewayVoiceStateUpdate(event as never);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.voice-state",
          idempotencyKey: `voice:${event.guildId}:${(event.payload as { user_id?: string }).user_id ?? event.sequence}:${event.sequence ?? event.receivedAt.getTime()}`,
          summary: "Discord voice state observed as a non-authoritative presence suggestion.",
        });
      },
      owningDomain: "patrols",
      priority: 60,
      requiredIntents: ["GuildVoiceStates"],
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Handles approved attachment continuation sessions only.",
      enabled: messageContinuationEnabled,
      eventName: "MESSAGE_CREATE",
      handlerId: "discord.gateway.message-attachment-continuation",
      handle: async (event) => {
        const result = await handleGatewayAttachmentContinuation(event.payload as never);

        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.message-attachment-continuation",
          idempotencyKey: `message:${(event.payload as { id?: string }).id ?? event.sequence}`,
          status: result ? "processed" : "skipped",
          summary: result
            ? "Gateway attachment continuation completed an active interaction session."
            : "Message ignored because no active approved attachment continuation session matched.",
        });
      },
      owningDomain: "discord-interactions",
      priority: 70,
      requiredIntents: ["GuildMessages"],
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Logs role mapping diagnostics without automatically syncing roles.",
      enabled: true,
      eventName: "GUILD_ROLE_CREATE",
      handlerId: "discord.gateway.role-create",
      handle: async (event) => {
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.role-create",
          summary: "Discord role create observed for mapping diagnostics.",
        });
      },
      owningDomain: "discord",
      priority: 80,
      requiredIntents: ["Guilds"],
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Logs role mapping diagnostics without automatically syncing roles.",
      enabled: true,
      eventName: "GUILD_ROLE_UPDATE",
      handlerId: "discord.gateway.role-update",
      handle: async (event) => {
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.role-update",
          summary: "Discord role update observed for mapping diagnostics.",
        });
      },
      owningDomain: "discord",
      priority: 85,
      requiredIntents: ["Guilds"],
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
  ];
}

export function getDiscordGatewayEventRegistry(intents: string[]) {
  return createGatewayEventHandlers(intents).sort((left, right) => left.priority - right.priority);
}
