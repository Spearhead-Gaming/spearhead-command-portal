import type { campaignStatusCatalog } from "@/server/database/catalogs";

export type CampaignStatusKey = (typeof campaignStatusCatalog)[number];

export type CampaignFilters = {
  q?: string;
  status?: CampaignStatusKey | "";
  unitId?: string;
};

export type CampaignOption = {
  id: string;
  label: string;
  key?: string;
  hint?: string | null;
};

export type CampaignTimelineEvent = {
  id: string;
  title: string;
  eventType: string;
  eventTypeLabel: string;
  status: string;
  statusLabel: string;
  missionStatus: string;
  missionStatusLabel: string;
  startsAt: Date;
  endsAt: Date | null;
  hostUnit: {
    id: string;
    key: string;
    name: string;
    shortName: string;
  } | null;
  attendanceLocked: boolean;
  attendanceRate: number | null;
  missingRsvpCount: number;
  conopCount: number;
  publishedConopCount: number;
  latestConopStatusLabel: string | null;
  aarCount: number;
  reviewedAarCount: number;
  latestAarStatusLabel: string | null;
  latestAarProgressionRecommendation: string | null;
  latestAarNextVersionRecommendation: string | null;
  latestAarProgressionDecision: string | null;
  latestAarProgressionNotes: string | null;
  latestAarPlanningNotesNextWeek: string | null;
  deploymentWeek: number | null;
  operationVersionLabel: string | null;
  selectedOperationVersion: string | null;
  taskingStatus: string | null;
  unitTaskingCount: number;
};

export type CampaignListItem = {
  id: string;
  key: string;
  title: string;
  summary: string | null;
  status: string;
  statusLabel: string;
  phase: string | null;
  publishedAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  archivedAt: Date | null;
  updatedAt: Date;
  participatingUnits: Array<{
    id: string;
    key: string;
    name: string;
    shortName: string;
  }>;
  deploymentDurationWeeks: number | null;
  zeusAssignmentType: string;
  zeusUserId: string | null;
  zeusName: string | null;
  nextEvent: CampaignTimelineEvent | null;
  totalEvents: number;
  completedEvents: number;
  upcomingEvents: number;
  progressPercent: number | null;
  attendanceRate: number | null;
};

export type CampaignOperationalWeek = {
  weekNumber: number;
  planningStatus: string;
  statusLabel: string;
  statusTone: "info" | "success" | "warning" | "danger" | "muted";
  weekendOperation: CampaignTimelineEvent | null;
  patrols: CampaignTimelineEvent[];
  events: CampaignTimelineEvent[];
  taskingStatus: string | null;
  unitTaskingCount: number;
  attendanceRate: number | null;
  discordStatusLabel: string;
};

export type CampaignListData = {
  campaigns: CampaignListItem[];
  groupedCampaigns: Array<{
    status: string;
    statusLabel: string;
    items: CampaignListItem[];
  }>;
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    planningCampaigns: number;
    completedCampaigns: number;
    archivedCampaigns: number;
  };
};

export type CampaignDetail = CampaignListItem & {
  timeline: CampaignTimelineEvent[];
  operationalWeeks: CampaignOperationalWeek[];
  upcomingOperations: CampaignTimelineEvent[];
  completedOperations: CampaignTimelineEvent[];
};

export type CampaignReferenceData = {
  statuses: Array<{
    key: CampaignStatusKey;
    label: string;
    description: string;
  }>;
  units: CampaignOption[];
  events: CampaignOption[];
};

export type CampaignSummaryCard = {
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  phase: string | null;
  progressPercent: number | null;
  nextEvent: CampaignTimelineEvent | null;
};

export type UnitCampaignParticipationSummary = {
  unitId: string;
  campaigns: CampaignSummaryCard[];
  activeCount: number;
  upcomingEventCount: number;
  attendanceRate: number | null;
};

export type DashboardCampaignWidgetData = {
  currentCampaign: CampaignSummaryCard | null;
};
