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
import {
  handleGatewayChannelCreateOrUpdate,
  handleGatewayChannelDelete,
  handleGatewayGuildCreateOrUpdate,
  handleGatewayGuildDelete,
  handleGatewayRoleCreateOrUpdate,
  handleGatewayRoleDelete,
  handleGatewayScheduledEventCreateOrUpdate,
  handleGatewayScheduledEventDelete,
} from "@/server/discord/gateway/resources";

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
  const scheduledEventsEnabled = intents.includes("GuildScheduledEvents");

  return [
    {
      description: "Records bot identity, guild count, session resume data, and connected health.",
      enabled: true,
      eventName: "READY",
      handlerId: "discord.gateway.ready",
      getIdempotencyKey: (event) => `gateway-ready:${event.sequence ?? event.receivedAt.getTime()}`,
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
      version: "2",
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
      getIdempotencyKey: (event) => `gateway-resumed:${event.sequence ?? event.receivedAt.getTime()}`,
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
      version: "2",
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
      getIdempotencyKey: (event) => `guild-create:${event.guildId}:${event.sequence ?? event.receivedAt.getTime()}`,
      handle: async (event) => {
        await handleGatewayGuildCreateOrUpdate(event);
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
      version: "2",
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
      getIdempotencyKey: (event) => `guild-delete:${event.guildId}:${event.sequence ?? event.receivedAt.getTime()}`,
      handle: async (event) => {
        await handleGatewayGuildDelete(event);
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
      version: "2",
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Updates Discord-owned guild metadata while preserving portal configuration.",
      enabled: true,
      eventName: "GUILD_UPDATE",
      handlerId: "discord.gateway.guild-update",
      getIdempotencyKey: (event) => `guild-update:${event.guildId}:${event.sequence ?? event.receivedAt.getTime()}`,
      handle: async (event) => {
        await handleGatewayGuildCreateOrUpdate(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.guild-update",
          idempotencyKey: `guild-update:${event.guildId}:${event.sequence ?? event.receivedAt.getTime()}`,
          summary: "Discord guild metadata updated from Gateway observation.",
        });
      },
      owningDomain: "discord",
      priority: 37,
      requiredIntents: ["Guilds"],
      version: "1",
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
      getIdempotencyKey: (event) => `member-add:${event.guildId}:${(event.payload as { user?: { id?: string } }).user?.id ?? event.discordUserId ?? event.sequence}`,
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
      version: "2",
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
      getIdempotencyKey: (event) => `member-remove:${event.guildId}:${(event.payload as { user?: { id?: string } }).user?.id ?? event.discordUserId ?? event.sequence}`,
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
      version: "2",
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
      getIdempotencyKey: (event) => `member-update:${event.guildId}:${(event.payload as { user?: { id?: string } }).user?.id ?? event.discordUserId ?? event.sequence}`,
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
      version: "2",
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
      getIdempotencyKey: (event) => `voice:${event.guildId}:${(event.payload as { user_id?: string }).user_id ?? event.discordUserId ?? event.sequence}:${(event.payload as { channel_id?: string | null }).channel_id ?? "left"}`,
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
      version: "2",
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
      getIdempotencyKey: (event) => `message:${(event.payload as { id?: string }).id ?? event.sequence}`,
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
      version: "2",
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
      getIdempotencyKey: (event) => `role-create:${event.guildId}:${(event.payload as { role?: { id?: string } }).role?.id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayRoleCreateOrUpdate(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.role-create",
          summary: "Discord role create observed for mapping diagnostics.",
        });
      },
      owningDomain: "discord",
      priority: 80,
      requiredIntents: ["Guilds"],
      version: "2",
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
      getIdempotencyKey: (event) => `role-update:${event.guildId}:${(event.payload as { role?: { id?: string } }).role?.id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayRoleCreateOrUpdate(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.role-update",
          summary: "Discord role update observed for mapping diagnostics.",
        });
      },
      owningDomain: "discord",
      priority: 85,
      requiredIntents: ["Guilds"],
      version: "2",
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Marks deleted roles missing and opens reconciliation when mapped roles are affected.",
      enabled: true,
      eventName: "GUILD_ROLE_DELETE",
      handlerId: "discord.gateway.role-delete",
      getIdempotencyKey: (event) => `role-delete:${event.guildId}:${(event.payload as { role_id?: string }).role_id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayRoleDelete(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.role-delete",
          summary: "Discord role deletion observed for mapping and automation reconciliation.",
        });
      },
      owningDomain: "discord",
      priority: 90,
      requiredIntents: ["Guilds"],
      version: "1",
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Updates discovered channel metadata from Gateway observations.",
      enabled: true,
      eventName: "CHANNEL_CREATE",
      handlerId: "discord.gateway.channel-create",
      getIdempotencyKey: (event) => `channel-create:${event.guildId}:${(event.payload as { id?: string }).id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayChannelCreateOrUpdate(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.channel-create",
          summary: "Discord channel creation observed for communication routing inventory.",
        });
      },
      owningDomain: "communications",
      priority: 95,
      requiredIntents: ["Guilds"],
      version: "1",
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Updates discovered channel metadata without remapping by name.",
      enabled: true,
      eventName: "CHANNEL_UPDATE",
      handlerId: "discord.gateway.channel-update",
      getIdempotencyKey: (event) => `channel-update:${event.guildId}:${(event.payload as { id?: string }).id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayChannelCreateOrUpdate(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.channel-update",
          summary: "Discord channel update observed for communication routing inventory.",
        });
      },
      owningDomain: "communications",
      priority: 96,
      requiredIntents: ["Guilds"],
      version: "1",
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Marks deleted channels missing and opens reconciliation for affected mappings.",
      enabled: true,
      eventName: "CHANNEL_DELETE",
      handlerId: "discord.gateway.channel-delete",
      getIdempotencyKey: (event) => `channel-delete:${event.guildId}:${(event.payload as { id?: string }).id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayChannelDelete(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.channel-delete",
          summary: "Discord channel deletion observed for communication routing reconciliation.",
        });
      },
      owningDomain: "communications",
      priority: 97,
      requiredIntents: ["Guilds"],
      version: "1",
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Observes Discord-native scheduled events without creating portal operations.",
      enabled: scheduledEventsEnabled,
      eventName: "GUILD_SCHEDULED_EVENT_CREATE",
      handlerId: "discord.gateway.scheduled-event-create",
      getIdempotencyKey: (event) => `scheduled-event-create:${event.guildId}:${(event.payload as { id?: string }).id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayScheduledEventCreateOrUpdate(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.scheduled-event-create",
          summary: "Discord scheduled event observed without creating a portal event.",
        });
      },
      owningDomain: "discord-events",
      priority: 110,
      requiredIntents: ["GuildScheduledEvents"],
      version: "1",
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Updates observed Discord-native scheduled event metadata only.",
      enabled: scheduledEventsEnabled,
      eventName: "GUILD_SCHEDULED_EVENT_UPDATE",
      handlerId: "discord.gateway.scheduled-event-update",
      getIdempotencyKey: (event) => `scheduled-event-update:${event.guildId}:${(event.payload as { id?: string }).id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayScheduledEventCreateOrUpdate(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.scheduled-event-update",
          summary: "Discord scheduled event metadata updated from Gateway observation.",
        });
      },
      owningDomain: "discord-events",
      priority: 111,
      requiredIntents: ["GuildScheduledEvents"],
      version: "1",
      retry: {
        attempts: 1,
        backoffMs: 500,
      },
    },
    {
      description: "Marks observed Discord-native scheduled events missing when deleted.",
      enabled: scheduledEventsEnabled,
      eventName: "GUILD_SCHEDULED_EVENT_DELETE",
      handlerId: "discord.gateway.scheduled-event-delete",
      getIdempotencyKey: (event) => `scheduled-event-delete:${event.guildId}:${(event.payload as { id?: string }).id ?? event.discordResourceId ?? event.sequence}`,
      handle: async (event) => {
        await handleGatewayScheduledEventDelete(event);
        await recordGatewayEvent({
          event,
          handlerId: "discord.gateway.scheduled-event-delete",
          summary: "Discord scheduled event deletion observed without deleting portal events.",
        });
      },
      owningDomain: "discord-events",
      priority: 112,
      requiredIntents: ["GuildScheduledEvents"],
      version: "1",
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
