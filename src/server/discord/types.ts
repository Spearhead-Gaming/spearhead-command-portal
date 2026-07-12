import type { NotificationDeliveryStatus } from "@/server/notifications/constants";
import type { DiscordGatewayHealthSummary } from "@/server/discord/gateway/types";
import type { DiscordAutomationOverview } from "@/server/discord/automation/queries";
import type { CommunicationPlatformOverview } from "@/server/communications/health";
import type { DiscordPlatformReadiness } from "@/server/discord/readiness";

import type {
  DiscordChannelMappingKey,
  DiscordMessageVisibility,
  DiscordRoleMappingType,
} from "@/server/discord/constants";

export type DiscordMessageField = {
  label: string;
  value: string;
};

export type DiscordMessageAction = {
  customId?: string;
  label: string;
  style: "primary" | "secondary" | "danger" | "link" | "success";
  url?: string | null;
};

export type DiscordMessagePayload = {
  title: string;
  body: string;
  footer?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
  fields?: DiscordMessageField[];
  actions?: DiscordMessageAction[];
  visibility: DiscordMessageVisibility;
};

export type DiscordBotHealthSummary = {
  applicationIdConfigured: boolean;
  botTokenConfigured: boolean;
  commandRegistrationMode: "guild" | "global";
  commandRegistrationReady: boolean;
  devGuildConfigured: boolean;
  interactionsUrlConfigured: boolean;
  interactionsUrlIsLocalhost: boolean;
  interactionValidationReady: boolean;
  oauthConfigured: boolean;
  publicKeyConfigured: boolean;
  statusLabel: string;
  summaryTone: "info" | "success" | "warning" | "danger" | "muted";
};

export type DiscordServerAdminItem = {
  channelMappingCount: number;
  discoveredChannelCount: number;
  discoveredRoleCount: number;
  guildType: string;
  guildId: string;
  gatewayEnabled: boolean;
  gatewayStatus: string;
  healthScore: number;
  id: string;
  interactionStatus: string;
  isActive: boolean;
  isPrimary: boolean;
  lastDiscoveryAtLabel: string | null;
  lastSyncAtLabel: string | null;
  memberSyncPolicy: string;
  name: string;
  restStatus: string;
  recommendations: DiscordOperationsRecommendation[];
  nicknameSyncPolicy: string;
  roleSyncPolicy: string;
  status: string;
  unitId: string | null;
  unitName: string | null;
  updatedAtLabel: string;
  voiceAwarenessEnabled: boolean;
};

export type DiscordChannelMappingAdminItem = {
  channelId: string;
  description: string | null;
  id: string;
  isActive: boolean;
  key: DiscordChannelMappingKey;
  latestDeliveryStatus: NotificationDeliveryStatus | null;
  serverId: string;
  serverName: string;
  serverUnitName: string | null;
  updatedAtLabel: string;
};

export type DiscordDeliveryAdminItem = {
  channelType: "discord_channel" | "discord_dm";
  destinationKey: string;
  errorMessage: string | null;
  id: string;
  mappingKey: string | null;
  notificationTitle: string;
  recipientLabel: string | null;
  serverName: string | null;
  status: NotificationDeliveryStatus;
  updatedAtLabel: string;
};

export type DiscordAdministrationOverview = {
  automation: DiscordAutomationOverview;
  botHealth: DiscordBotHealthSummary;
  canApproveAutomation: boolean;
  canExecuteAutomation: boolean;
  canManageAutomation: boolean;
  canManageReconciliation: boolean;
  canMergeIdentities: boolean;
  canManageChannels: boolean;
  canManageDiscordAdmin: boolean;
  canModerateKick: boolean;
  canManageRoleMappings: boolean;
  canRunMemberSync: boolean;
  canManageServers: boolean;
  canSendNotifications: boolean;
  canRunSync: boolean;
  canViewIdentity: boolean;
  canViewMembers: boolean;
  canViewModerationHistory: boolean;
  canViewModerationPlatform: boolean;
  canManageModerationPlatform: boolean;
  canViewSync: boolean;
  canViewBotHealth: boolean;
  canViewDeliveries: boolean;
  canViewGateway: boolean;
  canViewReconciliation: boolean;
  canRunDiscovery: boolean;
  canViewDiscovery: boolean;
  canViewAutomation: boolean;
  canManageGateway: boolean;
  canViewDiscordEvents: boolean;
  canManageDiscordEvents: boolean;
  canViewDiscordApplications: boolean;
  canManageDiscordApplications: boolean;
  communications: CommunicationPlatformOverview;
  applicationIntegration: DiscordApplicationIntegrationAdminOverview;
  readiness: DiscordPlatformReadiness;
  eventManagement: DiscordEventManagementAdminOverview;
  moderationPlatform: DiscordModerationPlatformAdminOverview;
  discovery: DiscordDiscoveryAdminOverview;
  gatewayHealth: DiscordGatewayHealthSummary | null;
  guildChannels: DiscordGuildChannelAdminItem[];
  guildEmojis: DiscordGuildEmojiAdminItem[];
  guildEvents: DiscordGuildEventAdminItem[];
  guildRoles: DiscordGuildRoleAdminItem[];
  guildStickers: DiscordGuildStickerAdminItem[];
  platform: DiscordPlatformAdminSummary;
  channelMappings: DiscordChannelMappingAdminItem[];
  deliveries: DiscordDeliveryAdminItem[];
  failedDeliveryCount: number;
  guildMembers: DiscordGuildMemberStateAdminItem[];
  identityDiagnostics: DiscordIdentityDiagnosticsAdmin | null;
  identitySummary: DiscordIdentitySummary;
  interactionSessions: DiscordInteractionSessionDiagnosticsAdmin;
  moderationActions: DiscordModerationActionAdminItem[];
  recentActivity: DiscordRecentActivityItem[];
  roleMappings: DiscordRoleMappingAdminItem[];
  roleSyncPreview: DiscordRoleSyncPreview | null;
  sentDeliveryCount: number;
  servers: DiscordServerAdminItem[];
  syncLogs: DiscordSyncLogAdminItem[];
  units: Array<{
    id: string;
    name: string;
    shortName: string;
  }>;
  ranks: Array<{
    abbreviation: string;
    id: string;
    label: string;
  }>;
  qualifications: Array<{
    id: string;
    label: string;
  }>;
  roles: Array<{
    id: string;
    label: string;
  }>;
};

export type DiscordApplicationIntegrationAdminOverview = {
  catalog: Array<{
    applicationTypeKey: string;
    availability: string;
    displayName: string;
    enabled: boolean;
    id: string;
    maintenanceMode: boolean;
    reviewDestination: string | null;
  }>;
  policies: Array<{
    commandAvailability: string;
    enabled: boolean;
    guildId: string;
    id: string;
    panelEnabled: boolean;
    portalOnlyReviewMode: boolean;
    reviewerQuickActionsEnabled: boolean;
    testingMode: boolean;
  }>;
  reviewMessages: Array<{
    applicationType: string;
    id: string;
    lastPublishedAtLabel: string | null;
    status: string;
    submissionId: string;
  }>;
  summary: {
    activeCatalogEntries: number;
    activeSessions: number;
    expiredTokens: number;
    pendingReviews: number;
    policyCount: number;
    reviewMessageCount: number;
  };
};

export type DiscordModerationPlatformAdminOverview = {
  actions: Array<{
    action: string;
    caseNumber: string | null;
    createdAtLabel: string;
    guildName: string;
    id: string;
    result: string;
    targetLabel: string;
  }>;
  approvals: Array<{
    approvalMode: string;
    caseId: string;
    id: string;
    requestedAtLabel: string;
    status: string;
  }>;
  observations: Array<{
    id: string;
    observationType: string;
    observedAtLabel: string;
    status: string;
    summary: string;
    targetDiscordUserId: string;
  }>;
  policies: Array<{
    banApprovalMode: string;
    crossGuildPolicy: string;
    guildId: string;
    id: string;
    isEnabled: boolean;
    kickApprovalMode: string;
    timeoutApprovalMode: string;
    timeoutMaxSeconds: number;
  }>;
  summary: {
    activeBanCount: number;
    activeTimeoutCount: number;
    failedActionCount: number;
    openCaseCount: number;
    pendingAppealCount: number;
    pendingApprovalCount: number;
    warningCount: number;
  };
};

export type DiscordEventManagementAdminOverview = {
  drifts: Array<{
    detectedAtLabel: string;
    id: string;
    severity: string;
    status: string;
    summary: string;
  }>;
  executions: Array<{
    actionCount: number;
    createdAtLabel: string;
    executionType: string;
    failedActionCount: number;
    id: string;
    status: string;
  }>;
  links: Array<{
    currentDiscordStatus: string | null;
    discordScheduledEventId: string | null;
    driftState: string;
    guildId: string;
    id: string;
    lastSynchronizedAtLabel: string | null;
    ownershipMode: string;
    portalEventId: string;
    portalEventType: string;
    synchronizationState: string;
  }>;
  observations: Array<{
    discordScheduledEventId: string;
    discordUserId: string;
    id: string;
    observedAtLabel: string;
    participationStatus: string;
    portalEventId: string | null;
  }>;
  plans: Array<{
    createdAtLabel: string;
    id: string;
    portalEventId: string;
    portalEventType: string;
    status: string;
    targetCount: number;
  }>;
  policies: Array<{
    defaultEntityType: string;
    eventType: string;
    guildId: string;
    id: string;
    integrationEnabled: boolean;
    manualApprovalRequired: boolean;
    previewRequired: boolean;
    testMode: boolean;
  }>;
  summary: {
    activePolicyCount: number;
    driftCount: number;
    linkedEventCount: number;
    partialFailureCount: number;
    pendingApprovalCount: number;
  };
};

export type DiscordDiscoveryAdminOverview = {
  reconciliationItems: DiscordReconciliationAdminItem[];
  schedules: DiscordSyncScheduleAdminItem[];
  sessions: DiscordDiscoverySessionAdminItem[];
};

export type DiscordOperationsRecommendation = {
  actionHref: string;
  actionLabel: string;
  description: string;
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
};

export type DiscordGuildChannelAdminItem = {
  channelId: string;
  channelType: string;
  guildId: string;
  id: string;
  isArchived: boolean;
  isMissing: boolean;
  lastSyncedAtLabel: string;
  lastSeenAtLabel: string;
  mappedKey: string | null;
  name: string;
  parentChannelId: string | null;
  position: number | null;
  serverId: string;
  serverName: string;
};

export type DiscordGuildRoleAdminItem = {
  botManageable: boolean;
  color: number | null;
  guildId: string;
  hoisted: boolean;
  id: string;
  isArchived: boolean;
  isMissing: boolean;
  lastSyncedAtLabel: string;
  lastSeenAtLabel: string;
  managed: boolean;
  mappedType: string | null;
  mentionable: boolean;
  name: string;
  position: number | null;
  roleId: string;
  serverId: string;
  serverName: string;
};

export type DiscordGuildEventAdminItem = {
  channelId: string | null;
  eventId: string;
  id: string;
  isArchived: boolean;
  isMissing: boolean;
  name: string;
  scheduledStartAtLabel: string | null;
  serverId: string;
  serverName: string;
  status: string;
};

export type DiscordGuildEmojiAdminItem = {
  animated: boolean;
  available: boolean;
  emojiId: string;
  id: string;
  isArchived: boolean;
  isMissing: boolean;
  name: string;
  serverId: string;
  serverName: string;
};

export type DiscordGuildStickerAdminItem = {
  available: boolean;
  formatType: string;
  id: string;
  isArchived: boolean;
  isMissing: boolean;
  name: string;
  serverId: string;
  serverName: string;
  stickerId: string;
};

export type DiscordDiscoverySessionAdminItem = {
  completedAtLabel: string | null;
  createdAtLabel: string;
  discoveryType: string;
  dryRun: boolean;
  id: string;
  resourcesFetched: number;
  resourcesMissing: number;
  resourcesUpdated: number;
  serverId: string;
  serverName: string;
  status: string;
  warningCount: number;
};

export type DiscordReconciliationAdminItem = {
  changeStatus: string;
  createdAtLabel: string;
  id: string;
  recommendedAction: string;
  resourceId: string;
  resourceType: string;
  serverId: string;
  serverName: string;
  severity: string;
  status: string;
  summary: string;
  title: string;
};

export type DiscordSyncScheduleAdminItem = {
  gatewayDriven: boolean;
  id: string;
  isEnabled: boolean;
  lastRunAtLabel: string | null;
  lastStatus: string | null;
  nextRunAtLabel: string | null;
  policy: string;
  serverId: string;
  serverName: string;
};

export type DiscordPlatformAdminSummary = {
  activeGuildCount: number;
  channelInventoryCount: number;
  healthIssueCount: number;
  latestDiscoveryAtLabel: string | null;
  primaryGuildName: string | null;
  roleInventoryCount: number;
  totalGuildCount: number;
};

export type DiscordInteractionSessionDiagnosticsAdmin = {
  activeCount: number;
  expiredCount: number;
  failedCount: number;
  recentFailed: Array<{
    commandName: string;
    currentStep: string;
    discordUserId: string;
    id: string;
    updatedAtLabel: string;
    workflowType: string;
  }>;
  ttlMinutes: number;
};

export type DiscordIdentitySummary = {
  botExclusionEnabled: boolean;
  botTokenPresent: boolean;
  devGuildConfigured: boolean;
  duplicateDiscordIdentityCount: number;
  importedMemberCount: number;
  interactionWebhookReady: boolean;
  lastSyncAtLabel: string | null;
  lastSyncError: string | null;
  lastSyncStatus: string | null;
  likelyDisplayNameDuplicateCount: number;
  linkedOAuthUserCount: number;
  publicInteractionUrlConfigured: boolean;
  skippedBotCount: number;
  totalDiscordLinkedUsers: number;
  unlinkedProfileCount: number;
};

export type DiscordIdentityDiagnosticsAdmin = {
  duplicateDiscordIdentities: Array<{
    discordUserId: string;
    suggestedCanonicalUserId: string | null;
    users: Array<{
      discordId: string | null;
      displayName: string;
      email: string | null;
      id: string;
      isActive: boolean;
      memberProfileId: string | null;
      memberProfileLabel: string | null;
      sources: string[];
    }>;
  }>;
  importedButNotLinked: Array<{
    discordUserId: string;
    displayName: string;
    id: string;
    lastSyncedAtLabel: string;
    serverName: string;
  }>;
  likelyDisplayNameDuplicates: Array<{
    displayName: string;
    profiles: Array<{
      id: string;
      userId: string | null;
    }>;
  }>;
  loggedInUsersWithoutProfile: Array<{
    discordUserId: string;
    displayName: string;
    id: string;
  }>;
  profilesWithoutDiscordIdentity: Array<{
    displayName: string;
    id: string;
    userId: string | null;
  }>;
};

export type UpsertDiscordServerMappingInput = {
  actorUserId: string;
  description?: string | null;
  gatewayEnabled?: boolean;
  guildType?: string | null;
  guildId: string;
  iconUrl?: string | null;
  id?: string;
  inviteUrl?: string | null;
  isActive: boolean;
  isPrimary: boolean;
  locale?: string | null;
  memberSyncPolicy?: string | null;
  name: string;
  nicknameSyncPolicy?: string | null;
  roleSyncPolicy?: string | null;
  shortName?: string | null;
  timezone?: string | null;
  unitId?: string | null;
  voiceAwarenessEnabled?: boolean;
};

export type UpsertDiscordChannelMappingInput = {
  actorUserId: string;
  channelId: string;
  description?: string | null;
  discordServerId: string;
  id?: string;
  isActive: boolean;
  key: DiscordChannelMappingKey;
};

export type DiscordGuildMemberStateAdminItem = {
  avatarUrl: string | null;
  discordServerId: string;
  discordUserId: string;
  displayName: string;
  guildId: string;
  id: string;
  isBot: boolean;
  joinedAtLabel: string | null;
  lastSyncedAtLabel: string;
  leftAtLabel: string | null;
  memberProfileId: string | null;
  profileLabel: string | null;
  serverName: string;
  syncStatus: string;
  username: string | null;
  userId: string | null;
};

export type DiscordSyncLogAdminItem = {
  actorLabel: string | null;
  completedAtLabel: string | null;
  errorMessage: string | null;
  id: string;
  importedCount: number;
  leftCount: number;
  scannedCount: number;
  serverName: string | null;
  skippedBotCount: number;
  startedAtLabel: string;
  status: string;
  syncType: string;
  updatedCount: number;
};

export type DiscordModerationActionAdminItem = {
  action: string;
  createdAtLabel: string;
  errorMessage: string | null;
  id: string;
  moderatorLabel: string | null;
  reason: string;
  result: string;
  serverName: string;
  targetDiscordUserId: string;
  targetLabel: string;
};

export type UpsertDiscordRoleMappingInput = {
  actorUserId: string;
  description?: string | null;
  discordRoleId: string;
  discordRoleName?: string | null;
  discordServerId: string;
  id?: string;
  isActive: boolean;
  mappingType: DiscordRoleMappingType;
  qualificationId?: string | null;
  rankId?: string | null;
  roleId?: string | null;
  unitId?: string | null;
};

export type DiscordDeliveryPlaceholderResult = {
  channelId?: string | null;
  deliveryId: string;
  errorMessage: string | null;
  providerMessageId: string | null;
  serverName?: string | null;
  status: NotificationDeliveryStatus;
};

export type DiscordEventAnnouncementStatus = {
  channelId: string | null;
  deliveryId: string | null;
  destinationKey: string | null;
  errorMessage: string | null;
  hasAnnouncement: boolean;
  mappedChannelId: string | null;
  mappedChannelKey: string;
  providerMessageId: string | null;
  serverName: string | null;
  status: NotificationDeliveryStatus | "not-sent";
  updatedAtLabel: string | null;
};

export type DiscordRoleMappingAdminItem = {
  description: string | null;
  discordRoleId: string;
  discordRoleName: string | null;
  id: string;
  isActive: boolean;
  mappingLabel: string;
  mappingType: DiscordRoleMappingType;
  qualificationId: string | null;
  rankId: string | null;
  roleId: string | null;
  serverId: string;
  serverName: string;
  unitId: string | null;
  updatedAtLabel: string;
};

export type DiscordRoleSyncMemberChange = {
  addRoleIds: string[];
  addRoleLabels: string[];
  currentRoleIds: string[];
  currentRoleLabels: string[];
  discordUserId: string;
  displayName: string;
  memberProfileId: string | null;
  portalRoleLabels: string[];
  qualificationLabels: string[];
  rankLabel: string | null;
  removeRoleIds: string[];
  removeRoleLabels: string[];
  unitLabel: string | null;
};

export type DiscordRoleSyncPreview = {
  generatedAtLabel: string;
  serverId: string;
  serverName: string;
  summary: {
    addOperations: number;
    membersEvaluated: number;
    removeOperations: number;
    touchedMembers: number;
  };
  changes: DiscordRoleSyncMemberChange[];
};

export type DiscordRoleSyncRunResult = {
  serverId: string;
  serverName: string;
  summary: {
    addOperations: number;
    failedOperations: number;
    membersProcessed: number;
    removeOperations: number;
  };
  results: Array<{
    addedRoleIds: string[];
    addedRoleLabels: string[];
    discordUserId: string;
    displayName: string;
    failedOperations: Array<{
      action: "add" | "remove";
      errorMessage: string;
      roleId: string;
      roleLabel: string;
    }>;
    removedRoleIds: string[];
    removedRoleLabels: string[];
  }>;
};

export type DiscordRecentActivityItem = {
  action: string;
  createdAtLabel: string;
  entityLabel: string;
  id: string;
  summary: string;
};
