import { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/client";
import { getDiscordIntegrationConfig } from "@/server/discord/config";
import { discordRestRequest } from "@/server/discord/client/rest";
import { recordAuditEvent } from "@/server/services/audit-log-service";

type DiscordApiGuild = {
  approximate_member_count?: number;
  description?: string | null;
  icon?: string | null;
  id: string;
  name: string;
  owner_id?: string | null;
  preferred_locale?: string | null;
};

type DiscordApiChannel = {
  id: string;
  name?: string;
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
};

type DiscoveryImportResult = {
  channelsImported: number;
  rolesImported: number;
  snapshotId: string;
};

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function buildDiscordIconUrl(guildId: string, iconHash?: string | null) {
  return iconHash ? `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png` : null;
}

export function mapDiscordChannelType(type: number) {
  switch (type) {
    case 0:
      return "text";
    case 2:
      return "voice";
    case 4:
      return "category";
    case 5:
      return "announcement";
    case 10:
    case 11:
    case 12:
      return "thread";
    case 13:
      return "stage";
    case 15:
      return "forum";
    default:
      return `unknown_${type}`;
  }
}

function getDefaultGuildConfiguration(): {
  applicationConfig: Prisma.InputJsonValue;
  automationConfig: Prisma.InputJsonValue;
  channelConfig: Prisma.InputJsonValue;
  communicationConfig: Prisma.InputJsonValue;
  diagnosticsConfig: Prisma.InputJsonValue;
  eventConfig: Prisma.InputJsonValue;
  featureFlags: Prisma.InputJsonValue;
  gatewayConfig: Prisma.InputJsonValue;
  generalConfig: Prisma.InputJsonValue;
  moderationConfig: Prisma.InputJsonValue;
  qualificationConfig: Prisma.InputJsonValue;
  roleConfig: Prisma.InputJsonValue;
  synchronizationConfig: Prisma.InputJsonValue;
} {
  return {
    applicationConfig: { enabled: false, routingMode: "future_architecture" },
    automationConfig: { enabled: false, ruleEngine: "future_architecture" },
    channelConfig: { allowAutomaticMapping: false, discoverChannels: true },
    communicationConfig: { enabled: true, routingMode: "explicit_mappings_only" },
    diagnosticsConfig: { enabled: true, exposeSecrets: false },
    eventConfig: { enabled: true, routingMode: "explicit_mappings_only" },
    featureFlags: {
      applications: false,
      automation: false,
      communications: true,
      diagnostics: true,
      events: true,
      gateway: true,
      memberSync: true,
      moderation: false,
      qualifications: true,
      roleSync: true,
    },
    gatewayConfig: { optional: true, status: "never_connected" },
    generalConfig: { portalIsSourceOfTruth: true },
    moderationConfig: { enabled: false },
    qualificationConfig: { enabled: true, roleSyncRequiresExplicitMapping: true },
    roleConfig: { allowUnmappedRoleModification: false, discoverRoles: true },
    synchronizationConfig: {
      conflictWinner: "portal",
      incrementalPreferred: true,
      overwriteAdminConfig: false,
    },
  };
}

export async function ensureDiscordGuildConfiguration(discordServerId: string) {
  return prisma.discordGuildConfiguration.upsert({
    create: {
      discordServerId,
      ...getDefaultGuildConfiguration(),
    },
    update: {},
    where: {
      discordServerId,
    },
  });
}

export async function ensurePrimaryCommunityGuild(input: {
  actorUserId?: string | null;
  guildId?: string | null;
}) {
  const config = getDiscordIntegrationConfig();
  const guildId =
    normalizeOptionalString(input.guildId) ??
    normalizeOptionalString(config.devGuildId) ??
    normalizeOptionalString(config.legacyGuildId) ??
    normalizeOptionalString(config.applicationId);

  if (!guildId) {
    throw new Error("A Discord guild ID is required before the primary community guild can be bootstrapped.");
  }

  const server = await prisma.$transaction(async (transaction) => {
    await transaction.discordServer.updateMany({
      data: {
        isPrimary: false,
      },
      where: {
        guildId: {
          not: guildId,
        },
      },
    });

    const existing = await transaction.discordServer.findUnique({
      where: {
        guildId,
      },
    });

    const updated = existing
      ? await transaction.discordServer.update({
          data: {
            guildType: existing.guildType || "community",
            isActive: true,
            isPrimary: true,
            status: "active",
          },
          where: {
            id: existing.id,
          },
        })
      : await transaction.discordServer.create({
          data: {
            gatewayEnabled: true,
            guildId,
            guildType: "community",
            isActive: true,
            isPrimary: true,
            memberSyncPolicy: "primary_create_secondary_link",
            name: "Primary Community Discord",
            roleSyncPolicy: "manual",
            status: "active",
          },
        });

    await transaction.discordGuildConfiguration.upsert({
      create: {
        discordServerId: updated.id,
        ...getDefaultGuildConfiguration(),
      },
      update: {},
      where: {
        discordServerId: updated.id,
      },
    });

    return updated;
  });

  await recordAuditEvent({
    action: "discord.guild.primary_bootstrapped",
    actorUserId: input.actorUserId ?? null,
    entityId: server.id,
    entityType: "DiscordServer",
    metadata: {
      guildId,
    },
    summary: `${server.name} is configured as the primary community Discord guild.`,
  });

  return server;
}

export async function discoverAvailableDiscordGuilds(input: {
  actorUserId: string;
}) {
  const config = getDiscordIntegrationConfig();
  const knownGuildIds = Array.from(
    new Set(
      [config.devGuildId, config.legacyGuildId].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );
  const discovered: DiscordApiGuild[] = [];
  const errors: string[] = [];

  for (const guildId of knownGuildIds) {
    try {
      discovered.push(await discordRestRequest<DiscordApiGuild>(`/guilds/${guildId}?with_counts=true`));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Failed to discover guild ${guildId}.`);
    }
  }

  const snapshot = await prisma.discordGuildDiscoverySnapshot.create({
    data: {
      discoveredGuilds: discovered.length,
      errorMessage: errors[0] ?? null,
      snapshot: {
        discovered: discovered.map((guild) => ({
          id: guild.id,
          name: guild.name,
          preferredLocale: guild.preferred_locale ?? null,
        })),
        errors,
        source: "configured_guild_ids",
      },
      status: errors.length > 0 && discovered.length === 0 ? "failed" : "completed",
    },
  });

  await recordAuditEvent({
    action: "discord.guild.discovery.requested",
    actorUserId: input.actorUserId,
    entityId: snapshot.id,
    entityType: "DiscordGuildDiscoverySnapshot",
    metadata: {
      discoveredGuilds: discovered.length,
      errors: errors.length,
    },
    summary: `Discord guild discovery completed with ${discovered.length} configured guild${discovered.length === 1 ? "" : "s"}.`,
  });

  return {
    discovered,
    errors,
    snapshotId: snapshot.id,
  };
}

export async function importDiscordGuildInventory(input: {
  actorUserId: string;
  discordServerId: string;
}) : Promise<DiscoveryImportResult> {
  const server = await prisma.discordServer.findUnique({
    where: {
      id: input.discordServerId,
    },
  });

  if (!server) {
    throw new Error("Discord guild not found.");
  }

  const [guild, channels, roles] = await Promise.all([
    discordRestRequest<DiscordApiGuild>(`/guilds/${server.guildId}?with_counts=true`),
    discordRestRequest<DiscordApiChannel[]>(`/guilds/${server.guildId}/channels`),
    discordRestRequest<DiscordApiRole[]>(`/guilds/${server.guildId}/roles`),
  ]);
  const now = new Date();

  const result = await prisma.$transaction(async (transaction) => {
    const updatedServer = await transaction.discordServer.update({
      data: {
        description: guild.description ?? server.description,
        iconUrl: buildDiscordIconUrl(guild.id, guild.icon),
        lastDiscoveryAt: now,
        locale: guild.preferred_locale ?? server.locale,
        name: guild.name,
        restStatus: "ok",
        status: server.status === "archived" ? server.status : "active",
      },
      where: {
        id: server.id,
      },
    });

    await transaction.discordGuildConfiguration.upsert({
      create: {
        discordServerId: updatedServer.id,
        ...getDefaultGuildConfiguration(),
      },
      update: {},
      where: {
        discordServerId: updatedServer.id,
      },
    });

    await Promise.all(
      channels.map((channel) =>
        transaction.discordGuildChannel.upsert({
          create: {
            channelId: channel.id,
            channelType: mapDiscordChannelType(channel.type),
            discordServerId: updatedServer.id,
            guildId: updatedServer.guildId,
            name: channel.name ?? `Channel ${channel.id}`,
            parentChannelId: channel.parent_id ?? null,
            permissionSnapshot: (channel.permission_overwrites ?? []) as Prisma.InputJsonValue,
            position: channel.position ?? null,
          },
          update: {
            channelType: mapDiscordChannelType(channel.type),
            isArchived: false,
            lastSyncedAt: now,
            name: channel.name ?? `Channel ${channel.id}`,
            parentChannelId: channel.parent_id ?? null,
            permissionSnapshot: (channel.permission_overwrites ?? []) as Prisma.InputJsonValue,
            position: channel.position ?? null,
          },
          where: {
            discordServerId_channelId: {
              channelId: channel.id,
              discordServerId: updatedServer.id,
            },
          },
        }),
      ),
    );

    await Promise.all(
      roles.map((role) =>
        transaction.discordGuildRole.upsert({
          create: {
            color: role.color ?? null,
            discordServerId: updatedServer.id,
            guildId: updatedServer.guildId,
            hoisted: role.hoist ?? false,
            managed: role.managed ?? false,
            mentionable: role.mentionable ?? false,
            name: role.name,
            permissionSnapshot: { permissions: role.permissions ?? null },
            position: role.position ?? null,
            roleId: role.id,
          },
          update: {
            color: role.color ?? null,
            hoisted: role.hoist ?? false,
            isArchived: false,
            lastSyncedAt: now,
            managed: role.managed ?? false,
            mentionable: role.mentionable ?? false,
            name: role.name,
            permissionSnapshot: { permissions: role.permissions ?? null },
            position: role.position ?? null,
          },
          where: {
            discordServerId_roleId: {
              discordServerId: updatedServer.id,
              roleId: role.id,
            },
          },
        }),
      ),
    );

    await transaction.discordGuildChannel.updateMany({
      data: {
        isArchived: true,
      },
      where: {
        channelId: {
          notIn: channels.map((channel) => channel.id),
        },
        discordServerId: updatedServer.id,
      },
    });

    await transaction.discordGuildRole.updateMany({
      data: {
        isArchived: true,
      },
      where: {
        discordServerId: updatedServer.id,
        roleId: {
          notIn: roles.map((role) => role.id),
        },
      },
    });

    const snapshot = await transaction.discordGuildDiscoverySnapshot.create({
      data: {
        discordServerId: updatedServer.id,
        discoveredChannels: channels.length,
        discoveredRoles: roles.length,
        guildId: updatedServer.guildId,
        snapshot: {
          channelTypes: channels.reduce<Record<string, number>>((accumulator, channel) => {
            const key = mapDiscordChannelType(channel.type);
            accumulator[key] = (accumulator[key] ?? 0) + 1;

            return accumulator;
          }, {}),
          guild: {
            id: guild.id,
            name: guild.name,
            preferredLocale: guild.preferred_locale ?? null,
          },
          roleCount: roles.length,
        },
        status: "completed",
      },
    });

    return {
      channelsImported: channels.length,
      rolesImported: roles.length,
      snapshotId: snapshot.id,
    };
  });

  await recordAuditEvent({
    action: "discord.guild.inventory.imported",
    actorUserId: input.actorUserId,
    entityId: server.id,
    entityType: "DiscordServer",
    metadata: result,
    summary: `${server.name} Discord inventory was refreshed without overwriting administrator mappings.`,
  });

  return result;
}

export async function getDiscordPlatformSummary() {
  const [guilds, channelCount, roleCount, latestSnapshot, healthFailures] = await Promise.all([
    prisma.discordServer.findMany({
      include: {
        _count: {
          select: {
            channelMappings: true,
            discoveredChannels: true,
            discoveredRoles: true,
            memberStates: true,
          },
        },
        configuration: true,
      },
      orderBy: [
        {
          isPrimary: "desc",
        },
        {
          name: "asc",
        },
      ],
    }),
    prisma.discordGuildChannel.count({
      where: {
        isArchived: false,
      },
    }),
    prisma.discordGuildRole.count({
      where: {
        isArchived: false,
      },
    }),
    prisma.discordGuildDiscoverySnapshot.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.discordGuildHealthCheck.count({
      where: {
        status: {
          in: ["failed", "error", "warning"],
        },
      },
    }),
  ]);

  return {
    channelCount,
    guilds,
    healthFailures,
    latestSnapshot,
    primaryGuild: guilds.find((guild) => guild.isPrimary) ?? null,
    roleCount,
  };
}

export async function recordDiscordGuildHealthCheck(input: {
  checkType: string;
  discordServerId: string;
  errorMessage?: string | null;
  latencyMs?: number | null;
  metadata?: Prisma.InputJsonValue;
  status: string;
  summary: string;
}) {
  return prisma.discordGuildHealthCheck.create({
    data: {
      checkType: input.checkType,
      discordServerId: input.discordServerId,
      errorMessage: input.errorMessage ?? null,
      latencyMs: input.latencyMs ?? null,
      metadata: input.metadata ?? undefined,
      status: input.status,
      summary: input.summary,
    },
  });
}
