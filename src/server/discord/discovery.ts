import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/client";
import { discordRestRequest, DiscordRestError } from "@/server/discord/client/rest";
import { buildDiscordIconUrl, mapDiscordChannelType } from "@/server/discord/platform";
import { createNotification } from "@/server/notifications/service";
import { recordAuditEvent } from "@/server/services/audit-log-service";

export type DiscordDiscoveryResourceType =
  | "guild"
  | "channels"
  | "roles"
  | "events"
  | "emojis"
  | "stickers"
  | "permissions";

export type DiscordDiscoveryType = "full" | "incremental" | "targeted" | "dry_run" | "repair_scan";

type DiscordApiGuild = {
  approximate_member_count?: number;
  features?: string[];
  icon?: string | null;
  id: string;
  name: string;
  owner_id?: string | null;
  preferred_locale?: string | null;
  verification_level?: number;
};

type DiscordApiChannel = {
  id: string;
  name?: string;
  nsfw?: boolean;
  parent_id?: string | null;
  permission_overwrites?: unknown[];
  position?: number;
  type: number;
};

type DiscordApiRole = {
  color?: number;
  hoist?: boolean;
  id: string;
  managed?: boolean;
  mentionable?: boolean;
  name: string;
  permissions?: string;
  position?: number;
  tags?: Record<string, unknown>;
};

type DiscordApiScheduledEvent = {
  channel_id?: string | null;
  creator_id?: string | null;
  description?: string | null;
  entity_type: number;
  id: string;
  image?: string | null;
  name: string;
  scheduled_end_time?: string | null;
  scheduled_start_time?: string | null;
  status: number;
};

type DiscordApiEmoji = {
  animated?: boolean;
  available?: boolean;
  id: string;
  managed?: boolean;
  name?: string | null;
};

type DiscordApiSticker = {
  available?: boolean;
  description?: string | null;
  format_type: number;
  id: string;
  name: string;
  tags?: string | null;
};

type NormalizedResource = {
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  parentId?: string | null;
  permissions?: unknown;
  position?: number | null;
  type: string;
};

type DiffStatus =
  | "Added"
  | "Updated"
  | "Renamed"
  | "Moved"
  | "PermissionChanged"
  | "Missing"
  | "Restored"
  | "Unchanged"
  | "OrphanedMapping";

type DiffItem = {
  currentState?: Record<string, unknown> | null;
  impactSummary?: string | null;
  priorState?: Record<string, unknown> | null;
  recommendedAction?: string | null;
  resourceId: string;
  resourceType: string;
  severity: "info" | "warning" | "danger";
  status: DiffStatus;
  summary: string;
};

const DEFAULT_RESOURCE_TYPES: DiscordDiscoveryResourceType[] = [
  "guild",
  "channels",
  "roles",
  "events",
  "emojis",
  "stickers",
  "permissions",
];

function parseDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function mapScheduledEventStatus(value: number) {
  switch (value) {
    case 1:
      return "scheduled";
    case 2:
      return "active";
    case 3:
      return "completed";
    case 4:
      return "cancelled";
    default:
      return `unknown_${value}`;
  }
}

function mapScheduledEventType(value: number) {
  switch (value) {
    case 1:
      return "stage_instance";
    case 2:
      return "voice";
    case 3:
      return "external";
    default:
      return `unknown_${value}`;
  }
}

function mapStickerFormat(value: number) {
  switch (value) {
    case 1:
      return "png";
    case 2:
      return "apng";
    case 3:
      return "lottie";
    case 4:
      return "gif";
    default:
      return `unknown_${value}`;
  }
}

function normalizeChannels(channels: DiscordApiChannel[]): NormalizedResource[] {
  return channels.map((channel) => ({
    id: channel.id,
    metadata: {
      nsfw: channel.nsfw ?? false,
      permissionOverwrites: channel.permission_overwrites ?? [],
    },
    name: channel.name ?? `Channel ${channel.id}`,
    parentId: channel.parent_id ?? null,
    permissions: channel.permission_overwrites ?? [],
    position: channel.position ?? null,
    type: mapDiscordChannelType(channel.type),
  }));
}

function normalizeRoles(roles: DiscordApiRole[]): NormalizedResource[] {
  return roles.map((role) => ({
    id: role.id,
    metadata: {
      botManageable: false,
      color: role.color ?? null,
      hoisted: role.hoist ?? false,
      managed: role.managed ?? false,
      mentionable: role.mentionable ?? false,
      permissions: role.permissions ?? null,
      tags: role.tags ?? null,
    },
    name: role.name,
    permissions: role.permissions ?? null,
    position: role.position ?? null,
    type: "role",
  }));
}

function normalizeEvents(events: DiscordApiScheduledEvent[]): NormalizedResource[] {
  return events.map((event) => ({
    id: event.id,
    metadata: {
      channelId: event.channel_id ?? null,
      creatorId: event.creator_id ?? null,
      description: event.description ?? null,
      entityType: mapScheduledEventType(event.entity_type),
      image: event.image ?? null,
      scheduledEndAt: event.scheduled_end_time ?? null,
      scheduledStartAt: event.scheduled_start_time ?? null,
      status: mapScheduledEventStatus(event.status),
    },
    name: event.name,
    parentId: event.channel_id ?? null,
    type: mapScheduledEventType(event.entity_type),
  }));
}

function normalizeEmojis(emojis: DiscordApiEmoji[]): NormalizedResource[] {
  return emojis.map((emoji) => ({
    id: emoji.id,
    metadata: {
      animated: emoji.animated ?? false,
      available: emoji.available ?? true,
      managed: emoji.managed ?? false,
    },
    name: emoji.name ?? `Emoji ${emoji.id}`,
    type: "emoji",
  }));
}

function normalizeStickers(stickers: DiscordApiSticker[]): NormalizedResource[] {
  return stickers.map((sticker) => ({
    id: sticker.id,
    metadata: {
      available: sticker.available ?? true,
      description: sticker.description ?? null,
      formatType: mapStickerFormat(sticker.format_type),
      tags: sticker.tags ?? null,
    },
    name: sticker.name,
    type: mapStickerFormat(sticker.format_type),
  }));
}

function metadataChanged(prior: NormalizedResource, current: NormalizedResource) {
  return JSON.stringify(prior.metadata) !== JSON.stringify(current.metadata);
}

function buildDiffs(input: {
  activeMappings: Array<{ id: string; key?: string; resourceId: string; resourceType: string }>;
  current: NormalizedResource[];
  prior: NormalizedResource[];
  resourceType: string;
}) {
  const diffs: DiffItem[] = [];
  const priorById = new Map(input.prior.map((resource) => [resource.id, resource]));
  const currentById = new Map(input.current.map((resource) => [resource.id, resource]));

  for (const current of input.current) {
    const prior = priorById.get(current.id);

    if (!prior) {
      diffs.push({
        currentState: current,
        recommendedAction: "Review and map only if a portal workflow needs this resource.",
        resourceId: current.id,
        resourceType: input.resourceType,
        severity: "info",
        status: "Added",
        summary: `${current.name} was discovered.`,
      });
      continue;
    }

    if (prior.name !== current.name) {
      diffs.push({
        currentState: current,
        priorState: prior,
        recommendedAction: "Accept metadata update and keep mappings by Discord ID.",
        resourceId: current.id,
        resourceType: input.resourceType,
        severity: "info",
        status: "Renamed",
        summary: `${prior.name} was renamed to ${current.name}.`,
      });
    }

    if (prior.parentId !== current.parentId || prior.position !== current.position) {
      diffs.push({
        currentState: current,
        priorState: prior,
        recommendedAction: "Review any affected routing or visibility assumptions.",
        resourceId: current.id,
        resourceType: input.resourceType,
        severity: "info",
        status: "Moved",
        summary: `${current.name} moved or changed order.`,
      });
    }

    if (JSON.stringify(prior.permissions) !== JSON.stringify(current.permissions)) {
      diffs.push({
        currentState: current,
        priorState: prior,
        recommendedAction: "Review permission impact before relying on automation.",
        resourceId: current.id,
        resourceType: input.resourceType,
        severity: "warning",
        status: "PermissionChanged",
        summary: `${current.name} permission metadata changed.`,
      });
    }

    if (metadataChanged(prior, current)) {
      diffs.push({
        currentState: current,
        priorState: prior,
        recommendedAction: "Review metadata update.",
        resourceId: current.id,
        resourceType: input.resourceType,
        severity: "info",
        status: "Updated",
        summary: `${current.name} metadata changed.`,
      });
    }
  }

  for (const prior of input.prior) {
    if (!currentById.has(prior.id)) {
      const affectedMappings = input.activeMappings.filter((mapping) => mapping.resourceId === prior.id);

      diffs.push({
        impactSummary: affectedMappings.length
          ? `${affectedMappings.length} active mapping${affectedMappings.length === 1 ? "" : "s"} still reference this missing resource.`
          : "No active mappings reference this missing resource.",
        priorState: prior,
        recommendedAction: affectedMappings.length
          ? "Keep mapping invalid until an administrator remaps or disables it."
          : "Review and archive or ignore if this deletion was expected.",
        resourceId: prior.id,
        resourceType: input.resourceType,
        severity: affectedMappings.length ? "danger" : "warning",
        status: affectedMappings.length ? "OrphanedMapping" : "Missing",
        summary: `${prior.name} is missing from Discord discovery.`,
      });
    }
  }

  return diffs;
}

export function buildDiscordDiscoveryDiffsForTest(input: {
  activeMappings?: Array<{ id: string; key?: string; resourceId: string; resourceType: string }>;
  current: Array<{
    id: string;
    metadata?: Record<string, unknown>;
    name: string;
    parentId?: string | null;
    permissions?: unknown;
    position?: number | null;
    type?: string;
  }>;
  prior: Array<{
    id: string;
    metadata?: Record<string, unknown>;
    name: string;
    parentId?: string | null;
    permissions?: unknown;
    position?: number | null;
    type?: string;
  }>;
  resourceType: string;
}) {
  return buildDiffs({
    activeMappings: input.activeMappings ?? [],
    current: input.current.map((resource) => ({
      metadata: resource.metadata ?? {},
      type: resource.type ?? input.resourceType,
      ...resource,
    })),
    prior: input.prior.map((resource) => ({
      metadata: resource.metadata ?? {},
      type: resource.type ?? input.resourceType,
      ...resource,
    })),
    resourceType: input.resourceType,
  });
}

async function safeFetch<T>(path: string, warnings: string[], rateLimits: unknown[]) {
  try {
    return await discordRestRequest<T>(path);
  } catch (error) {
    if (error instanceof DiscordRestError && error.rateLimitInfo) {
      rateLimits.push(error.rateLimitInfo);
    }

    warnings.push(error instanceof Error ? error.message : `Failed to fetch ${path}.`);
    return null;
  }
}

function shouldReconcile(status: DiffStatus) {
  return status !== "Unchanged" && status !== "Updated";
}

async function notifyCriticalDiscoveryFailure(input: {
  actorUserId: string | null;
  errorMessage: string;
  guildName: string;
}) {
  await createNotification({
    createdByUserId: input.actorUserId,
    message: input.errorMessage,
    metadata: {
      source: "discord.discovery",
    },
    title: `Discord discovery failed for ${input.guildName}`,
    type: "discord.delivery_failed",
    urgency: "warning",
  }).catch(() => undefined);
}

export async function runDiscordResourceDiscovery(input: {
  actorUserId: string;
  discordServerId: string;
  discoveryType?: DiscordDiscoveryType;
  dryRun?: boolean;
  resourceTypes?: DiscordDiscoveryResourceType[];
}) {
  const server = await prisma.discordServer.findUnique({
    where: {
      id: input.discordServerId,
    },
  });

  if (!server) {
    throw new Error("Discord guild not found.");
  }

  const discoveryType = input.dryRun ? "dry_run" : input.discoveryType ?? "full";
  const resourceTypes = input.resourceTypes?.length ? input.resourceTypes : DEFAULT_RESOURCE_TYPES;

  if (discoveryType === "full") {
    const activeFullSession = await prisma.discordDiscoverySession.findFirst({
      where: {
        discordServerId: server.id,
        discoveryType: "full",
        status: {
          in: ["queued", "running"],
        },
      },
    });

    if (activeFullSession) {
      throw new Error("A full discovery is already queued or running for this guild.");
    }
  }

  const session = await prisma.discordDiscoverySession.create({
    data: {
      correlationId: randomUUID(),
      discoveryType,
      discordServerId: server.id,
      dryRun: Boolean(input.dryRun),
      guildId: server.guildId,
      requestedByUserId: input.actorUserId,
      resourceTypes,
      status: "running",
      startedAt: new Date(),
    },
  });

  await recordAuditEvent({
    action: "discord.discovery.started",
    actorUserId: input.actorUserId,
    entityId: session.id,
    entityType: "DiscordDiscoverySession",
    metadata: {
      discoveryType,
      dryRun: Boolean(input.dryRun),
      guildId: server.guildId,
      resourceTypes,
    },
    summary: `${server.name} Discord discovery started.`,
  });

  const warnings: string[] = [];
  const errors: string[] = [];
  const rateLimits: unknown[] = [];

  try {
    const [guild, channels, roles, events, emojis, stickers] = await Promise.all([
      resourceTypes.includes("guild")
        ? safeFetch<DiscordApiGuild>(`/guilds/${server.guildId}?with_counts=true`, warnings, rateLimits)
        : Promise.resolve(null),
      resourceTypes.includes("channels")
        ? safeFetch<DiscordApiChannel[]>(`/guilds/${server.guildId}/channels`, warnings, rateLimits)
        : Promise.resolve(null),
      resourceTypes.includes("roles")
        ? safeFetch<DiscordApiRole[]>(`/guilds/${server.guildId}/roles`, warnings, rateLimits)
        : Promise.resolve(null),
      resourceTypes.includes("events")
        ? safeFetch<DiscordApiScheduledEvent[]>(`/guilds/${server.guildId}/scheduled-events`, warnings, rateLimits)
        : Promise.resolve(null),
      resourceTypes.includes("emojis")
        ? safeFetch<DiscordApiEmoji[]>(`/guilds/${server.guildId}/emojis`, warnings, rateLimits)
        : Promise.resolve(null),
      resourceTypes.includes("stickers")
        ? safeFetch<DiscordApiSticker[]>(`/guilds/${server.guildId}/stickers`, warnings, rateLimits)
        : Promise.resolve(null),
    ]);
    const now = new Date();
    const normalized = {
      channels: channels ? normalizeChannels(channels) : [],
      emojis: emojis ? normalizeEmojis(emojis) : [],
      events: events ? normalizeEvents(events) : [],
      roles: roles ? normalizeRoles(roles) : [],
      stickers: stickers ? normalizeStickers(stickers) : [],
    };
    const [
      existingChannels,
      existingRoles,
      existingEvents,
      existingEmojis,
      existingStickers,
      channelMappings,
      roleMappings,
    ] = await Promise.all([
      prisma.discordGuildChannel.findMany({ where: { discordServerId: server.id } }),
      prisma.discordGuildRole.findMany({ where: { discordServerId: server.id } }),
      prisma.discordGuildScheduledEvent.findMany({ where: { discordServerId: server.id } }),
      prisma.discordGuildEmoji.findMany({ where: { discordServerId: server.id } }),
      prisma.discordGuildSticker.findMany({ where: { discordServerId: server.id } }),
      prisma.discordChannelMapping.findMany({ where: { discordServerId: server.id, isActive: true } }),
      prisma.discordRoleMapping.findMany({ where: { discordServerId: server.id, isActive: true } }),
    ]);
    const prior = {
      channels: existingChannels.map((channel) => ({
        id: channel.channelId,
        metadata: { nsfw: channel.nsfw, permissionOverwrites: channel.permissionSnapshot },
        name: channel.name,
        parentId: channel.parentChannelId,
        permissions: channel.permissionSnapshot,
        position: channel.position,
        type: channel.channelType,
      })),
      emojis: existingEmojis.map((emoji) => ({
        id: emoji.emojiId,
        metadata: { animated: emoji.animated, available: emoji.available, managed: emoji.managed },
        name: emoji.name,
        type: "emoji",
      })),
      events: existingEvents.map((event) => ({
        id: event.eventId,
        metadata: {
          channelId: event.channelId,
          entityType: event.entityType,
          scheduledEndAt: event.scheduledEndAt?.toISOString() ?? null,
          scheduledStartAt: event.scheduledStartAt?.toISOString() ?? null,
          status: event.status,
        },
        name: event.name,
        parentId: event.channelId,
        type: event.entityType,
      })),
      roles: existingRoles.map((role) => ({
        id: role.roleId,
        metadata: {
          botManageable: role.botManageable,
          color: role.color,
          hoisted: role.hoisted,
          managed: role.managed,
          mentionable: role.mentionable,
          permissions: role.permissionSnapshot,
        },
        name: role.name,
        permissions: role.permissionSnapshot,
        position: role.position,
        type: "role",
      })),
      stickers: existingStickers.map((sticker) => ({
        id: sticker.stickerId,
        metadata: {
          available: sticker.available,
          description: sticker.description,
          formatType: sticker.formatType,
          tags: sticker.tags,
        },
        name: sticker.name,
        type: sticker.formatType,
      })),
    };
    const diffs = [
      ...buildDiffs({
        activeMappings: channelMappings.map((mapping) => ({
          id: mapping.id,
          key: mapping.key,
          resourceId: mapping.channelId,
          resourceType: "channel",
        })),
        current: normalized.channels,
        prior: prior.channels,
        resourceType: "channel",
      }),
      ...buildDiffs({
        activeMappings: roleMappings.map((mapping) => ({
          id: mapping.id,
          key: mapping.mappingType,
          resourceId: mapping.discordRoleId,
          resourceType: "role",
        })),
        current: normalized.roles,
        prior: prior.roles,
        resourceType: "role",
      }),
      ...buildDiffs({ activeMappings: [], current: normalized.events, prior: prior.events, resourceType: "event" }),
      ...buildDiffs({ activeMappings: [], current: normalized.emojis, prior: prior.emojis, resourceType: "emoji" }),
      ...buildDiffs({ activeMappings: [], current: normalized.stickers, prior: prior.stickers, resourceType: "sticker" }),
    ];

    const result = await prisma.$transaction(async (transaction) => {
      const snapshot = await transaction.discordResourceSnapshot.create({
        data: {
          discordServerId: server.id,
          discoverySessionId: session.id,
          guildId: server.guildId,
          resourceCount:
            normalized.channels.length +
            normalized.roles.length +
            normalized.events.length +
            normalized.emojis.length +
            normalized.stickers.length,
          resourceType: "mixed",
          snapshot: normalized as Prisma.InputJsonValue,
          snapshotType: input.dryRun ? "dry_run" : "discovery",
        },
      });

      if (!input.dryRun) {
        if (guild) {
          await transaction.discordServer.update({
            data: {
              iconUrl: buildDiscordIconUrl(guild.id, guild.icon),
              lastDiscoveryAt: now,
              lastSyncAt: now,
              locale: guild.preferred_locale ?? server.locale,
              name: guild.name,
              ownerUserId: guild.owner_id ?? server.ownerUserId,
              restStatus: "ok",
              status: server.status === "archived" ? server.status : "active",
            },
            where: { id: server.id },
          });
        }

        await Promise.all(
          normalized.channels.map((channel) =>
            transaction.discordGuildChannel.upsert({
              create: {
                channelId: channel.id,
                channelType: channel.type,
                discordServerId: server.id,
                guildId: server.guildId,
                isMissing: false,
                lastSeenAt: now,
                name: channel.name,
                nsfw: Boolean(channel.metadata.nsfw),
                parentChannelId: channel.parentId ?? null,
                permissionSnapshot: channel.permissions as Prisma.InputJsonValue,
                position: channel.position ?? null,
              },
              update: {
                channelType: channel.type,
                isArchived: false,
                isMissing: false,
                lastSeenAt: now,
                lastSyncedAt: now,
                name: channel.name,
                nsfw: Boolean(channel.metadata.nsfw),
                parentChannelId: channel.parentId ?? null,
                permissionSnapshot: channel.permissions as Prisma.InputJsonValue,
                position: channel.position ?? null,
              },
              where: {
                discordServerId_channelId: {
                  channelId: channel.id,
                  discordServerId: server.id,
                },
              },
            }),
          ),
        );

        await Promise.all(
          normalized.roles.map((role) =>
            transaction.discordGuildRole.upsert({
              create: {
                botManageable: Boolean(role.metadata.botManageable),
                color: typeof role.metadata.color === "number" ? role.metadata.color : null,
                discordServerId: server.id,
                guildId: server.guildId,
                hoisted: Boolean(role.metadata.hoisted),
                isMissing: false,
                lastSeenAt: now,
                managed: Boolean(role.metadata.managed),
                mentionable: Boolean(role.metadata.mentionable),
                name: role.name,
                permissionSnapshot: role.permissions as Prisma.InputJsonValue,
                position: role.position ?? null,
                roleId: role.id,
              },
              update: {
                botManageable: Boolean(role.metadata.botManageable),
                color: typeof role.metadata.color === "number" ? role.metadata.color : null,
                hoisted: Boolean(role.metadata.hoisted),
                isArchived: false,
                isMissing: false,
                lastSeenAt: now,
                lastSyncedAt: now,
                managed: Boolean(role.metadata.managed),
                mentionable: Boolean(role.metadata.mentionable),
                name: role.name,
                permissionSnapshot: role.permissions as Prisma.InputJsonValue,
                position: role.position ?? null,
              },
              where: {
                discordServerId_roleId: {
                  discordServerId: server.id,
                  roleId: role.id,
                },
              },
            }),
          ),
        );

        await Promise.all(
          normalized.events.map((event) =>
            transaction.discordGuildScheduledEvent.upsert({
              create: {
                channelId: typeof event.metadata.channelId === "string" ? event.metadata.channelId : null,
                creatorId: typeof event.metadata.creatorId === "string" ? event.metadata.creatorId : null,
                description: typeof event.metadata.description === "string" ? event.metadata.description : null,
                discordServerId: server.id,
                entityType: typeof event.metadata.entityType === "string" ? event.metadata.entityType : event.type,
                eventId: event.id,
                guildId: server.guildId,
                isMissing: false,
                lastSeenAt: now,
                name: event.name,
                scheduledEndAt: typeof event.metadata.scheduledEndAt === "string" ? parseDate(event.metadata.scheduledEndAt) : null,
                scheduledStartAt: typeof event.metadata.scheduledStartAt === "string" ? parseDate(event.metadata.scheduledStartAt) : null,
                status: typeof event.metadata.status === "string" ? event.metadata.status : "unknown",
              },
              update: {
                channelId: typeof event.metadata.channelId === "string" ? event.metadata.channelId : null,
                description: typeof event.metadata.description === "string" ? event.metadata.description : null,
                entityType: typeof event.metadata.entityType === "string" ? event.metadata.entityType : event.type,
                isArchived: false,
                isMissing: false,
                lastSeenAt: now,
                lastSyncedAt: now,
                name: event.name,
                scheduledEndAt: typeof event.metadata.scheduledEndAt === "string" ? parseDate(event.metadata.scheduledEndAt) : null,
                scheduledStartAt: typeof event.metadata.scheduledStartAt === "string" ? parseDate(event.metadata.scheduledStartAt) : null,
                status: typeof event.metadata.status === "string" ? event.metadata.status : "unknown",
              },
              where: {
                discordServerId_eventId: {
                  discordServerId: server.id,
                  eventId: event.id,
                },
              },
            }),
          ),
        );

        await Promise.all(
          normalized.emojis.map((emoji) =>
            transaction.discordGuildEmoji.upsert({
              create: {
                animated: Boolean(emoji.metadata.animated),
                available: emoji.metadata.available !== false,
                discordServerId: server.id,
                emojiId: emoji.id,
                guildId: server.guildId,
                isMissing: false,
                lastSeenAt: now,
                managed: Boolean(emoji.metadata.managed),
                name: emoji.name,
              },
              update: {
                animated: Boolean(emoji.metadata.animated),
                available: emoji.metadata.available !== false,
                isArchived: false,
                isMissing: false,
                lastSeenAt: now,
                lastSyncedAt: now,
                managed: Boolean(emoji.metadata.managed),
                name: emoji.name,
              },
              where: {
                discordServerId_emojiId: {
                  discordServerId: server.id,
                  emojiId: emoji.id,
                },
              },
            }),
          ),
        );

        await Promise.all(
          normalized.stickers.map((sticker) =>
            transaction.discordGuildSticker.upsert({
              create: {
                available: sticker.metadata.available !== false,
                description: typeof sticker.metadata.description === "string" ? sticker.metadata.description : null,
                discordServerId: server.id,
                formatType: typeof sticker.metadata.formatType === "string" ? sticker.metadata.formatType : sticker.type,
                guildId: server.guildId,
                isMissing: false,
                lastSeenAt: now,
                name: sticker.name,
                stickerId: sticker.id,
                tags: typeof sticker.metadata.tags === "string" ? sticker.metadata.tags : null,
              },
              update: {
                available: sticker.metadata.available !== false,
                description: typeof sticker.metadata.description === "string" ? sticker.metadata.description : null,
                formatType: typeof sticker.metadata.formatType === "string" ? sticker.metadata.formatType : sticker.type,
                isArchived: false,
                isMissing: false,
                lastSeenAt: now,
                lastSyncedAt: now,
                name: sticker.name,
                tags: typeof sticker.metadata.tags === "string" ? sticker.metadata.tags : null,
              },
              where: {
                discordServerId_stickerId: {
                  discordServerId: server.id,
                  stickerId: sticker.id,
                },
              },
            }),
          ),
        );

        if (resourceTypes.includes("channels")) {
          await transaction.discordGuildChannel.updateMany({
            data: { isMissing: true },
            where: {
              channelId: { notIn: normalized.channels.map((channel) => channel.id) },
              discordServerId: server.id,
            },
          });
        }

        if (resourceTypes.includes("roles")) {
          await transaction.discordGuildRole.updateMany({
            data: { isMissing: true },
            where: {
              discordServerId: server.id,
              roleId: { notIn: normalized.roles.map((role) => role.id) },
            },
          });
        }
      }

      await Promise.all(
        diffs
          .filter((diff) => diff.status !== "Unchanged")
          .map((diff) =>
            transaction.discordResourceChange.create({
              data: {
                affectedMappings: diff.impactSummary ? { summary: diff.impactSummary } : undefined,
                changeSummary: diff.summary,
                currentState: diff.currentState as Prisma.InputJsonValue,
                discoverySessionId: session.id,
                discordServerId: server.id,
                guildId: server.guildId,
                impactSummary: diff.impactSummary ?? null,
                priorState: diff.priorState as Prisma.InputJsonValue,
                recommendedAction: diff.recommendedAction ?? null,
                resourceId: diff.resourceId,
                resourceType: diff.resourceType,
                severity: diff.severity,
                status: diff.status,
              },
            }),
          ),
      );

      await Promise.all(
        diffs
          .filter((diff) => shouldReconcile(diff.status))
          .map((diff) =>
            transaction.discordReconciliationItem.create({
              data: {
                affectedMappings: diff.impactSummary ? { summary: diff.impactSummary } : undefined,
                changeStatus: diff.status,
                discoverySessionId: session.id,
                discordServerId: server.id,
                guildId: server.guildId,
                recommendedAction: diff.recommendedAction ?? "Review resource change.",
                resourceId: diff.resourceId,
                resourceType: diff.resourceType,
                severity: diff.severity,
                summary: diff.impactSummary ?? diff.summary,
                title: diff.summary,
              },
            }),
          ),
      );

      const resourcesFetched =
        normalized.channels.length +
        normalized.roles.length +
        normalized.events.length +
        normalized.emojis.length +
        normalized.stickers.length +
        (guild ? 1 : 0);
      const resourcesCreated = diffs.filter((diff) => diff.status === "Added").length;
      const resourcesMissing = diffs.filter((diff) => diff.status === "Missing" || diff.status === "OrphanedMapping").length;
      const resourcesUpdated = diffs.filter((diff) =>
        ["Updated", "Renamed", "Moved", "PermissionChanged"].includes(diff.status),
      ).length;

      await transaction.discordDiscoverySession.update({
        data: {
          completedAt: new Date(),
          errors,
          rateLimitInfo: rateLimits as Prisma.InputJsonValue,
          resourcesCreated,
          resourcesFetched,
          resourcesMissing,
          resourcesRestored: diffs.filter((diff) => diff.status === "Restored").length,
          resourcesUpdated,
          snapshotId: snapshot.id,
          status: warnings.length ? "completed_with_warnings" : "completed",
          warnings,
        },
        where: { id: session.id },
      });

      await transaction.discordGuildDiscoverySnapshot.create({
        data: {
          discordServerId: server.id,
          discoveredChannels: normalized.channels.length,
          discoveredEmoji: normalized.emojis.length,
          discoveredEvents: normalized.events.length,
          discoveredRoles: normalized.roles.length,
          discoveredStickers: normalized.stickers.length,
          errorMessage: warnings[0] ?? null,
          guildId: server.guildId,
          snapshot: {
            discoverySessionId: session.id,
            snapshotId: snapshot.id,
          },
          status: warnings.length ? "completed_with_warnings" : "completed",
        },
      });

      return {
        resourcesCreated,
        resourcesFetched,
        resourcesMissing,
        resourcesUpdated,
        snapshotId: snapshot.id,
      };
    });

    await recordAuditEvent({
      action: warnings.length ? "discord.discovery.completed_with_warnings" : "discord.discovery.completed",
      actorUserId: input.actorUserId,
      entityId: session.id,
      entityType: "DiscordDiscoverySession",
      metadata: result,
      summary: `${server.name} Discord discovery completed.`,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Discord discovery failed.";

    await prisma.discordDiscoverySession.update({
      data: {
        errors: [errorMessage],
        failedAt: new Date(),
        status: "failed",
      },
      where: { id: session.id },
    });
    await notifyCriticalDiscoveryFailure({
      actorUserId: input.actorUserId,
      errorMessage,
      guildName: server.name,
    });
    await recordAuditEvent({
      action: "discord.discovery.failed",
      actorUserId: input.actorUserId,
      entityId: session.id,
      entityType: "DiscordDiscoverySession",
      metadata: { errorMessage },
      summary: `${server.name} Discord discovery failed.`,
    });

    throw error;
  }
}

export async function listDiscordDiscoveryOperations() {
  const [sessions, reconciliationItems, schedules] = await Promise.all([
    prisma.discordDiscoverySession.findMany({
      include: {
        discordServer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.discordReconciliationItem.findMany({
      include: {
        discordServer: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.discordSyncSchedule.findMany({
      include: {
        discordServer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { reconciliationItems, schedules, sessions };
}
