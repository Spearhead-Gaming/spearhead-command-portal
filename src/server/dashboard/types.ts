export type DashboardTone = "info" | "success" | "warning" | "danger" | "muted";

export type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
  tone: DashboardTone;
  trend?: string;
};

export type DashboardListItem = {
  id: string;
  href?: string;
  label: string;
  meta: string;
  statusLabel?: string;
  tone?: DashboardTone;
};

export type DashboardReadiness = {
  attendancePercent: number | null;
  campaignPercent: number | null;
  memberPercent: number | null;
  qualificationPercent: number | null;
  unitPercent: number | null;
};

export type DashboardActivityItem = {
  id: string;
  action: string;
  createdAt: Date;
  entityType: string;
  href?: string;
  summary: string;
  tone: DashboardTone;
};

export type DashboardWidgetSize = "sm" | "md" | "lg" | "xl";

export type DashboardWidgetDefinition = {
  collapsedByDefault: boolean;
  dataProvider: string;
  icon: string;
  id: string;
  permissions: string[];
  priority: number;
  refreshIntervalSeconds: number | null;
  size: DashboardWidgetSize;
  title: string;
};

export type OperationsCenterWidgetId =
  | "command-banner"
  | "deployment-summary"
  | "operational-health"
  | "operational-readiness"
  | "command-recommendations"
  | "patrol-operations"
  | "pending-publications"
  | "personnel-readiness"
  | "personnel-unit-strength"
  | "personnel-member-readiness"
  | "personnel-unit-readiness"
  | "personnel-missing-qualifications"
  | "personnel-expiring-qualifications"
  | "personnel-attendance-concerns"
  | "personnel-vacant-positions"
  | "personnel-pending-actions"
  | "personnel-loa-returns"
  | "personnel-recent-activity"
  | "notification-center"
  | "communications-unread"
  | "communications-failed-deliveries"
  | "communications-announcements"
  | "communications-discord-health"
  | "discord-gateway-health"
  | "discord-bot-connection"
  | "discord-guild-availability"
  | "discord-recent-member-joins"
  | "discord-recent-member-leaves"
  | "discord-voice-awareness"
  | "discord-role-sync-health"
  | "discord-gateway-error-queue"
  | "community-open-cases"
  | "community-critical-cases"
  | "community-pending-appeals"
  | "community-overdue-cases"
  | "community-staff-workload"
  | "community-failed-moderation"
  | "activity-feed"
  | "deployment-timeline";

export type OperationsCenterQuickAction = {
  href: string;
  id: string;
  label: string;
  primary?: boolean;
  requiredPermissions?: string[];
};

export type OperationsCenterTimelineItem = {
  href?: string;
  id: string;
  label: string;
  meta: string;
  timestamp: Date | null;
  tone: DashboardTone;
  type: string;
};

export type OperationsCenterDashboardData = {
  activityFeed: DashboardActivityItem[];
  currentPackage: import("@/server/operations-package/types").OperationsPackageData | null;
  dashboard: CommandDashboardData;
  lastRefreshedAt: Date;
  notificationCenter: import("@/server/notifications/types").NotificationCenterData;
  notificationDeliveryOverview: import("@/server/notifications/types").NotificationDeliveryOverview;
  patrolDashboard: import("@/server/patrols/types").PatrolDashboardData | null;
  quickActions: OperationsCenterQuickAction[];
  s3Dashboard: import("@/server/s3/types").S3DashboardData;
  timeline: OperationsCenterTimelineItem[];
  widgets: DashboardWidgetDefinition[];
};

export type CommandDashboardData = {
  visibility: {
    admin: boolean;
    attendance: boolean;
    audit: boolean;
    campaigns: boolean;
    discordHealth: boolean;
    member: boolean;
    notifications: boolean;
    personnel: boolean;
    qualificationMatrix: boolean;
    qualifications: boolean;
    roster: boolean;
    s3: boolean;
    units: boolean;
  };
  community: {
    activeCampaigns: number;
    activeMembers: number;
    attendanceAverage: number | null;
    discordHealthLabel: string;
    failedNotifications: number;
    inactiveMembers: number;
    loaMembers: number;
    pendingForms: number;
    qualificationReadiness: number | null;
    totalMembers: number;
    unitStrength: DashboardListItem[];
    upcomingEvents: DashboardListItem[];
  };
  member: {
    attendancePercent: number | null;
    campaignLabel: string;
    currentModPreset: DashboardListItem | null;
    discordLinked: boolean;
    missingRequiredQualifications: number;
    nextEvent: DashboardListItem | null;
    profileLinked: boolean;
    qualificationCount: number;
    unitLabel: string | null;
  };
  unitLeadership: {
    attendanceIssues: DashboardListItem[];
    missingQualifications: DashboardListItem[];
    recentRosterChanges: DashboardActivityItem[];
    unitReadiness: DashboardListItem[];
  };
  personnel: {
    pendingApplications: number;
    recentChanges: DashboardActivityItem[];
    statusBreakdown: DashboardListItem[];
    unlinkedUsers: number;
  };
  s3: {
    activeCampaigns: DashboardListItem[];
    aarQueue: number;
    approvedUnpublishedMissions: number;
    conopReviewQueue: number;
    missionReviewQueue: number;
    upcomingMissions: DashboardListItem[];
  };
  training: {
    expiringSoon: number;
    missingRequired: number;
    pendingSignoffs: number;
    qualifiedMemberCount: number;
    totalQualifications: number;
    unitQualificationReadiness: DashboardListItem[];
  };
  attendance: {
    averageAttendance: number | null;
    lowAttendanceMembers: DashboardListItem[];
    missingRsvps: number;
    openAttendanceEvents: DashboardListItem[];
    recentNoShows: DashboardListItem[];
  };
  admin: {
    auditActivity: DashboardActivityItem[];
    discordConnectedServers: number;
    discordStatusLabel: string;
    failedDeliveries: DashboardListItem[];
    pendingSystemActions: DashboardListItem[];
  };
  readiness: DashboardReadiness;
};
