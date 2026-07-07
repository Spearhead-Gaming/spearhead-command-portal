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
