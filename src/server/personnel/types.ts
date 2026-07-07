import type { Prisma } from "@prisma/client";

import type { MemberAttendanceSummary } from "@/server/attendance/types";
import type { MemberQualificationSummary } from "@/server/qualifications/types";

export type PersonnelFilters = {
  q?: string;
  unitId?: string;
  rankId?: string;
  statusId?: string;
  positionId?: string;
  discordLinked?: "linked" | "unlinked" | "";
};

export type RosterFilters = {
  q?: string;
  unitId?: string;
  rankId?: string;
  statusId?: string;
  positionId?: string;
};

export type PersonnelOption = {
  id: string;
  label: string;
  key?: string;
  hint?: string | null;
};

export type MemberListItem = {
  id: string;
  displayName: string;
  callsign: string | null;
  joinDate: Date | null;
  lastUpdatedAt: Date;
  discordLinked: boolean;
  rank: {
    id: string;
    label: string;
    abbreviation: string;
  } | null;
  unit: {
    id: string;
    key: string;
    name: string;
    shortName: string;
  } | null;
  position: {
    id: string;
    title: string;
  } | null;
  status: {
    id: string;
    key: string;
    label: string;
  };
};

export type MemberDetail = MemberListItem & {
  userId: string | null;
  notesPlaceholder: string;
  qualificationPlaceholderCount: number;
  activeAssignment: {
    id: string;
    startsAt: Date;
    endsAt: Date | null;
  } | null;
  rosterHistory: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date | null;
    unitName: string | null;
    rankAbbreviation: string | null;
    positionTitle: string | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    summary: string;
    createdAt: Date;
  }>;
};

export type RosterAssignmentListItem = MemberListItem & {
  activeAssignmentId: string | null;
  assignmentStartsAt: Date | null;
};

export type UnitListItem = {
  id: string;
  key: string;
  name: string;
  shortName: string;
  parentUnitName: string | null;
  activeMembers: number;
  loaMembers: number;
  inactiveMembers: number;
  openBillets: number;
  rosterCount: number;
};

export type UnitDashboardData = UnitListItem & {
  roster: MemberListItem[];
  positions: Array<{
    id: string;
    title: string;
    isLeadership: boolean;
    assignedMemberName: string | null;
  }>;
};

export type PersonnelReferenceData = {
  statuses: PersonnelOption[];
  ranks: PersonnelOption[];
  units: PersonnelOption[];
  positions: PersonnelOption[];
};

export type MemberSignalTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export type MemberReadinessSummary = {
  score: number | null;
  statusLabel: string;
  tone: MemberSignalTone;
  summary: string;
  missingRequirementCount: number;
  missingRequirementLabels: string[];
  attendanceRate: number | null;
  hasActiveUnitAssignment: boolean;
  profileStatusLabel: string;
  profileStatusKey: string;
  unitLabel: string | null;
  positionLabel: string | null;
};

export type MemberCampaignParticipationSummary = {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  participationEventCount: number;
  recentCampaigns: Array<{
    id: string;
    title: string;
    status: string;
    statusLabel: string;
    phase: string | null;
    participatedAt: Date;
    relatedEventTitle: string | null;
    hostUnitShortName: string | null;
  }>;
};

export type MemberServiceTimelineEntry = {
  id: string;
  type:
    | "profile-created"
    | "joined-community"
    | "rank-changed"
    | "unit-changed"
    | "position-changed"
    | "status-changed"
    | "qualification-awarded"
    | "qualification-revoked"
    | "event-attended"
    | "event-missed"
    | "campaign-participation"
    | "note-added"
    | "audit";
  title: string;
  description: string;
  actorDisplayName: string | null;
  timestamp: Date;
  badgeLabel: string | null;
  badgeTone: MemberSignalTone;
  relatedLabel: string | null;
  relatedHref: string | null;
  details: string[];
  isSensitive: boolean;
};

export type MemberServiceLogItem = {
  id: string;
  action: string;
  summary: string;
  createdAt: Date;
  actorDisplayName: string | null;
  reason: string | null;
};

export type MemberAuditLogItem = MemberServiceLogItem & {
  entityType: string;
  entityId: string | null;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
};

export type MemberNotesSection = {
  canView: boolean;
  canCreate: boolean;
  placeholder: string;
};

export type MemberProfileDashboardData = {
  member: MemberDetail;
  qualificationSummary: MemberQualificationSummary | null;
  attendanceSummary: MemberAttendanceSummary | null;
  campaignSummary: MemberCampaignParticipationSummary | null;
  readiness: MemberReadinessSummary | null;
  serviceTimeline: MemberServiceTimelineEntry[] | null;
  recentActivity: MemberServiceTimelineEntry[];
  serviceLogs: MemberServiceLogItem[] | null;
  auditLogs: MemberAuditLogItem[] | null;
  notes: MemberNotesSection;
  serviceRecord: {
    joinDateLabel: string;
    timeInServiceLabel: string;
    timeInGradeLabel: string;
    discordLinkLabel: string;
    steamIdLabel: string;
    armaIdLabel: string;
  };
  permissions: {
    canViewServiceRecord: boolean;
    canEditServiceRecord: boolean;
    canViewNotes: boolean;
    canCreateNotes: boolean;
    canViewLogs: boolean;
    canViewQualifications: boolean;
    canViewAttendance: boolean;
    canViewCampaigns: boolean;
    canViewAudit: boolean;
  };
};
