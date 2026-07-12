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
import { getDiscordGatewayHealthSummary } from "@/server/discord/gateway/health";
import { listDiscordDiscoveryOperations } from "@/server/discord/discovery";
import { getDiscordAutomationOverview } from "@/server/discord/automation/queries";
import { getDiscordApplicationIntegrationOverview } from "@/server/discord/applications/service";
import { getDiscordEventManagementOverview } from "@/server/discord/event-management/queries";
import { getDiscordModerationPlatformOverview } from "@/server/discord/moderation/queries";
import { getDiscordPlatformSummary } from "@/server/discord/platform";
import { getDiscordPlatformReadiness } from "@/server/discord/readiness";
import { getCommunicationPlatformOverview } from "@/server/communications/health";
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
import type {
  DiscordAdministrationOverview,
  DiscordOperationsRecommendation,
} from "@/server/discord/types";
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

function countJsonArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getUserLabel(input: {
  displayName?: string | null;
  email?: string | null;
  name?: string | null;
} | null) {
  return input?.displayName ?? input?.name ?? input?.email ?? null;
}

function calculateGuildHealthScore(input: {
  channelMappingCount: number;
  gatewayEnabled: boolean;
  gatewayStatus: string;
  interactionStatus: string;
  isActive: boolean;
  isPrimary: boolean;
  memberStateCount: number;
  restStatus: string;
  roleMappingCount: number;
}) {
  let score = 100;

  if (!input.isActive) {
    score -= 30;
  }

  if (input.restStatus !== "ok" && input.restStatus !== "unknown") {
    score -= 20;
  }

  if (input.interactionStatus !== "ok" && input.interactionStatus !== "unknown") {
    score -= 15;
  }

  if (input.gatewayEnabled && !["connected", "unknown", "never_connected"].includes(input.gatewayStatus)) {
    score -= 15;
  }

  if (input.isPrimary && input.channelMappingCount === 0) {
    score -= 15;
  }

  if (input.memberStateCount === 0) {
    score -= 5;
  }

  if (input.roleMappingCount === 0) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function buildGuildRecommendations(input: {
  channelMappingCount: number;
  discoveredChannelCount: number;
  discoveredRoleCount: number;
  gatewayEnabled: boolean;
  gatewayStatus: string;
  id: string;
  interactionStatus: string;
  isPrimary: boolean;
  lastDiscoveryAt: Date | null;
  restStatus: string;
  roleMappingCount: number;
}): DiscordOperationsRecommendation[] {
  const recommendations: DiscordOperationsRecommendation[] = [];

  if (!input.lastDiscoveryAt) {
    recommendations.push({
      actionHref: "#guild-discovery",
      actionLabel: "Run discovery",
      description: "Import Discord channel and role inventory so mappings can be selected instead of manually entered.",
      id: `${input.id}-discovery`,
      severity: "warning",
      title: "Guild inventory has not been discovered",
    });
  }

  if (input.isPrimary && input.channelMappingCount === 0) {
    recommendations.push({
      actionHref: "#communications-routing",
      actionLabel: "Map channels",
      description: "Primary community guilds should have explicit announcement, event, and operations channel mappings.",
      id: `${input.id}-channels`,
      severity: "danger",
      title: "Primary guild has no channel mappings",
    });
  }

  if (input.discoveredChannelCount > 0 && input.channelMappingCount === 0) {
    recommendations.push({
      actionHref: "#communications-routing",
      actionLabel: "Create mappings",
      description: "Discovered channels are available, but no portal routing mappings are active yet.",
      id: `${input.id}-unmapped-channels`,
      severity: "warning",
      title: "Discovered channels are unmapped",
    });
  }

  if (input.discoveredRoleCount > 0 && input.roleMappingCount === 0) {
    recommendations.push({
      actionHref: "#role-mappings",
      actionLabel: "Review roles",
      description: "Roles are visible as automation targets. Map only the roles the portal is allowed to manage.",
      id: `${input.id}-unmapped-roles`,
      severity: "info",
      title: "Role inventory is ready for review",
    });
  }

  if (input.restStatus !== "ok" && input.restStatus !== "unknown") {
    recommendations.push({
      actionHref: "#diagnostics",
      actionLabel: "Open diagnostics",
      description: "REST checks are reporting a non-healthy state for this guild.",
      id: `${input.id}-rest`,
      severity: "danger",
      title: "REST health is degraded",
    });
  }

  if (input.interactionStatus !== "ok" && input.interactionStatus !== "unknown") {
    recommendations.push({
      actionHref: "#diagnostics",
      actionLabel: "Check interactions",
      description: "Interaction routing should be validated before relying on slash commands or buttons.",
      id: `${input.id}-interactions`,
      severity: "warning",
      title: "Interaction health needs review",
    });
  }

  if (input.gatewayEnabled && !["connected", "unknown", "never_connected"].includes(input.gatewayStatus)) {
    recommendations.push({
      actionHref: "#gateway-health",
      actionLabel: "Open Gateway",
      description: "Gateway is enabled but not reporting a healthy connection state.",
      id: `${input.id}-gateway`,
      severity: "warning",
      title: "Gateway state is degraded",
    });
  }

  return recommendations;
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
  const canViewModerationPlatform =
    can(user, "discord.moderation.view") ||
    can(user, "discord.moderation.history.view") ||
    can(user, "moderation.view");
  const canManageModerationPlatform =
    can(user, "discord.moderation.case.manage") ||
    can(user, "discord.moderation.policy.manage") ||
    can(user, "discord.moderation.warn") ||
    can(user, "discord.moderation.timeout") ||
    can(user, "discord.moderation.kick") ||
    can(user, "discord.moderation.ban");
  const canManageDiscordAdmin = can(user, "admin.discord.manage");
  const canDiscoverGuilds = can(user, "discord.guilds.discover");
  const canViewGuildDiagnostics =
    can(user, "discord.guilds.diagnostics.view") || can(user, "discord.diagnostics.view");
  const canViewDiscovery =
    can(user, "discord.discovery.view") || canViewGuildDiagnostics || canDiscoverGuilds;
  const canRunDiscovery = can(user, "discord.discovery.run") || canDiscoverGuilds;
  const canViewReconciliation =
    can(user, "discord.reconciliation.view") || canViewDiscovery || canViewGuildDiagnostics;
  const canManageReconciliation = can(user, "discord.reconciliation.manage");
  const canViewResources =
    can(user, "discord.resources.view") || canManageChannels || canManageRoleMappings || canViewGuildDiagnostics;
  const canViewGateway =
    can(user, "discord.gateway.view") || can(user, "discord.gateway.health.view");
  const canManageGateway = can(user, "discord.gateway.manage");
  const canViewDiscordEvents =
    can(user, "discord.events.view") ||
    can(user, "discord.events.diagnostics.view") ||
    can(user, "discord.events.history.view");
  const canManageDiscordEvents =
    can(user, "discord.events.manage") ||
    can(user, "discord.events.publish") ||
    can(user, "discord.events.policies.manage");
  const canViewDiscordApplications =
    can(user, "discord.applications.view") ||
    can(user, "discord.applications.catalog.view") ||
    can(user, "discord.applications.diagnostics.view");
  const canManageDiscordApplications =
    can(user, "discord.applications.manage") ||
    can(user, "discord.applications.catalog.manage") ||
    can(user, "discord.applications.policies.manage") ||
    can(user, "discord.applications.panels.manage");
  const canViewAutomation =
    can(user, "discord.automation.view") || can(user, "discord.automation.history.view");
  const canManageAutomation = can(user, "discord.automation.manage");
  const canApproveAutomation = can(user, "discord.automation.approve");
  const canExecuteAutomation = can(user, "discord.automation.execute");
  const canViewCommunications =
    can(user, "communications.view") ||
    can(user, "communications.delivery.view") ||
    can(user, "discord.communications.view");
  const [
    automation,
    applicationIntegration,
    eventManagement,
    moderationPlatform,
    communications,
    readiness,
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
    gatewayHealth,
    platformSummary,
    guildChannels,
    guildRoles,
    guildEvents,
    guildEmojis,
    guildStickers,
    discoveryOperations,
  ] = await Promise.all([
    canViewAutomation || canManageAutomation || canApproveAutomation || canExecuteAutomation
      ? getDiscordAutomationOverview()
      : Promise.resolve({
          definitions: [],
          failedActions: [],
          pendingApprovals: [],
          recentExecutions: [],
          summary: {
            activeExceptionCount: 0,
            automaticDefinitionCount: 0,
            definitionCount: 0,
            enabledDefinitionCount: 0,
            failedActionCount: 0,
            managedRoleCount: 0,
            openConflictCount: 0,
            openDriftCount: 0,
            pendingApprovalCount: 0,
            previewOnlyDefinitionCount: 0,
          },
        }),
    canViewDiscordApplications || canManageDiscordApplications
      ? getDiscordApplicationIntegrationOverview()
      : Promise.resolve({
          catalog: [],
          policies: [],
          reviewMessages: [],
          summary: {
            activeCatalogEntries: 0,
            activeSessions: 0,
            expiredTokens: 0,
            pendingReviews: 0,
            policyCount: 0,
            reviewMessageCount: 0,
          },
        }),
    canViewDiscordEvents || canManageDiscordEvents
      ? getDiscordEventManagementOverview()
      : Promise.resolve({
          drifts: [],
          executions: [],
          links: [],
          observations: [],
          plans: [],
          policies: [],
          summary: {
            activePolicyCount: 0,
            driftCount: 0,
            linkedEventCount: 0,
            partialFailureCount: 0,
            pendingApprovalCount: 0,
          },
        }),
    canViewModerationPlatform || canManageModerationPlatform
      ? getDiscordModerationPlatformOverview()
      : Promise.resolve({
          actions: [],
          appeals: 0,
          approvals: [],
          observations: [],
          openCases: 0,
          policies: [],
          summary: {
            activeBanCount: 0,
            activeTimeoutCount: 0,
            failedActionCount: 0,
            openCaseCount: 0,
            pendingAppealCount: 0,
            pendingApprovalCount: 0,
            warningCount: 0,
          },
        }),
    canViewCommunications
      ? getCommunicationPlatformOverview()
      : Promise.resolve({
          domains: [],
          health: {
            failedDeliveries: 0,
            missingDomainMappings: 0,
            pendingDeliveries: 0,
            queueDepth: 0,
            retryBacklog: 0,
            totalDomains: 0,
          },
          recentDeliveries: [],
          recentHistory: [],
        }),
    canViewBotHealth || canManageDiscordAdmin
      ? getDiscordPlatformReadiness()
      : Promise.resolve({
          componentStatuses: [],
          dependencyProfiles: [],
          featureCertifications: [],
          guildCertifications: [],
          overall: {
            status: "not_configured" as const,
            summary: "Discord readiness is not visible with current permissions.",
          },
          preflightChecks: [],
          releaseBlockers: [],
        }),
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
    canViewGateway || canManageGateway ? getDiscordGatewayHealthSummary() : Promise.resolve(null),
    canManageServers || canDiscoverGuilds || canViewGuildDiagnostics
      ? getDiscordPlatformSummary()
      : Promise.resolve(null),
    canViewResources
      ? prisma.discordGuildChannel.findMany({
          include: {
            discordServer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            {
              discordServer: {
                name: "asc",
              },
            },
            {
              channelType: "asc",
            },
            {
              position: "asc",
            },
            {
              name: "asc",
            },
          ],
          take: 500,
        })
      : Promise.resolve([]),
    canViewResources
      ? prisma.discordGuildRole.findMany({
          include: {
            discordServer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            {
              discordServer: {
                name: "asc",
              },
            },
            {
              position: "desc",
            },
            {
              name: "asc",
            },
          ],
          take: 500,
      })
      : Promise.resolve([]),
    canViewResources
      ? prisma.discordGuildScheduledEvent.findMany({
          include: {
            discordServer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            {
              discordServer: {
                name: "asc",
              },
            },
            {
              scheduledStartAt: "desc",
            },
            {
              name: "asc",
            },
          ],
          take: 250,
        })
      : Promise.resolve([]),
    canViewResources
      ? prisma.discordGuildEmoji.findMany({
          include: {
            discordServer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            {
              discordServer: {
                name: "asc",
              },
            },
            {
              name: "asc",
            },
          ],
          take: 250,
        })
      : Promise.resolve([]),
    canViewResources
      ? prisma.discordGuildSticker.findMany({
          include: {
            discordServer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            {
              discordServer: {
                name: "asc",
              },
            },
            {
              name: "asc",
            },
          ],
          take: 250,
        })
      : Promise.resolve([]),
    canViewDiscovery || canViewReconciliation
      ? listDiscordDiscoveryOperations()
      : Promise.resolve({
          reconciliationItems: [],
          schedules: [],
          sessions: [],
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
  const channelMappingByServerChannel = new Map(
    mappings.map((mapping) => [`${mapping.discordServerId}:${mapping.channelId}`, mapping.key]),
  );
  const roleMappingByServerRole = new Map(
    roleMappings.map((mapping) => [
      `${mapping.discordServerId}:${mapping.discordRoleId}`,
      getDiscordRoleMappingLabel(mapping),
    ]),
  );

  return {
    automation,
    botHealth: getDiscordBotHealthSummary(),
    canApproveAutomation,
    canExecuteAutomation,
    canManageAutomation,
    canManageReconciliation,
    canMergeIdentities,
    canManageChannels,
    canManageDiscordAdmin,
    canModerateKick,
    canManageModerationPlatform,
    canManageRoleMappings,
    canRunMemberSync,
    canManageServers,
    canSendNotifications,
    canRunSync,
    canViewIdentity,
    canViewMembers,
    canViewModerationHistory,
    canViewModerationPlatform,
    canViewSync,
    canViewBotHealth,
    canViewDeliveries,
    canViewGateway,
    canViewReconciliation,
    canRunDiscovery,
    canViewDiscovery,
    canViewAutomation,
    canManageGateway,
    canManageDiscordEvents,
    canViewDiscordEvents,
    canManageDiscordApplications,
    canViewDiscordApplications,
    communications,
    readiness,
    applicationIntegration: {
      catalog: applicationIntegration.catalog.map((entry) => ({
        applicationTypeKey: entry.applicationTypeKey,
        availability: entry.availability,
        displayName: entry.displayName,
        enabled: entry.isEnabled,
        id: entry.id,
        maintenanceMode: entry.maintenanceMode,
        reviewDestination: entry.reviewDestination,
      })),
      policies: applicationIntegration.policies.map((policy) => ({
        commandAvailability: policy.commandAvailability,
        enabled: policy.applicationIntegrationEnabled,
        guildId: policy.guildId,
        id: policy.id,
        panelEnabled: policy.applicationPanelEnabled,
        portalOnlyReviewMode: policy.portalOnlyReviewMode,
        reviewerQuickActionsEnabled: policy.reviewerQuickActionsEnabled,
        testingMode: policy.testingMode,
      })),
      reviewMessages: applicationIntegration.reviewMessages.map((message) => ({
        applicationType: message.applicationType,
        id: message.id,
        lastPublishedAtLabel: formatOptionalTimestamp(message.lastPublishedAt),
        status: message.status,
        submissionId: message.submissionId,
      })),
      summary: applicationIntegration.summary,
    },
    eventManagement: {
      drifts: eventManagement.drifts.map((drift) => ({
        detectedAtLabel: formatTimestamp(drift.detectedAt),
        id: drift.id,
        severity: drift.severity,
        status: drift.status,
        summary: drift.summary,
      })),
      executions: eventManagement.executions.map((execution) => ({
        actionCount: execution.actions.length,
        createdAtLabel: formatTimestamp(execution.createdAt),
        executionType: execution.executionType,
        failedActionCount: execution.actions.filter((action) => action.status === "failed").length,
        id: execution.id,
        status: execution.status,
      })),
      links: eventManagement.links.map((link) => ({
        currentDiscordStatus: link.currentDiscordStatus,
        discordScheduledEventId: link.discordScheduledEventId,
        driftState: link.driftState,
        guildId: link.guildId,
        id: link.id,
        lastSynchronizedAtLabel: formatOptionalTimestamp(link.lastSynchronizedAt),
        ownershipMode: link.ownershipMode,
        portalEventId: link.portalEventId,
        portalEventType: link.portalEventType,
        synchronizationState: link.synchronizationState,
      })),
      observations: eventManagement.observations.map((observation) => ({
        discordScheduledEventId: observation.discordScheduledEventId,
        discordUserId: observation.discordUserId,
        id: observation.id,
        observedAtLabel: formatTimestamp(observation.observedAt),
        participationStatus: observation.participationStatus,
        portalEventId: observation.portalEventId,
      })),
      plans: eventManagement.plans.map((plan) => ({
        createdAtLabel: formatTimestamp(plan.createdAt),
        id: plan.id,
        portalEventId: plan.portalEventId,
        portalEventType: plan.portalEventType,
        status: plan.status,
        targetCount: plan.targets.length,
      })),
      policies: eventManagement.policies.map((policy) => ({
        defaultEntityType: policy.defaultEntityType,
        eventType: policy.eventType,
        guildId: policy.guildId,
        id: policy.id,
        integrationEnabled: policy.integrationEnabled,
        manualApprovalRequired: policy.manualApprovalRequired,
        previewRequired: policy.previewRequired,
        testMode: policy.testMode,
      })),
      summary: eventManagement.summary,
    },
    moderationPlatform: {
      actions: moderationPlatform.actions.map((action) => ({
        action: action.action,
        caseNumber: action.relatedCase?.caseNumber ?? null,
        createdAtLabel: formatTimestamp(action.createdAt),
        guildName: action.discordServer.name,
        id: action.id,
        result: action.result,
        targetLabel:
          action.targetMemberProfile?.displayName ??
          action.targetDiscordUserId,
      })),
      approvals: moderationPlatform.approvals.map((approval) => ({
        approvalMode: approval.approvalMode,
        caseId: approval.caseId,
        id: approval.id,
        requestedAtLabel: formatTimestamp(approval.requestedAt),
        status: approval.status,
      })),
      observations: moderationPlatform.observations.map((observation) => ({
        id: observation.id,
        observationType: observation.observationType,
        observedAtLabel: formatTimestamp(observation.observedAt),
        status: observation.reconciliationStatus,
        summary: observation.summary,
        targetDiscordUserId: observation.targetDiscordUserId,
      })),
      policies: moderationPlatform.policies.map((policy) => ({
        banApprovalMode: policy.banApprovalMode,
        crossGuildPolicy: policy.crossGuildPolicy,
        guildId: policy.guildId,
        id: policy.id,
        isEnabled: policy.isEnabled,
        kickApprovalMode: policy.kickApprovalMode,
        timeoutApprovalMode: policy.timeoutApprovalMode,
        timeoutMaxSeconds: policy.timeoutMaxSeconds,
      })),
      summary: moderationPlatform.summary,
    },
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
    discovery: {
      reconciliationItems: discoveryOperations.reconciliationItems.map((item) => ({
        changeStatus: item.changeStatus,
        createdAtLabel: formatTimestamp(item.createdAt),
        id: item.id,
        recommendedAction: item.recommendedAction,
        resourceId: item.resourceId,
        resourceType: item.resourceType,
        serverId: item.discordServerId,
        serverName: item.discordServer.name,
        severity: item.severity,
        status: item.status,
        summary: item.summary,
        title: item.title,
      })),
      schedules: discoveryOperations.schedules.map((schedule) => ({
        gatewayDriven: schedule.gatewayDriven,
        id: schedule.id,
        isEnabled: schedule.isEnabled,
        lastRunAtLabel: formatOptionalTimestamp(schedule.lastRunAt),
        lastStatus: schedule.lastStatus,
        nextRunAtLabel: formatOptionalTimestamp(schedule.nextRunAt),
        policy: schedule.policy,
        serverId: schedule.discordServerId,
        serverName: schedule.discordServer.name,
      })),
      sessions: discoveryOperations.sessions.map((session) => ({
        completedAtLabel: formatOptionalTimestamp(session.completedAt),
        createdAtLabel: formatTimestamp(session.createdAt),
        discoveryType: session.discoveryType,
        dryRun: session.dryRun,
        id: session.id,
        resourcesFetched: session.resourcesFetched,
        resourcesMissing: session.resourcesMissing,
        resourcesUpdated: session.resourcesUpdated,
        serverId: session.discordServerId,
        serverName: session.discordServer.name,
        status: session.status,
        warningCount: countJsonArray(session.warnings),
      })),
    },
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
    platform: platformSummary
      ? {
          activeGuildCount: platformSummary.guilds.filter((guild) => guild.isActive && guild.status !== "archived").length,
          channelInventoryCount: platformSummary.channelCount,
          healthIssueCount: platformSummary.healthFailures,
          latestDiscoveryAtLabel: platformSummary.latestSnapshot
            ? formatTimestamp(platformSummary.latestSnapshot.createdAt)
            : null,
          primaryGuildName: platformSummary.primaryGuild?.name ?? null,
          roleInventoryCount: platformSummary.roleCount,
          totalGuildCount: platformSummary.guilds.length,
        }
      : {
          activeGuildCount: 0,
          channelInventoryCount: 0,
          healthIssueCount: 0,
          latestDiscoveryAtLabel: null,
          primaryGuildName: null,
          roleInventoryCount: 0,
          totalGuildCount: servers.length,
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
    gatewayHealth,
    guildChannels: guildChannels.map((channel) => ({
      channelId: channel.channelId,
      channelType: channel.channelType,
      guildId: channel.guildId,
      id: channel.id,
      isArchived: channel.isArchived,
      isMissing: channel.isMissing,
      lastSyncedAtLabel: formatTimestamp(channel.lastSyncedAt),
      lastSeenAtLabel: formatTimestamp(channel.lastSeenAt),
      mappedKey: channelMappingByServerChannel.get(`${channel.discordServerId}:${channel.channelId}`) ?? null,
      name: channel.name,
      parentChannelId: channel.parentChannelId,
      position: channel.position,
      serverId: channel.discordServerId,
      serverName: channel.discordServer.name,
    })),
    guildEmojis: guildEmojis.map((emoji) => ({
      animated: emoji.animated,
      available: emoji.available,
      emojiId: emoji.emojiId,
      id: emoji.id,
      isArchived: emoji.isArchived,
      isMissing: emoji.isMissing,
      name: emoji.name,
      serverId: emoji.discordServerId,
      serverName: emoji.discordServer.name,
    })),
    guildEvents: guildEvents.map((event) => ({
      channelId: event.channelId,
      eventId: event.eventId,
      id: event.id,
      isArchived: event.isArchived,
      isMissing: event.isMissing,
      name: event.name,
      scheduledStartAtLabel: formatOptionalTimestamp(event.scheduledStartAt),
      serverId: event.discordServerId,
      serverName: event.discordServer.name,
      status: event.status,
    })),
    guildRoles: guildRoles.map((role) => ({
      botManageable: role.botManageable,
      color: role.color,
      guildId: role.guildId,
      hoisted: role.hoisted,
      id: role.id,
      isArchived: role.isArchived,
      isMissing: role.isMissing,
      lastSyncedAtLabel: formatTimestamp(role.lastSyncedAt),
      lastSeenAtLabel: formatTimestamp(role.lastSeenAt),
      managed: role.managed,
      mappedType: roleMappingByServerRole.get(`${role.discordServerId}:${role.roleId}`) ?? null,
      mentionable: role.mentionable,
      name: role.name,
      position: role.position,
      roleId: role.roleId,
      serverId: role.discordServerId,
      serverName: role.discordServer.name,
    })),
    guildStickers: guildStickers.map((sticker) => ({
      available: sticker.available,
      formatType: sticker.formatType,
      id: sticker.id,
      isArchived: sticker.isArchived,
      isMissing: sticker.isMissing,
      name: sticker.name,
      serverId: sticker.discordServerId,
      serverName: sticker.discordServer.name,
      stickerId: sticker.stickerId,
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
      discoveredChannelCount: server._count.discoveredChannels,
      discoveredRoleCount: server._count.discoveredRoles,
      gatewayStatus: server.gatewayStatus,
      gatewayEnabled: server.gatewayEnabled,
      guildType: server.guildType,
      guildId: server.guildId,
      healthScore: calculateGuildHealthScore({
        channelMappingCount: server._count.channelMappings,
        gatewayEnabled: server.gatewayEnabled,
        gatewayStatus: server.gatewayStatus,
        interactionStatus: server.interactionStatus,
        isActive: server.isActive,
        isPrimary: server.isPrimary,
        memberStateCount: server._count.memberStates,
        restStatus: server.restStatus,
        roleMappingCount: server._count.roleMappings,
      }),
      id: server.id,
      interactionStatus: server.interactionStatus,
      isActive: server.isActive,
      isPrimary: server.isPrimary,
      lastDiscoveryAtLabel: formatOptionalTimestamp(server.lastDiscoveryAt),
      lastSyncAtLabel: formatOptionalTimestamp(server.lastSyncAt),
      memberSyncPolicy: server.memberSyncPolicy,
      name: server.name,
      nicknameSyncPolicy: server.nicknameSyncPolicy,
      restStatus: server.restStatus,
      recommendations: buildGuildRecommendations({
        channelMappingCount: server._count.channelMappings,
        discoveredChannelCount: server._count.discoveredChannels,
        discoveredRoleCount: server._count.discoveredRoles,
        gatewayEnabled: server.gatewayEnabled,
        gatewayStatus: server.gatewayStatus,
        id: server.id,
        interactionStatus: server.interactionStatus,
        isPrimary: server.isPrimary,
        lastDiscoveryAt: server.lastDiscoveryAt,
        restStatus: server.restStatus,
        roleMappingCount: server._count.roleMappings,
      }),
      roleSyncPolicy: server.roleSyncPolicy,
      status: server.status,
      unitId: server.unit?.id ?? null,
      unitName: server.unit?.name ?? null,
      updatedAtLabel: formatTimestamp(server.updatedAt),
      voiceAwarenessEnabled: server.voiceAwarenessEnabled,
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
