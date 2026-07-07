import type {
  attendanceStatusCatalog,
  eventStatusCatalog,
  eventTypeCatalog,
  missionStatusCatalog,
} from "@/server/database/catalogs";

export type EventStatusKey = (typeof eventStatusCatalog)[number]["key"];
export type EventTypeKey = (typeof eventTypeCatalog)[number]["key"];
export type RsvpStatusKey = (typeof attendanceStatusCatalog.rsvp)[number];
export type FinalAttendanceStatusKey =
  (typeof attendanceStatusCatalog.final)[number];

export type EventFilters = {
  q?: string;
  unitId?: string;
  campaignId?: string;
  eventType?: EventTypeKey | "";
  status?: EventStatusKey | "";
  missionStatus?: (typeof missionStatusCatalog)[number]["key"] | "";
  dateFrom?: string;
  dateTo?: string;
};

export type EventOption = {
  id: string;
  label: string;
  key?: string;
  hint?: string | null;
};

export type EventReferenceData = {
  units: EventOption[];
  campaigns: EventOption[];
  eventTypes: Array<{
    key: EventTypeKey;
    label: string;
    description: string;
  }>;
  statuses: Array<{
    key: EventStatusKey;
    label: string;
    description: string;
  }>;
  missionStatuses: Array<{
    key: (typeof missionStatusCatalog)[number]["key"];
    label: string;
    description: string;
  }>;
  rsvpStatuses: RsvpStatusKey[];
  finalStatuses: FinalAttendanceStatusKey[];
};

export type EventListItem = {
  id: string;
  title: string;
  description: string | null;
  eventType: EventTypeKey | string;
  eventTypeLabel: string;
  status: EventStatusKey | string;
  statusLabel: string;
  missionStatus: (typeof missionStatusCatalog)[number]["key"] | string;
  missionStatusLabel: string;
  deploymentWeek: number | null;
  operationVersionLabel: string | null;
  selectedOperationVersion: string | null;
  aarRequired: boolean;
  aarSubmittedAt: Date | null;
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
  conopCount: number;
  publishedConopCount: number;
  latestConopStatusLabel: string | null;
  aarCount: number;
  latestAarStatusLabel: string | null;
  attendanceLocked: boolean;
  expectedCount: number;
  rsvpCounts: {
    yes: number;
    no: number;
    maybe: number;
    missing: number;
  };
  finalCounts: {
    present: number;
    absent: number;
    excused: number;
    late: number;
    loa: number;
    pending: number;
  };
  viewerRsvpStatus: RsvpStatusKey | null;
  weeklyTasking: {
    id: string;
    weekNumber: number;
    operationalSummary: string | null;
    commandersIntent: string | null;
    timeline: string | null;
    publishStatus: string;
    unitTaskings: Array<{
      id: string;
      unitName: string;
      unitShortName: string;
      primaryObjective: string | null;
      secondaryObjective: string | null;
      specialInstructions: string | null;
    }>;
  } | null;
};

export type EventSummary = {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  cancelledEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  openAttendanceEvents: number;
  missingRsvpCount: number;
};

export type EventListData = {
  events: EventListItem[];
  summary: EventSummary;
};
