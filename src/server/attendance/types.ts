import type {
  attendanceStatusCatalog,
  eventStatusCatalog,
} from "@/server/database/catalogs";

export type RsvpStatusKey = (typeof attendanceStatusCatalog.rsvp)[number];
export type FinalAttendanceStatusKey =
  (typeof attendanceStatusCatalog.final)[number];
export type AttendanceEventStatusKey = (typeof eventStatusCatalog)[number]["key"];

export type AttendanceReportFilters = {
  q?: string;
  unitId?: string;
  eventId?: string;
  status?: FinalAttendanceStatusKey | "missing-rsvp" | "no-show" | "";
  dateFrom?: string;
  dateTo?: string;
};

export type EventAttendanceRow = {
  memberProfileId: string;
  displayName: string;
  callsign: string | null;
  rankAbbreviation: string | null;
  positionTitle: string | null;
  profileStatusLabel: string;
  profileStatusKey: string;
  rsvpStatus: RsvpStatusKey | null;
  finalStatus: FinalAttendanceStatusKey | null;
  respondedAt: Date | null;
  recordedAt: Date | null;
  lockedAt: Date | null;
  notes: string | null;
  isMissingRsvp: boolean;
  isNoShow: boolean;
};

export type EventAttendanceWorkspace = {
  eventId: string;
  eventTitle: string;
  eventStatus: AttendanceEventStatusKey | string;
  eventStatusLabel: string;
  hostUnit: {
    id: string;
    key: string;
    name: string;
    shortName: string;
  } | null;
  startsAt: Date;
  endsAt: Date | null;
  attendanceLocked: boolean;
  rows: EventAttendanceRow[];
  summary: {
    expectedCount: number;
    respondedCount: number;
    missingRsvpCount: number;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
    lateCount: number;
    loaCount: number;
    noShowCount: number;
    attendanceRate: number | null;
  };
};

export type ViewerEventRsvp = {
  eventId: string;
  memberProfileId: string;
  displayName: string;
  rsvpStatus: RsvpStatusKey | null;
  finalStatus: FinalAttendanceStatusKey | null;
  respondedAt: Date | null;
};

export type AttendanceReportEventItem = {
  eventId: string;
  title: string;
  startsAt: Date;
  hostUnitShortName: string | null;
  eventTypeLabel: string;
  statusLabel: string;
  expectedCount: number;
  missingRsvpCount: number;
  noShowCount: number;
  attendanceRate: number | null;
  attendanceLocked: boolean;
};

export type AttendanceReportData = {
  availableEvents: Array<{
    id: string;
    label: string;
    hint: string | null;
  }>;
  unitOptions: Array<{
    id: string;
    label: string;
    hint: string | null;
  }>;
  events: AttendanceReportEventItem[];
  summary: {
    trackedEvents: number;
    pendingCloseout: number;
    missingRsvpCount: number;
    noShowCount: number;
    averageAttendanceRate: number | null;
  };
  missingRsvpMembers: Array<{
    eventId: string;
    eventTitle: string;
    memberProfileId: string;
    displayName: string;
    unitShortName: string | null;
  }>;
  noShows: Array<{
    eventId: string;
    eventTitle: string;
    memberProfileId: string;
    displayName: string;
    unitShortName: string | null;
  }>;
};

export type MemberAttendanceSummary = {
  memberProfileId: string;
  attendanceRate: number | null;
  totalFinalized: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  loaCount: number;
  upcomingRsvpCount: number;
  recentEvents: Array<{
    eventId: string;
    eventTitle: string;
    startsAt: Date;
    hostUnitShortName: string | null;
    rsvpStatus: RsvpStatusKey | null;
    finalStatus: FinalAttendanceStatusKey | null;
  }>;
};

export type UnitAttendanceSummary = {
  unitId: string;
  unitName: string;
  attendanceRate: number | null;
  trackedEvents: number;
  pendingCloseout: number;
  missingRsvpCount: number;
  noShowCount: number;
  recentEvents: AttendanceReportEventItem[];
};
