import { can } from "@/server/permissions/access";
import { prisma } from "@/server/database/client";
import { getDiscordBotHealthSummary } from "@/server/discord/client/health";
import {
  getDiscordRoleSyncPreviewData,
  getDiscordRoleMappingLabel,
} from "@/server/discord/role-sync";
import {
  isDiscordChannelMappingKey,
  isDiscordRoleMappingType,
} from "@/server/discord/constants";
import {
  getDiscordSafeConfigDiagnostics,
  shouldSyncDiscordBotAccounts,
} from "@/server/discord/config";
import { getInteractionSessionDiagnostics } from "@/server/discord/interactions/sessions/service";
import {
  listDiscordChannelMappings,
  listDiscordRoleMappings,
  listDiscordServers,
} from "@/server/discord/service";
import {
  listDiscordGuildMemberStates,
  listDiscordModerationActions,
  listDiscordSyncLogs,
} from "@/server/discord/guild-members";
import { listDiscordIdentityDiagnostics } from "@/server/discord/identity";
import type { PortalUser } from "@/features/auth/types";
import type { DiscordAdministrationOverview } from "@/server/discord/types";
import { isNotificationDeliveryStatus } from "@/server/notifications/constants";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function formatOptionalTimestamp(value: Date | null) {
  return value ? formatTimestamp(value) : null;
}

function getUserLabel(input: {
  displayName?: string | null;
  email?: string | null;
  name?: string | null;
} | null) {
  return input?.displayName ?? input?.name ?? input?.email ?? null;
}

export async function getDiscordAdministrationOverview(
  user: Pick<PortalUser, "permissionGrants" | "permissions">,
  options?: {
    previewServerId?: string | null;
  },
): Promise<DiscordAdministrationOverview> {
  const canViewBotHealth = can(user, "discord.bot.health.view");
  const canViewDeliveries = can(user, "notifications.delivery.view");
  const canManageServers = can(user, "discord.servers.manage");
  const canManageChannels = can(user, "discord.channels.manage");
  const canManageRoleMappings = can(user, "discord.roles.manage");
  const canSendNotifications = can(user, "discord.notifications.send");
  const canViewSync = can(user, "discord.sync.view");
  const canRunSync = can(user, "discord.sync.run");
  const canViewMembers = can(user, "discord.members.view");
  const canRunMemberSync = can(user, "discord.members.sync");
  const canViewIdentity = can(user, "discord.identity.view");
  const canMergeIdentities = can(user, "discord.identity.merge");
  const canModerateKick = can(user, "discord.moderation.kick");
  const canViewModerationHistory = can(user, "discord.moderation.history.view");
  const canManageDiscordAdmin = can(user, "admin.discord.manage");
  const [
    units,
    servers,
    mappings,
    roleMappings,
    deliveries,
    recentActivity,
    qualifications,
    roles,
    ranks,
    guildMembers,
    syncLogs,
    moderationActions,
    identityDiagnostics,
    interactionSessionDiagnostics,
  ] = await Promise.all([
    prisma.unit.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        shortName: true,
      },
    }),
    listDiscordServers(),
    listDiscordChannelMappings(),
    canManageRoleMappings || canViewSync ? listDiscordRoleMappings() : Promise.resolve([]),
    canViewDeliveries
      ? prisma.notificationDelivery.findMany({
          where: {
            channelType: {
              in: ["discord_channel", "discord_dm"],
            },
          },
          include: {
            discordChannelMapping: {
              include: {
                discordServer: true,
              },
            },
            notification: {
              select: {
                title: true,
              },
            },
            recipientUser: {
              select: {
                displayName: true,
                email: true,
                name: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.auditLog.findMany({
      where: {
        OR: [
          {
            action: {
              startsWith: "discord.",
            },
          },
          {
            entityType: {
              in: [
                "DiscordServer",
                "DiscordChannelMapping",
                "DiscordRoleMapping",
                "DiscordGuildMemberState",
                "DiscordSyncLog",
                "DiscordModerationAction",
              ],
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.qualification.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        label: "asc",
      },
      select: {
        id: true,
        label: true,
      },
    }),
    prisma.role.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        label: "asc",
      },
      select: {
        id: true,
        label: true,
      },
    }),
    prisma.rank.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        abbreviation: true,
        id: true,
        label: true,
      },
    }),
    canViewMembers || canViewIdentity ? listDiscordGuildMemberStates() : Promise.resolve([]),
    canViewSync || canRunMemberSync || canViewIdentity ? listDiscordSyncLogs() : Promise.resolve([]),
    canViewModerationHistory ? listDiscordModerationActions() : Promise.resolve([]),
    canViewMembers || canViewIdentity || canRunMemberSync || canMergeIdentities
      ? listDiscordIdentityDiagnostics(user)
      : Promise.resolve(null),
    canViewBotHealth || canManageDiscordAdmin
      ? getInteractionSessionDiagnostics()
      : Promise.resolve({
          activeCount: 0,
          expiredCount: 0,
          failedCount: 0,
          recentFailed: [],
        }),
  ]);
  const previewServerId =
    options?.previewServerId ??
    servers.find((server) => server.isPrimary)?.id ??
    servers[0]?.id ??
    null;
  const roleSyncPreview =
    previewServerId && canViewSync
      ? await getDiscordRoleSyncPreviewData(previewServerId).catch(() => null)
      : null;

  const sentDeliveryCount = deliveries.filter((delivery) => delivery.status === "sent").length;
  const failedDeliveryCount = deliveries.filter((delivery) => delivery.status === "failed").length;
  const safeConfigDiagnostics = getDiscordSafeConfigDiagnostics();
  const [
    totalDiscordLinkedUsers,
    linkedOAuthUserCount,
    importedMemberCount,
    skippedBotAggregate,
  ] = await Promise.all([
    canViewIdentity || canViewMembers || canRunMemberSync || canMergeIdentities
      ? prisma.user.count({
          where: {
            deletedAt: null,
            OR: [
              {
                discordId: {
                  not: null,
                },
              },
              {
                accounts: {
                  some: {
                    provider: "discord",
                  },
                },
              },
              {
                discordMemberLinks: {
                  some: {},
                },
              },
              {
                discordGuildStates: {
                  some: {
                    isBot: false,
                  },
                },
              },
            ],
          },
        })
      : Promise.resolve(0),
    canViewIdentity || canViewMembers || canRunMemberSync || canMergeIdentities
      ? prisma.account.count({
          where: {
            provider: "discord",
          },
        })
      : Promise.resolve(0),
    canViewIdentity || canViewMembers || canRunMemberSync || canMergeIdentities
      ? prisma.discordGuildMemberState.count({
          where: {
            isBot: false,
          },
        })
      : Promise.resolve(0),
    canViewIdentity || canViewMembers || canRunMemberSync || canMergeIdentities
      ? prisma.discordSyncLog.aggregate({
          _sum: {
            skippedBotCount: true,
          },
        })
      : Promise.resolve({
          _sum: {
            skippedBotCount: 0,
          },
        }),
  ]);
  const latestSyncLog = syncLogs[0] ?? null;

  return {
    botHealth: getDiscordBotHealthSummary(),
    canMergeIdentities,
    canManageChannels,
    canManageDiscordAdmin,
    canModerateKick,
    canManageRoleMappings,
    canRunMemberSync,
    canManageServers,
    canSendNotifications,
    canRunSync,
    canViewIdentity,
    canViewMembers,
    canViewModerationHistory,
    canViewSync,
    canViewBotHealth,
    canViewDeliveries,
    channelMappings: mappings.map((mapping) => ({
      channelId: mapping.channelId,
      description: mapping.description,
      id: mapping.id,
      isActive: mapping.isActive,
      key: isDiscordChannelMappingKey(mapping.key) ? mapping.key : "announcements",
      latestDeliveryStatus:
        mapping.notificationDeliveries[0] &&
        isNotificationDeliveryStatus(mapping.notificationDeliveries[0].status)
          ? mapping.notificationDeliveries[0].status
          : null,
      serverId: mapping.discordServerId,
      serverName: mapping.discordServer.name,
      serverUnitName: mapping.discordServer.unit?.name ?? null,
      updatedAtLabel: formatTimestamp(mapping.updatedAt),
    })),
    deliveries: deliveries
      .filter(
        (
          delivery,
        ): delivery is typeof delivery & {
          channelType: "discord_channel" | "discord_dm";
        } => delivery.channelType === "discord_channel" || delivery.channelType === "discord_dm",
      )
      .map((delivery) => ({
        channelType:
          delivery.channelType === "discord_dm" ? "discord_dm" : "discord_channel",
        destinationKey: delivery.destinationKey,
        errorMessage: delivery.errorMessage,
        id: delivery.id,
        mappingKey: delivery.discordChannelMapping?.key ?? null,
        notificationTitle: delivery.notification.title,
        recipientLabel:
          delivery.recipientUser?.displayName ??
          delivery.recipientUser?.name ??
          delivery.recipientUser?.email ??
          null,
        serverName: delivery.discordChannelMapping?.discordServer.name ?? null,
        status: isNotificationDeliveryStatus(delivery.status) ? delivery.status : "pending",
        updatedAtLabel: formatTimestamp(delivery.updatedAt),
    })),
    failedDeliveryCount,
    identityDiagnostics: identityDiagnostics
      ? {
          duplicateDiscordIdentities: identityDiagnostics.duplicateDiscordIdentities,
          importedButNotLinked: identityDiagnostics.importedButNotLinked.map((item) => ({
            ...item,
            lastSyncedAtLabel: formatTimestamp(item.lastSyncedAt),
          })),
          likelyDisplayNameDuplicates: identityDiagnostics.likelyDisplayNameDuplicates,
          loggedInUsersWithoutProfile: identityDiagnostics.loggedInUsersWithoutProfile,
          profilesWithoutDiscordIdentity: identityDiagnostics.profilesWithoutDiscordIdentity,
        }
      : null,
    identitySummary: {
      botExclusionEnabled: !shouldSyncDiscordBotAccounts(),
      botTokenPresent: safeConfigDiagnostics.botTokenPresent,
      devGuildConfigured: safeConfigDiagnostics.devGuildIdPresent,
      duplicateDiscordIdentityCount:
        identityDiagnostics?.duplicateDiscordIdentities.length ?? 0,
      importedMemberCount,
      interactionWebhookReady:
        safeConfigDiagnostics.requiredForInteractionWebhook.publicKey &&
        safeConfigDiagnostics.requiredForInteractionWebhook.reachableHttpsUrl,
      lastSyncAtLabel: latestSyncLog ? formatTimestamp(latestSyncLog.startedAt) : null,
      lastSyncError: latestSyncLog?.errorMessage ?? null,
      lastSyncStatus: latestSyncLog?.status ?? null,
      likelyDisplayNameDuplicateCount:
        identityDiagnostics?.likelyDisplayNameDuplicates.length ?? 0,
      linkedOAuthUserCount,
      publicInteractionUrlConfigured: safeConfigDiagnostics.interactionsUrlConfigured,
      skippedBotCount: skippedBotAggregate._sum.skippedBotCount ?? 0,
      totalDiscordLinkedUsers,
      unlinkedProfileCount: identityDiagnostics?.profilesWithoutDiscordIdentity.length ?? 0,
    },
    interactionSessions: {
      activeCount: interactionSessionDiagnostics.activeCount,
      expiredCount: interactionSessionDiagnostics.expiredCount,
      failedCount: interactionSessionDiagnostics.failedCount,
      recentFailed: interactionSessionDiagnostics.recentFailed.map((session) => ({
        commandName: session.commandName,
        currentStep: session.currentStep,
        discordUserId: session.discordUserId,
        id: session.id,
        updatedAtLabel: formatTimestamp(session.updatedAt),
        workflowType: session.workflowType,
      })),
      ttlMinutes: safeConfigDiagnostics.interactionSessionTtlMinutes,
    },
    guildMembers: guildMembers.map((member) => ({
      avatarUrl: member.avatarUrl,
      discordServerId: member.discordServerId,
      discordUserId: member.discordUserId,
      displayName:
        member.displayName ??
        member.memberProfile?.displayName ??
        member.user?.displayName ??
        member.username ??
        "Unknown Discord Member",
      guildId: member.guildId,
      id: member.id,
      isBot: member.isBot,
      joinedAtLabel: formatOptionalTimestamp(member.joinedAt),
      lastSyncedAtLabel: formatTimestamp(member.lastSyncedAt),
      leftAtLabel: formatOptionalTimestamp(member.leftAt),
      memberProfileId: member.memberProfileId,
      profileLabel: member.memberProfile?.displayName ?? null,
      serverName: member.discordServer.name,
      syncStatus: member.syncStatus,
      username: member.username,
      userId: member.userId,
    })),
    moderationActions: moderationActions.map((action) => ({
      action: action.action,
      createdAtLabel: formatTimestamp(action.createdAt),
      errorMessage: action.errorMessage,
      id: action.id,
      moderatorLabel: getUserLabel(action.moderator),
      reason: action.reason,
      result: action.result,
      serverName: action.discordServer.name,
      targetDiscordUserId: action.targetDiscordUserId,
      targetLabel:
        action.targetMemberProfile?.displayName ??
        getUserLabel(action.targetUser) ??
        action.targetDiscordUserId,
    })),
    recentActivity: recentActivity.map((entry) => ({
      action: entry.action,
      createdAtLabel: formatTimestamp(entry.createdAt),
      entityLabel: entry.entityType,
      id: entry.id,
      summary: entry.summary,
    })),
    roleMappings: roleMappings.map((mapping) => ({
      description: mapping.description,
      discordRoleId: mapping.discordRoleId,
      discordRoleName: mapping.discordRoleName,
      id: mapping.id,
      isActive: mapping.isActive,
      mappingLabel: getDiscordRoleMappingLabel(mapping),
      mappingType: isDiscordRoleMappingType(mapping.mappingType)
        ? mapping.mappingType
        : "unit",
      qualificationId: mapping.qualificationId,
      rankId: mapping.rankId,
      roleId: mapping.roleId,
      serverId: mapping.discordServerId,
      serverName: mapping.discordServer.name,
      unitId: mapping.unitId,
      updatedAtLabel: formatTimestamp(mapping.updatedAt),
    })),
    roleSyncPreview,
    sentDeliveryCount,
    servers: servers.map((server) => ({
      channelMappingCount: server._count.channelMappings,
      guildId: server.guildId,
      id: server.id,
      isActive: server.isActive,
      isPrimary: server.isPrimary,
      name: server.name,
      unitId: server.unit?.id ?? null,
      unitName: server.unit?.name ?? null,
      updatedAtLabel: formatTimestamp(server.updatedAt),
    })),
    syncLogs: syncLogs.map((entry) => ({
      actorLabel: getUserLabel(entry.actor),
      completedAtLabel: formatOptionalTimestamp(entry.completedAt),
      errorMessage: entry.errorMessage,
      id: entry.id,
      importedCount: entry.importedCount,
      leftCount: entry.leftCount,
      scannedCount: entry.scannedCount,
      serverName: entry.discordServer?.name ?? null,
      skippedBotCount: entry.skippedBotCount,
      startedAtLabel: formatTimestamp(entry.startedAt),
      status: entry.status,
      syncType: entry.syncType,
      updatedCount: entry.updatedCount,
    })),
    units,
    qualifications,
    ranks,
    roles,
  };
}
