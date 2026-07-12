import { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/client";
import { recordDiscordScheduledEventObservation } from "@/server/discord/event-management/reconciliation";
import { mapDiscordChannelType } from "@/server/discord/platform";
import type { DiscordGatewayEventEnvelope } from "@/server/discord/gateway/types";

type GatewayChannelPayload = {
  guild_id?: string | null;
  id?: string;
  name?: string;
  nsfw?: boolean;
  parent_id?: string | null;
  permission_overwrites?: unknown[];
  position?: number;
  type?: number;
};

type GatewayRolePayload = {
  guild_id?: string | null;
  role?: {
    color?: number;
    hoist?: boolean;
    id?: string;
    managed?: boolean;
    mentionable?: boolean;
    name?: string;
    permissions?: string;
    position?: number;
  };
};

type GatewayScheduledEventPayload = {
  channel_id?: string | null;
  creator_id?: string | null;
  description?: string | null;
  entity_type?: number;
  guild_id?: string | null;
  id?: string;
  image?: string | null;
  name?: string;
  scheduled_end_time?: string | null;
  scheduled_start_time?: string | null;
  status?: number;
};

async function getManagedServer(guildId?: string | null) {
  if (!guildId) {
    return null;
  }

  return prisma.discordServer.findUnique({
    where: {
      guildId,
    },
  });
}

function parseDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function mapScheduledEventStatus(value?: number) {
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
      return "unknown";
  }
}

function mapScheduledEventType(value?: number) {
  switch (value) {
    case 1:
      return "stage_instance";
    case 2:
      return "voice";
    case 3:
      return "external";
    default:
      return "unknown";
  }
}

async function createReconciliationItem(input: {
  affectedMappings?: Prisma.InputJsonValue;
  guildId: string;
  discordServerId: string;
  recommendedAction: string;
  resourceId: string;
  resourceType: string;
  severity: "info" | "warning" | "danger";
  summary: string;
  title: string;
}) {
  return prisma.discordReconciliationItem.create({
    data: {
      affectedMappings: input.affectedMappings,
      affectedModules: undefined,
      changeStatus: "GatewayObserved",
      discordServerId: input.discordServerId,
      guildId: input.guildId,
      recommendedAction: input.recommendedAction,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      severity: input.severity,
      summary: input.summary,
      title: input.title,
    },
  });
}

export async function handleGatewayGuildCreateOrUpdate(event: DiscordGatewayEventEnvelope) {
  const payload = event.payload as { id?: string; name?: string; unavailable?: boolean };
  const guildId = payload.id ?? event.guildId;
  const server = await getManagedServer(guildId);

  if (!server) {
    return null;
  }

  return prisma.discordServer.update({
    data: {
      lastSyncAt: event.receivedAt,
      name: payload.name ?? server.name,
      status: payload.unavailable ? "unavailable" : "active",
    },
    where: {
      id: server.id,
    },
  });
}

export async function handleGatewayGuildDelete(event: DiscordGatewayEventEnvelope) {
  const guildId = event.guildId ?? (event.payload as { id?: string }).id;
  const server = await getManagedServer(guildId);

  if (!server) {
    return null;
  }

  await prisma.discordServer.update({
    data: {
      status: "unavailable",
    },
    where: {
      id: server.id,
    },
  });

  return createReconciliationItem({
    discordServerId: server.id,
    guildId: server.guildId,
    recommendedAction: "Verify whether the bot was removed or Discord marked the guild unavailable. Preserve configuration until staff confirms.",
    resourceId: server.guildId,
    resourceType: "guild",
    severity: server.isPrimary ? "danger" : "warning",
    summary: `${server.name} became unavailable to the Gateway.`,
    title: "Managed Discord guild unavailable",
  });
}

export async function handleGatewayChannelCreateOrUpdate(event: DiscordGatewayEventEnvelope) {
  const payload = event.payload as GatewayChannelPayload;
  const guildId = payload.guild_id ?? event.guildId;
  const channelId = payload.id;
  const server = await getManagedServer(guildId);

  if (!server || !channelId) {
    return null;
  }

  return prisma.discordGuildChannel.upsert({
    create: {
      channelId,
      channelType: mapDiscordChannelType(payload.type ?? 0),
      discordServerId: server.id,
      guildId: server.guildId,
      isMissing: false,
      lastSeenAt: event.receivedAt,
      lastSyncedAt: event.receivedAt,
      name: payload.name ?? `Channel ${channelId}`,
      nsfw: payload.nsfw ?? false,
      parentChannelId: payload.parent_id ?? null,
      permissionSnapshot: (payload.permission_overwrites ?? []) as Prisma.InputJsonValue,
      position: payload.position ?? null,
    },
    update: {
      channelType: mapDiscordChannelType(payload.type ?? 0),
      isArchived: false,
      isMissing: false,
      lastSeenAt: event.receivedAt,
      lastSyncedAt: event.receivedAt,
      name: payload.name ?? `Channel ${channelId}`,
      nsfw: payload.nsfw ?? false,
      parentChannelId: payload.parent_id ?? null,
      permissionSnapshot: (payload.permission_overwrites ?? []) as Prisma.InputJsonValue,
      position: payload.position ?? null,
    },
    where: {
      discordServerId_channelId: {
        channelId,
        discordServerId: server.id,
      },
    },
  });
}

export async function handleGatewayChannelDelete(event: DiscordGatewayEventEnvelope) {
  const payload = event.payload as GatewayChannelPayload;
  const guildId = payload.guild_id ?? event.guildId;
  const channelId = payload.id;
  const server = await getManagedServer(guildId);

  if (!server || !channelId) {
    return null;
  }

  const affectedMappings = await prisma.discordChannelMapping.findMany({
    where: {
      channelId,
      discordServerId: server.id,
      isActive: true,
    },
    select: {
      id: true,
      key: true,
    },
  });

  await prisma.discordGuildChannel.updateMany({
    data: {
      isMissing: true,
      lastSyncedAt: event.receivedAt,
    },
    where: {
      channelId,
      discordServerId: server.id,
    },
  });

  if (affectedMappings.length === 0) {
    return null;
  }

  return createReconciliationItem({
    affectedMappings: affectedMappings as Prisma.InputJsonValue,
    discordServerId: server.id,
    guildId: server.guildId,
    recommendedAction: "Remap or disable affected communication-domain channel mappings. Do not guess replacement by name.",
    resourceId: channelId,
    resourceType: "channel",
    severity: "danger",
    summary: `${affectedMappings.length} active channel mapping(s) reference a deleted Discord channel.`,
    title: "Mapped Discord channel deleted",
  });
}

export async function handleGatewayRoleCreateOrUpdate(event: DiscordGatewayEventEnvelope) {
  const payload = event.payload as GatewayRolePayload;
  const role = payload.role;
  const guildId = payload.guild_id ?? event.guildId;
  const server = await getManagedServer(guildId);

  if (!server || !role?.id) {
    return null;
  }

  return prisma.discordGuildRole.upsert({
    create: {
      botManageable: false,
      color: role.color ?? null,
      discordServerId: server.id,
      guildId: server.guildId,
      hoisted: role.hoist ?? false,
      isMissing: false,
      lastSeenAt: event.receivedAt,
      lastSyncedAt: event.receivedAt,
      managed: role.managed ?? false,
      mentionable: role.mentionable ?? false,
      name: role.name ?? `Role ${role.id}`,
      permissionSnapshot: role.permissions ? { permissions: role.permissions } : undefined,
      position: role.position ?? null,
      roleId: role.id,
    },
    update: {
      color: role.color ?? null,
      hoisted: role.hoist ?? false,
      isArchived: false,
      isMissing: false,
      lastSeenAt: event.receivedAt,
      lastSyncedAt: event.receivedAt,
      managed: role.managed ?? false,
      mentionable: role.mentionable ?? false,
      name: role.name ?? `Role ${role.id}`,
      permissionSnapshot: role.permissions ? { permissions: role.permissions } : undefined,
      position: role.position ?? null,
    },
    where: {
      discordServerId_roleId: {
        discordServerId: server.id,
        roleId: role.id,
      },
    },
  });
}

export async function handleGatewayRoleDelete(event: DiscordGatewayEventEnvelope) {
  const payload = event.payload as { guild_id?: string | null; role_id?: string };
  const guildId = payload.guild_id ?? event.guildId;
  const roleId = payload.role_id;
  const server = await getManagedServer(guildId);

  if (!server || !roleId) {
    return null;
  }

  const affectedMappings = await prisma.discordRoleMapping.findMany({
    where: {
      discordRoleId: roleId,
      discordServerId: server.id,
      isActive: true,
    },
    select: {
      id: true,
      mappingType: true,
    },
  });

  await prisma.discordGuildRole.updateMany({
    data: {
      isMissing: true,
      lastSyncedAt: event.receivedAt,
    },
    where: {
      discordServerId: server.id,
      roleId,
    },
  });

  if (affectedMappings.length === 0) {
    return null;
  }

  return createReconciliationItem({
    affectedMappings: affectedMappings as Prisma.InputJsonValue,
    discordServerId: server.id,
    guildId: server.guildId,
    recommendedAction: "Review role automation mappings and remap by Discord role ID if a replacement is approved.",
    resourceId: roleId,
    resourceType: "role",
    severity: "danger",
    summary: `${affectedMappings.length} active role mapping(s) reference a deleted Discord role.`,
    title: "Mapped Discord role deleted",
  });
}

export async function handleGatewayScheduledEventCreateOrUpdate(event: DiscordGatewayEventEnvelope) {
  const payload = event.payload as GatewayScheduledEventPayload;
  const guildId = payload.guild_id ?? event.guildId;
  const server = await getManagedServer(guildId);

  if (!server || !payload.id) {
    return null;
  }

  const observed = await prisma.discordGuildScheduledEvent.upsert({
    create: {
      channelId: payload.channel_id ?? null,
      creatorId: payload.creator_id ?? null,
      description: payload.description ?? null,
      discordServerId: server.id,
      entityType: mapScheduledEventType(payload.entity_type),
      eventId: payload.id,
      guildId: server.guildId,
      isMissing: false,
      lastSeenAt: event.receivedAt,
      lastSyncedAt: event.receivedAt,
      name: payload.name ?? `Scheduled Event ${payload.id}`,
      scheduledEndAt: parseDate(payload.scheduled_end_time),
      scheduledStartAt: parseDate(payload.scheduled_start_time),
      status: mapScheduledEventStatus(payload.status),
    },
    update: {
      channelId: payload.channel_id ?? null,
      description: payload.description ?? null,
      entityType: mapScheduledEventType(payload.entity_type),
      isArchived: false,
      isMissing: false,
      lastSeenAt: event.receivedAt,
      lastSyncedAt: event.receivedAt,
      name: payload.name ?? `Scheduled Event ${payload.id}`,
      scheduledEndAt: parseDate(payload.scheduled_end_time),
      scheduledStartAt: parseDate(payload.scheduled_start_time),
      status: mapScheduledEventStatus(payload.status),
    },
    where: {
      discordServerId_eventId: {
        discordServerId: server.id,
        eventId: payload.id,
      },
    },
  });

  await recordDiscordScheduledEventObservation({
    discordScheduledEventId: observed.eventId,
    discordServerId: server.id,
    guildId: server.guildId,
    observedState: {
      channelId: observed.channelId,
      description: observed.description,
      entityType: observed.entityType,
      name: observed.name,
      scheduledEndAt: observed.scheduledEndAt?.toISOString() ?? null,
      scheduledStartAt: observed.scheduledStartAt?.toISOString() ?? null,
      status: observed.status,
    },
  });

  return observed;
}

export async function handleGatewayScheduledEventDelete(event: DiscordGatewayEventEnvelope) {
  const payload = event.payload as GatewayScheduledEventPayload;
  const guildId = payload.guild_id ?? event.guildId;
  const server = await getManagedServer(guildId);

  if (!server || !payload.id) {
    return null;
  }

  const updateResult = await prisma.discordGuildScheduledEvent.updateMany({
    data: {
      isMissing: true,
      lastSyncedAt: event.receivedAt,
      status: "deleted",
    },
    where: {
      discordServerId: server.id,
      eventId: payload.id,
    },
  });

  const link = await prisma.discordEventLink.findFirst({
    where: {
      archivedAt: null,
      discordScheduledEventId: payload.id,
      discordServerId: server.id,
    },
  });

  if (link) {
    await prisma.discordEventLink.update({
      data: {
        currentDiscordStatus: "deleted",
        driftState: "discord_missing",
        lastObservedDiscordUpdate: event.receivedAt,
      },
      where: {
        id: link.id,
      },
    });

    await prisma.discordEventDrift.create({
      data: {
        desiredState: link.desiredPortalState ?? undefined,
        discordEventLinkId: link.id,
        discordServerId: server.id,
        driftType: "discord_event_deleted",
        guildId: server.guildId,
        observedState: {
          deletedAt: event.receivedAt.toISOString(),
          discordScheduledEventId: payload.id,
        },
        severity: "danger",
        summary: "Linked Discord Scheduled Event was deleted or became unavailable.",
      },
    });
  }

  return updateResult;
}
