import type {
  aarStatusCatalog,
  conopStatusCatalog,
  eventTypeCatalog,
  missionStatusCatalog,
} from "@/server/database/catalogs";

export type MissionStatusKey = (typeof missionStatusCatalog)[number]["key"];
export type ConopStatusKey = (typeof conopStatusCatalog)[number]["key"];
export type AarStatusKey = (typeof aarStatusCatalog)[number]["key"];
export type S3EventTypeKey = (typeof eventTypeCatalog)[number]["key"];

export type S3Option = {
  id: string;
  label: string;
  key?: string;
  hint?: string | null;
};

export type MissionFilters = {
  q?: string;
  unitId?: string;
  campaignId?: string;
  missionStatus?: MissionStatusKey | "";
  eventType?: S3EventTypeKey | "";
  dateFrom?: string;
  dateTo?: string;
  missingConop?: boolean;
  missingAar?: boolean;
};

export type ConopFilters = {
  q?: string;
  eventId?: string;
  campaignId?: string;
  status?: ConopStatusKey | "";
};

export type AarFilters = {
  q?: string;
  eventId?: string;
  campaignId?: string;
  status?: AarStatusKey | "";
};

export type MissionListItem = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  eventTypeLabel: string;
  status: string;
  statusLabel: string;
  missionStatus: MissionStatusKey | string;
  missionStatusLabel: string;
  startsAt: Date;
  endsAt: Date | null;
  publishedAt: Date | null;
  hostUnit: {
    id: string;
    key: string;
    name: string;
    shortName: string;
  } | null;
  campaign: {
    id: string;
    key: string;
    title: string;
    status: string;
  } | null;
  missionMakerName: string | null;
  zeusName: string | null;
  missionCommanderName: string | null;
  operationVersionLabel: string | null;
  selectedOperationVersion: string | null;
  participatingUnitsSummary: string | null;
  conopCount: number;
  publishedConopCount: number;
  latestConopStatus: ConopStatusKey | string | null;
  latestConopStatusLabel: string | null;
  aarCount: number;
  reviewedAarCount: number;
  latestAarStatus: AarStatusKey | string | null;
  latestAarStatusLabel: string | null;
  aarRequired: boolean;
  aarSubmittedAt: Date | null;
  missingConop: boolean;
  missingAar: boolean;
  attendanceLocked: boolean;
  expectedAttendanceCount: number;
  rsvpCounts: {
    yes: number;
    no: number;
    maybe: number;
    missing: number;
  };
  finalAttendanceCounts: {
    present: number;
    absent: number;
    excused: number;
    late: number;
    loa: number;
    pending: number;
  };
};

export type MissionDetail = MissionListItem & {
  conops: ConopListItem[];
  aars: AarListItem[];
};

export type MissionListData = {
  missions: MissionListItem[];
  groupedMissions: Array<{
    status: MissionStatusKey | string;
    statusLabel: string;
    items: MissionListItem[];
  }>;
  summary: {
    totalMissions: number;
    draftMissions: number;
    reviewMissions: number;
    approvedMissions: number;
    publishedMissions: number;
    completedMissions: number;
    aarSubmittedMissions: number;
    archivedMissions: number;
    missionsMissingConop: number;
    missionsMissingAar: number;
  };
};

export type ConopListItem = {
  id: string;
  title: string;
  status: ConopStatusKey | string;
  statusLabel: string;
  publishedAt: Date | null;
  updatedAt: Date;
  event: {
    id: string;
    title: string;
    startsAt: Date;
    hostUnitShortName: string | null;
  } | null;
  campaign: {
    id: string;
    title: string;
    status: string;
  } | null;
  missionMakerName: string | null;
  zeusName: string | null;
  missionCommanderName: string | null;
};

export type ConopDetail = ConopListItem & {
  situation: string | null;
  mission: string | null;
  execution: string | null;
  sustainment: string | null;
  commandSignal: string | null;
  mapName: string | null;
  modPreset: string | null;
  participatingUnitsSummary: string | null;
  specialInstructions: string | null;
};

export type AarListItem = {
  id: string;
  title: string;
  status: AarStatusKey | string;
  statusLabel: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  updatedAt: Date;
  event: {
    id: string;
    title: string;
    startsAt: Date;
    hostUnitShortName: string | null;
  } | null;
  campaign: {
    id: string;
    title: string;
    status: string;
  } | null;
  reviewedByName: string | null;
  submittedByName: string | null;
  patrolLeaderName: string | null;
  hasMapScreenshot: boolean;
};

export type AarDetail = AarListItem & {
  summary: string | null;
  wentWell: string | null;
  needsImprovement: string | null;
  friendlyCasualties: string | null;
  enemyCasualties: string | null;
  equipmentLosses: string | null;
  actionItems: string | null;
  additionalNotes: string | null;
  dtg: string | null;
  tasking: string | null;
  callsigns: string | null;
  fkia: string | null;
  fwia: string | null;
  fmia: string | null;
  ekia: string | null;
  report: string | null;
  aarProgressionRecommendation: string | null;
  aarNextVersionRecommendation: string | null;
  aarProgressionDecision: string | null;
  aarProgressionNotes: string | null;
  aarEnemyActivityNotes: string | null;
  aarFriendlyActivityNotes: string | null;
  aarUnitPerformanceNotes: string | null;
  aarTaskingAdjustments: string | null;
  aarPlanningNotesNextWeek: string | null;
  aarLessonsLearned: string | null;
  attachments: Array<{
    attachmentType: string;
    createdAt: Date;
    downloadUrl: string;
    fileName: string;
    fileSizeBytes: number | null;
    id: string;
    label: string;
    mimeType: string;
  }>;
};

export type S3ReferenceData = {
  units: S3Option[];
  campaigns: S3Option[];
  events: S3Option[];
  missionStatuses: Array<{
    key: MissionStatusKey;
    label: string;
    description: string;
  }>;
  conopStatuses: Array<{
    key: ConopStatusKey;
    label: string;
    description: string;
  }>;
  aarStatuses: Array<{
    key: AarStatusKey;
    label: string;
    description: string;
  }>;
  eventTypes: Array<{
    key: S3EventTypeKey;
    label: string;
    description: string;
  }>;
};

export type S3DashboardData = {
  activeCampaigns: Array<{
    id: string;
    title: string;
    statusLabel: string;
    phase: string | null;
    progressPercent: number | null;
    nextEventTitle: string | null;
    currentWeekNumber: number | null;
    planningStatus: string;
    packageHref: string | null;
    releaseStatus: string | null;
    releaseVersion: string | null;
  }>;
  activePatrols: MissionListItem[];
  upcomingMissions: MissionListItem[];
  draftMissions: MissionListItem[];
  awaitingReviewMissions: MissionListItem[];
  approvedUnpublishedMissions: MissionListItem[];
  publishedMissions: MissionListItem[];
  conopsNeedingReview: ConopListItem[];
  conopStatusSummary: {
    draft: number;
    published: number;
  };
  attendanceReadiness: {
    trackedMissions: number;
    expectedAttendanceCount: number;
    respondedCount: number;
    missingRsvpCount: number;
    lockedMissionCount: number;
    unlockedMissionCount: number;
  };
  completedMissingAars: MissionListItem[];
  missingScreenshotAars: AarListItem[];
  patrolAarsAwaitingReview: AarListItem[];
  recentProgressionRecommendations: AarListItem[];
  recentPatrolReports: AarListItem[];
  missionMakerAssignments: Array<{
    missionId: string;
    title: string;
    missionMakerName: string | null;
    zeusName: string | null;
    startsAt: Date;
    hostUnitShortName: string | null;
  }>;
};
