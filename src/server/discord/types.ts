import type { NotificationDeliveryStatus } from "@/server/notifications/constants";

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
  guildId: string;
  id: string;
  isActive: boolean;
  isPrimary: boolean;
  name: string;
  unitId: string | null;
  unitName: string | null;
  updatedAtLabel: string;
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
  botHealth: DiscordBotHealthSummary;
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
  canViewSync: boolean;
  canViewBotHealth: boolean;
  canViewDeliveries: boolean;
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
  guildId: string;
  id?: string;
  isActive: boolean;
  isPrimary: boolean;
  name: string;
  unitId?: string | null;
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
