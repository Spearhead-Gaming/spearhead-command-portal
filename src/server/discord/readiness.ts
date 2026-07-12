import { getDiscordSafeConfigDiagnostics } from "@/server/discord/config";
import { getDiscordBotHealthSummary } from "@/server/discord/client/health";
import { getDiscordGatewayHealthSummary } from "@/server/discord/gateway/health";
import { prisma } from "@/server/database/client";

export type DiscordPlatformStatus =
  | "healthy"
  | "healthy_with_warnings"
  | "degraded"
  | "partially_unavailable"
  | "blocked"
  | "not_configured"
  | "disabled";

export type DiscordReadinessSeverity = "info" | "warning" | "danger" | "success" | "muted";

export type DiscordReadinessCheckStatus = "pass" | "warn" | "fail" | "skip";

export type DiscordPlatformComponentStatus = {
  actionHref: string;
  component: string;
  details: string[];
  optional: boolean;
  severity: DiscordReadinessSeverity;
  status: DiscordPlatformStatus;
  summary: string;
};

export type DiscordPlatformPreflightCheck = {
  actionHref: string;
  category: string;
  id: string;
  recommendation: string;
  status: DiscordReadinessCheckStatus;
  summary: string;
};

export type DiscordCertificationState =
  | "not_evaluated"
  | "ready"
  | "ready_with_warnings"
  | "not_ready"
  | "disabled"
  | "expired";

export type DiscordGuildCapabilityCertification = {
  key: string;
  label: string;
  state: DiscordCertificationState;
  summary: string;
};

export type DiscordGuildCertification = {
  capabilities: DiscordGuildCapabilityCertification[];
  guildId: string;
  guildName: string;
  serverId: string;
  state: DiscordCertificationState;
  summary: string;
};

export type DiscordFeatureCertification = {
  dependencies: string[];
  key: string;
  label: string;
  state: DiscordCertificationState;
  summary: string;
};

export type DiscordDependencyProfile = {
  feature: string;
  required: string[];
  optional: string[];
};

export type DiscordPlatformReadiness = {
  componentStatuses: DiscordPlatformComponentStatus[];
  dependencyProfiles: DiscordDependencyProfile[];
  featureCertifications: DiscordFeatureCertification[];
  guildCertifications: DiscordGuildCertification[];
  overall: {
    status: DiscordPlatformStatus;
    summary: string;
  };
  preflightChecks: DiscordPlatformPreflightCheck[];
  releaseBlockers: Array<{
    actionHref: string;
    severity: "critical" | "high";
    summary: string;
    title: string;
  }>;
};

function component(input: DiscordPlatformComponentStatus): DiscordPlatformComponentStatus {
  return input;
}

function check(input: DiscordPlatformPreflightCheck): DiscordPlatformPreflightCheck {
  return input;
}

function stateFromChecks(checks: DiscordPlatformPreflightCheck[]): DiscordPlatformStatus {
  if (checks.some((entry) => entry.status === "fail")) {
    return "blocked";
  }

  if (checks.some((entry) => entry.status === "warn")) {
    return "healthy_with_warnings";
  }

  if (checks.every((entry) => entry.status === "skip")) {
    return "disabled";
  }

  return "healthy";
}

function certificationFromCapabilityStates(
  capabilities: DiscordGuildCapabilityCertification[],
): DiscordCertificationState {
  if (capabilities.every((entry) => entry.state === "disabled")) {
    return "disabled";
  }

  if (capabilities.some((entry) => entry.state === "not_ready")) {
    return "not_ready";
  }

  if (capabilities.some((entry) => entry.state === "ready_with_warnings")) {
    return "ready_with_warnings";
  }

  if (capabilities.some((entry) => entry.state === "ready")) {
    return "ready";
  }

  return "not_evaluated";
}

function getOverallStatus(componentStatuses: DiscordPlatformComponentStatus[]) {
  if (componentStatuses.some((entry) => entry.status === "blocked")) {
    return "blocked" as const;
  }

  if (componentStatuses.some((entry) => entry.status === "partially_unavailable")) {
    return "partially_unavailable" as const;
  }

  if (componentStatuses.some((entry) => entry.status === "degraded")) {
    return "degraded" as const;
  }

  if (componentStatuses.some((entry) => entry.status === "healthy_with_warnings")) {
    return "healthy_with_warnings" as const;
  }

  if (componentStatuses.every((entry) => entry.status === "not_configured" || entry.status === "disabled")) {
    return "not_configured" as const;
  }

  return "healthy" as const;
}

function getStatusSummary(status: DiscordPlatformStatus) {
  switch (status) {
    case "healthy":
      return "Discord platform checks are healthy based on local configuration and Portal records.";
    case "healthy_with_warnings":
      return "Discord platform is usable, but warnings should be resolved before broad rollout.";
    case "degraded":
      return "One or more Discord subsystems are degraded. Portal-owned workflows should continue with reduced Discord capability.";
    case "partially_unavailable":
      return "Some Discord capabilities are unavailable. Keep affected workflows disabled or in preview mode.";
    case "blocked":
      return "A blocking Discord readiness issue exists and should be resolved before Phase 4 rollout.";
    case "disabled":
      return "Discord features are intentionally disabled.";
    case "not_configured":
    default:
      return "Discord platform is not fully configured.";
  }
}

export const discordDependencyProfiles: DiscordDependencyProfile[] = [
  {
    feature: "Slash Commands",
    optional: ["Gateway worker"],
    required: ["application ID", "bot token", "public interaction endpoint", "public key", "command registration"],
  },
  {
    feature: "Role Automation",
    optional: ["Gateway observation"],
    required: ["linked identity", "enabled guild", "discovered role", "role mapping", "Manage Roles", "role hierarchy", "automation definition"],
  },
  {
    feature: "Patrol AAR Screenshot Continuation",
    optional: ["Gateway message observation for passive continuation"],
    required: ["active interaction session", "linked identity", "attachment upload", "file storage", "Portal AAR service"],
  },
  {
    feature: "Scheduled Events",
    optional: ["Gateway drift observation"],
    required: ["event policy", "Discord REST", "guild reachability", "Manage Events capability", "Portal event source"],
  },
  {
    feature: "Application Integration",
    optional: ["persistent application panels"],
    required: ["interaction webhook", "application catalog", "Portal form template", "continuation token", "review channel mapping"],
  },
];

export async function getDiscordPlatformReadiness(): Promise<DiscordPlatformReadiness> {
  const [safeConfig, botHealth, gatewayHealth] = await Promise.all([
    Promise.resolve(getDiscordSafeConfigDiagnostics()),
    Promise.resolve(getDiscordBotHealthSummary()),
    getDiscordGatewayHealthSummary(),
  ]);
  const [
    servers,
    channelMappingCount,
    roleMappingCount,
    failedDeliveries,
    pendingDeliveries,
    failedAutomationActions,
    openAutomationConflicts,
    openRoleDrift,
    enabledAutomationDefinitions,
    failedGatewayEvents,
    applicationCatalogCount,
    enabledApplicationCatalogCount,
    applicationPolicyCount,
    pendingApplicationReviews,
    activeApplicationSessions,
    failedModerationActions,
    duplicateIdentityCount,
    skippedBotCount,
    missingResourceMappings,
  ] = await Promise.all([
    prisma.discordServer.findMany({
      include: {
        _count: {
          select: {
            channelMappings: true,
            discoveredChannels: true,
            discoveredRoles: true,
            memberStates: true,
            roleMappings: true,
          },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    }),
    prisma.discordChannelMapping.count({
      where: {
        isActive: true,
      },
    }),
    prisma.discordRoleMapping.count({
      where: {
        isActive: true,
      },
    }),
    prisma.communicationDelivery.count({
      where: {
        channelType: "discord_channel",
        status: "failed",
      },
    }),
    prisma.communicationDelivery.count({
      where: {
        channelType: "discord_channel",
        status: {
          in: ["pending", "processing", "retrying"],
        },
      },
    }),
    prisma.discordAutomationActionExecution.count({
      where: {
        status: "failed",
      },
    }),
    prisma.discordAutomationConflict.count({
      where: {
        status: "open",
      },
    }),
    prisma.discordRoleDrift.count({
      where: {
        status: "open",
      },
    }),
    prisma.discordAutomationDefinition.count({
      where: {
        archivedAt: null,
        enabled: true,
      },
    }),
    prisma.discordGatewayEventLog.count({
      where: {
        status: "failed",
      },
    }),
    prisma.discordApplicationCatalogEntry.count(),
    prisma.discordApplicationCatalogEntry.count({
      where: {
        isEnabled: true,
        maintenanceMode: false,
      },
    }),
    prisma.discordApplicationGuildPolicy.count({
      where: {
        applicationIntegrationEnabled: true,
      },
    }),
    prisma.formSubmission.count({
      where: {
        status: {
          isTerminal: false,
        },
        template: {
          formType: {
            in: ["recruit_application", "rasp_application", "unit_transfer_request"],
          },
        },
      },
    }),
    prisma.discordInteractionSession.count({
      where: {
        status: "ACTIVE",
        workflowType: "APPLICATION_START",
      },
    }),
    prisma.discordModerationAction.count({
      where: {
        result: "failed",
      },
    }),
    prisma.user.groupBy({
      by: ["discordId"],
      where: {
        discordId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      having: {
        discordId: {
          _count: {
            gt: 1,
          },
        },
      },
    }),
    prisma.discordSyncLog.aggregate({
      _sum: {
        skippedBotCount: true,
      },
    }),
    prisma.discordChannelMapping.count({
      where: {
        isActive: true,
        discordServer: {
          discoveredChannels: {
            none: {
              isArchived: false,
            },
          },
        },
      },
    }),
  ]);
  const activeServers = servers.filter((server) => server.isActive && !server.archivedAt);
  const primaryServers = activeServers.filter((server) => server.isPrimary);
  const staleDiscoveryCount = activeServers.filter((server) => {
    if (!server.lastDiscoveryAt) {
      return true;
    }

    const ageMs = Date.now() - server.lastDiscoveryAt.getTime();

    return ageMs > 1000 * 60 * 60 * 24 * 30;
  }).length;
  const preflightChecks: DiscordPlatformPreflightCheck[] = [
    check({
      actionHref: "#discord-settings",
      category: "Configuration",
      id: "discord.config.application",
      recommendation: "Set Discord application, bot, OAuth, and public-key environment variables.",
      status:
        safeConfig.applicationIdPresent &&
        safeConfig.botTokenPresent &&
        safeConfig.clientIdPresent &&
        safeConfig.clientSecretPresent &&
        safeConfig.publicKeyPresent
          ? "pass"
          : "fail",
      summary: "Required Discord environment variables are present.",
    }),
    check({
      actionHref: "#discord-diagnostics",
      category: "Interactions",
      id: "discord.interactions.public_endpoint",
      recommendation: "Use a public HTTPS tunnel locally or production HTTPS URL for Discord interactions.",
      status:
        safeConfig.requiredForInteractionWebhook.publicKey &&
        safeConfig.requiredForInteractionWebhook.reachableHttpsUrl
          ? "pass"
          : safeConfig.publicKeyPresent
            ? "warn"
            : "fail",
      summary: "Interaction webhook can validate signatures and is reachable by Discord.",
    }),
    check({
      actionHref: "#discord-guilds",
      category: "Guilds",
      id: "discord.guild.primary",
      recommendation: "Bootstrap exactly one active Primary Community Guild.",
      status: primaryServers.length === 1 ? "pass" : "fail",
      summary: `Primary active guild count: ${primaryServers.length}.`,
    }),
    check({
      actionHref: "#communications-routing",
      category: "Mappings",
      id: "discord.mappings.channels",
      recommendation: "Create explicit channel mappings for each enabled communication workflow.",
      status: activeServers.length === 0 ? "skip" : channelMappingCount > 0 ? "pass" : "warn",
      summary: `${channelMappingCount} active Discord channel mapping${channelMappingCount === 1 ? "" : "s"} configured.`,
    }),
    check({
      actionHref: "#role-mappings",
      category: "Automation",
      id: "discord.mappings.roles",
      recommendation: "Keep role automation in preview until discovered roles and explicit role mappings are configured.",
      status:
        enabledAutomationDefinitions === 0
          ? "skip"
          : roleMappingCount > 0
            ? "pass"
            : "fail",
      summary: `${roleMappingCount} active role mapping${roleMappingCount === 1 ? "" : "s"} for ${enabledAutomationDefinitions} enabled automation definition${enabledAutomationDefinitions === 1 ? "" : "s"}.`,
    }),
    check({
      actionHref: "#discord-gateway",
      category: "Gateway",
      id: "discord.gateway.optional",
      recommendation: "Gateway is optional for slash commands; start the worker only for observation features.",
      status: gatewayHealth.enabled ? (gatewayHealth.status === "connected" ? "pass" : "warn") : "skip",
      summary: `Gateway status is ${gatewayHealth.status}.`,
    }),
    check({
      actionHref: "#discord-application-integration",
      category: "Applications",
      id: "discord.applications.catalog",
      recommendation: "Enable catalog entries only when matching Portal form templates and review mappings exist.",
      status:
        applicationCatalogCount === 0
          ? "warn"
          : enabledApplicationCatalogCount > 0 && applicationPolicyCount > 0
            ? "pass"
            : "warn",
      summary: `${enabledApplicationCatalogCount} active application catalog entries and ${applicationPolicyCount} enabled guild polic${applicationPolicyCount === 1 ? "y" : "ies"}.`,
    }),
    check({
      actionHref: "#discord-identity-sync",
      category: "Identity",
      id: "discord.identity.duplicates",
      recommendation: "Resolve exact Discord ID duplicates before enabling affected workflows.",
      status: duplicateIdentityCount.length > 0 ? "fail" : "pass",
      summary: `${duplicateIdentityCount.length} exact Discord ID duplicate group${duplicateIdentityCount.length === 1 ? "" : "s"} detected. Bots skipped historically: ${skippedBotCount._sum.skippedBotCount ?? 0}.`,
    }),
    check({
      actionHref: "#discord-reconciliation",
      category: "Resources",
      id: "discord.resources.discovery",
      recommendation: "Run discovery before certification and after major Discord changes.",
      status: activeServers.length === 0 ? "skip" : staleDiscoveryCount > 0 ? "warn" : "pass",
      summary: `${staleDiscoveryCount} active guild${staleDiscoveryCount === 1 ? "" : "s"} have stale or missing discovery.`,
    }),
    check({
      actionHref: "#discord-deliveries",
      category: "Deliveries",
      id: "discord.deliveries.failures",
      recommendation: "Review failed deliveries and retry only after mapping or permission issues are corrected.",
      status: failedDeliveries > 0 ? "warn" : "pass",
      summary: `${failedDeliveries} failed and ${pendingDeliveries} pending Discord communication deliver${failedDeliveries === 1 ? "y" : "ies"}.`,
    }),
  ];
  const componentStatuses: DiscordPlatformComponentStatus[] = [
    component({
      actionHref: "#discord-settings",
      component: "OAuth",
      details: [
        `Client ID present: ${botHealth.oauthConfigured ? "yes" : "no"}`,
        "OAuth login is independent from Gateway.",
      ],
      optional: false,
      severity: botHealth.oauthConfigured ? "success" : "danger",
      status: botHealth.oauthConfigured ? "healthy" : "not_configured",
      summary: botHealth.oauthConfigured ? "Discord OAuth is configured." : "Discord OAuth credentials are incomplete.",
    }),
    component({
      actionHref: "#discord-diagnostics",
      component: "Interaction Webhook",
      details: [
        `Public key present: ${safeConfig.publicKeyPresent ? "yes" : "no"}`,
        `Reachable HTTPS URL: ${safeConfig.requiredForInteractionWebhook.reachableHttpsUrl ? "yes" : "no"}`,
      ],
      optional: false,
      severity: safeConfig.requiredForInteractionWebhook.publicKey ? "success" : "danger",
      status:
        safeConfig.requiredForInteractionWebhook.publicKey &&
        safeConfig.requiredForInteractionWebhook.reachableHttpsUrl
          ? "healthy"
          : safeConfig.publicKeyPresent
            ? "healthy_with_warnings"
            : "blocked",
      summary: "Slash commands, buttons, select menus, and modals use the interaction webhook.",
    }),
    component({
      actionHref: "#discord-guilds",
      component: "Guild Availability",
      details: [
        `${activeServers.length} active managed guilds.`,
        `${primaryServers.length} active Primary Community Guilds.`,
      ],
      optional: false,
      severity: primaryServers.length === 1 ? "success" : "danger",
      status: activeServers.length === 0 ? "not_configured" : primaryServers.length === 1 ? "healthy" : "blocked",
      summary: "Multi-guild management requires exactly one active Primary Community Guild.",
    }),
    component({
      actionHref: "#communications-routing",
      component: "Communications",
      details: [
        `${channelMappingCount} active channel mappings.`,
        `${failedDeliveries} failed deliveries.`,
      ],
      optional: false,
      severity: failedDeliveries > 0 || channelMappingCount === 0 ? "warning" : "success",
      status:
        channelMappingCount === 0
          ? "healthy_with_warnings"
          : failedDeliveries > 0
            ? "degraded"
            : "healthy",
      summary: "Discord communication delivery is domain-routed through explicit mappings.",
    }),
    component({
      actionHref: "#discord-gateway",
      component: "Gateway",
      details: [
        `Enabled: ${gatewayHealth.enabled ? "yes" : "no"}`,
        `Failed queued events: ${failedGatewayEvents}.`,
      ],
      optional: true,
      severity: gatewayHealth.enabled ? (gatewayHealth.status === "connected" ? "success" : "warning") : "muted",
      status: gatewayHealth.enabled ? (gatewayHealth.status === "connected" ? "healthy" : "degraded") : "disabled",
      summary: "Gateway is optional for webhook commands and provides real-time observation only.",
    }),
    component({
      actionHref: "#discord-automation",
      component: "Automation",
      details: [
        `${enabledAutomationDefinitions} enabled definitions.`,
        `${failedAutomationActions} failed actions.`,
        `${openAutomationConflicts} open conflicts and ${openRoleDrift} open role drift items.`,
      ],
      optional: true,
      severity:
        failedAutomationActions > 0 || openAutomationConflicts > 0
          ? "warning"
          : enabledAutomationDefinitions > 0
            ? "success"
            : "muted",
      status:
        enabledAutomationDefinitions === 0
          ? "disabled"
          : failedAutomationActions > 0 || openAutomationConflicts > 0
            ? "degraded"
            : "healthy",
      summary: "Discord automation should remain preview/manual until role mappings and hierarchy are validated.",
    }),
    component({
      actionHref: "#discord-applications",
      component: "Applications",
      details: [
        `${enabledApplicationCatalogCount} active catalog entries.`,
        `${pendingApplicationReviews} pending current application reviews.`,
        `${activeApplicationSessions} active application continuation sessions.`,
      ],
      optional: true,
      severity: enabledApplicationCatalogCount > 0 ? "success" : "muted",
      status: enabledApplicationCatalogCount > 0 ? "healthy" : "disabled",
      summary: "Discord exposes application entry and review notifications while Portal owns forms and decisions.",
    }),
    component({
      actionHref: "#discord-moderation",
      component: "Moderation",
      details: [`${failedModerationActions} failed moderation actions.`],
      optional: true,
      severity: failedModerationActions > 0 ? "warning" : "muted",
      status: failedModerationActions > 0 ? "degraded" : "healthy_with_warnings",
      summary: "Moderation actions must remain case-backed and permission-controlled.",
    }),
    component({
      actionHref: "#discord-reconciliation",
      component: "Resource Discovery",
      details: [
        `${staleDiscoveryCount} stale or undiscovered active guilds.`,
        `${missingResourceMappings} mappings require discovery validation.`,
      ],
      optional: false,
      severity: staleDiscoveryCount > 0 || missingResourceMappings > 0 ? "warning" : "success",
      status: staleDiscoveryCount > 0 || missingResourceMappings > 0 ? "healthy_with_warnings" : "healthy",
      summary: "Mappings remain ID-based; discovery verifies renamed or deleted resources.",
    }),
  ];
  const guildCertifications = activeServers.map((server) => {
    const staleDiscovery = !server.lastDiscoveryAt || Date.now() - server.lastDiscoveryAt.getTime() > 1000 * 60 * 60 * 24 * 30;
    const capabilities: DiscordGuildCapabilityCertification[] = [
      {
        key: "member_sync",
        label: "Member Sync",
        state: server.memberSyncPolicy === "disabled" ? "disabled" : server._count.memberStates > 0 ? "ready" : "ready_with_warnings",
        summary: server._count.memberStates > 0 ? "Member state exists." : "No imported member state yet.",
      },
      {
        key: "communications",
        label: "Communications",
        state: server._count.channelMappings > 0 ? "ready" : "not_ready",
        summary: `${server._count.channelMappings} active channel mapping${server._count.channelMappings === 1 ? "" : "s"}.`,
      },
      {
        key: "role_automation",
        label: "Role Automation",
        state: server.roleSyncPolicy === "disabled" ? "disabled" : server._count.roleMappings > 0 ? "ready_with_warnings" : "not_ready",
        summary: `${server._count.roleMappings} role mapping${server._count.roleMappings === 1 ? "" : "s"} configured.`,
      },
      {
        key: "resources",
        label: "Resource Discovery",
        state: staleDiscovery ? "expired" : "ready",
        summary: staleDiscovery ? "Discovery is missing or older than 30 days." : "Recent discovery exists.",
      },
      {
        key: "gateway",
        label: "Gateway",
        state: server.gatewayEnabled ? (server.gatewayStatus === "connected" ? "ready" : "ready_with_warnings") : "disabled",
        summary: `Gateway status is ${server.gatewayStatus}.`,
      },
      {
        key: "moderation",
        label: "Moderation",
        state: server.moderationEnabled ? "ready_with_warnings" : "disabled",
        summary: server.moderationEnabled ? "Moderation is enabled; verify case-backed action policies." : "Moderation is disabled.",
      },
    ];
    const state = certificationFromCapabilityStates(capabilities);

    return {
      capabilities,
      guildId: server.guildId,
      guildName: server.name,
      serverId: server.id,
      state,
      summary: `${server.name} certification is ${state.replaceAll("_", " ")}.`,
    };
  });
  const featureCertifications: DiscordFeatureCertification[] = [
    {
      dependencies: ["OAuth", "Interaction Webhook", "Command Registration"],
      key: "slash_commands",
      label: "Slash Commands",
      state: stateFromChecks(preflightChecks.filter((entry) => ["discord.config.application", "discord.interactions.public_endpoint"].includes(entry.id))) === "healthy" ? "ready" : "not_ready",
      summary: "Slash commands are webhook-first; Gateway is not required.",
    },
    {
      dependencies: ["Channel Mappings", "Communication Provider", "Notification Delivery"],
      key: "communications",
      label: "Multi-Guild Communications",
      state: channelMappingCount > 0 && failedDeliveries === 0 ? "ready" : channelMappingCount > 0 ? "ready_with_warnings" : "not_ready",
      summary: "Communication routing depends on explicit active mappings.",
    },
    {
      dependencies: ["Role Mappings", "REST", "Automation Definitions", "Portal Permissions"],
      key: "role_automation",
      label: "Role Automation",
      state: enabledAutomationDefinitions === 0 ? "disabled" : failedAutomationActions > 0 || roleMappingCount === 0 ? "not_ready" : "ready_with_warnings",
      summary: "Keep automation preview/manual until hierarchy and mappings are validated.",
    },
    {
      dependencies: ["Application Catalog", "Interaction Webhook", "Portal FormTemplate", "Review Mapping"],
      key: "applications",
      label: "Application Integration",
      state: enabledApplicationCatalogCount > 0 ? "ready_with_warnings" : "disabled",
      summary: "Discord application entry points are ready when Portal forms and review mappings are configured.",
    },
    {
      dependencies: ["Case Engine", "REST", "Guild Policy", "Hierarchy"],
      key: "moderation",
      label: "Moderation",
      state: failedModerationActions > 0 ? "not_ready" : "ready_with_warnings",
      summary: "Moderation requires safe test validation before production execution.",
    },
    {
      dependencies: ["Event Policy", "REST", "Portal Event", "Channel Capability"],
      key: "scheduled_events",
      label: "Scheduled Events",
      state: "ready_with_warnings",
      summary: "Scheduled Event readiness requires per-guild Manage Events validation.",
    },
  ];
  const releaseBlockers = [
    ...(primaryServers.length !== 1
      ? [
          {
            actionHref: "#discord-guilds",
            severity: "critical" as const,
            summary: "Phase 4 requires exactly one active Primary Community Guild.",
            title: "Primary Community Guild is not uniquely configured",
          },
        ]
      : []),
    ...(duplicateIdentityCount.length > 0
      ? [
          {
            actionHref: "#discord-identity-sync",
            severity: "critical" as const,
            summary: "Exact Discord ID duplicates can create unsafe personnel, application, and automation behavior.",
            title: "Duplicate Discord identities detected",
          },
        ]
      : []),
    ...(!safeConfig.publicKeyPresent
      ? [
          {
            actionHref: "#discord-diagnostics",
            severity: "critical" as const,
            summary: "Discord interactions cannot safely validate signatures without DISCORD_PUBLIC_KEY.",
            title: "Interaction signature validation is not configured",
          },
        ]
      : []),
    ...(enabledAutomationDefinitions > 0 && roleMappingCount === 0
      ? [
          {
            actionHref: "#discord-automation",
            severity: "high" as const,
            summary: "Enabled role automation without explicit role mappings is unsafe for rollout.",
            title: "Automation enabled without role mappings",
          },
        ]
      : []),
  ];
  const overallStatus = getOverallStatus(componentStatuses);

  return {
    componentStatuses,
    dependencyProfiles: discordDependencyProfiles,
    featureCertifications,
    guildCertifications,
    overall: {
      status: releaseBlockers.length > 0 ? "blocked" : overallStatus,
      summary: releaseBlockers.length > 0 ? "Release blockers remain in Discord platform readiness." : getStatusSummary(overallStatus),
    },
    preflightChecks,
    releaseBlockers,
  };
}
