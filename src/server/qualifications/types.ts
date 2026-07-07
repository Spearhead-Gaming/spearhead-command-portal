export type QualificationStatus =
  | "pending_signoff"
  | "qualified"
  | "expired"
  | "revoked"
  | "missing"
  | "not-required";

export type QualificationCatalogFilters = {
  q?: string;
  categoryId?: string;
  state?: "active" | "archived" | "all";
};

export type QualificationMatrixFilters = {
  q?: string;
  unitId?: string;
  positionId?: string;
  categoryId?: string;
  readiness?: "" | "missing" | "expired" | "expiring";
};

export type QualificationOption = {
  id: string;
  label: string;
  key?: string;
  hint?: string | null;
};

export type QualificationCategorySummary = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  sortOrder: number;
  qualificationCount: number;
};

export type QualificationCatalogItem = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  expiresAfterDays: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    label: string;
    key: string;
  };
  awardedCount: number;
  requirementCount: number;
};

export type QualificationRequirementItem = {
  id: string;
  unit: {
    id: string;
    key: string;
    name: string;
    shortName: string;
  } | null;
  position: {
    id: string;
    key: string;
    title: string;
    unitId: string;
    unitShortName: string;
  } | null;
  isRequired: boolean;
  dueWithinDays: number | null;
  notes: string | null;
};

export type QualificationDetail = QualificationCatalogItem & {
  requirements: QualificationRequirementItem[];
  abbreviation: string;
  membersQualifiedCount: number;
  membersPendingSignoffCount: number;
  membersMissingRequiredCount: number;
  expiringSoonCount: number;
  affectedUnits: Array<{
    id: string;
    name: string;
    shortName: string;
  }>;
  affectedPositions: Array<{
    id: string;
    title: string;
    unitShortName: string;
  }>;
  recentActivity: QualificationActivityItem[];
  memberPreview: QualificationMemberPreview[];
};

export type MemberQualificationRecord = {
  id: string;
  qualificationId: string;
  qualificationLabel: string;
  qualificationKey: string;
  categoryLabel: string;
  status: QualificationStatus;
  awardedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  notes: string | null;
  awardedByDisplayName: string | null;
  isRequired: boolean;
  requiredBy: string[];
  isExpiringSoon: boolean;
  statusLabel: string;
};

export type MemberQualificationSummary = {
  earned: MemberQualificationRecord[];
  pendingSignoff: MemberQualificationRecord[];
  expiringSoon: MemberQualificationRecord[];
  missingRequired: Array<{
    qualificationId: string;
    qualificationLabel: string;
    categoryLabel: string;
    requiredBy: string[];
  }>;
  revokedOrExpired: MemberQualificationRecord[];
};

export type QualificationReferenceData = {
  categories: QualificationOption[];
  qualifications: QualificationOption[];
  units: QualificationOption[];
  positions: QualificationOption[];
  members: QualificationOption[];
};

export type QualificationMatrixCell = {
  qualificationId: string;
  qualificationLabel: string;
  categoryLabel: string;
  status: QualificationStatus;
  recordId: string | null;
  isRequired: boolean;
  isRecommended: boolean;
  isExpiringSoon: boolean;
  summary: string;
};

export type QualificationMatrixRow = {
  memberProfileId: string;
  memberDisplayName: string;
  callsign: string | null;
  rankAbbreviation: string | null;
  unitShortName: string | null;
  positionTitle: string | null;
  statusLabel: string;
  cells: QualificationMatrixCell[];
  missingRequiredCount: number;
};

export type QualificationMatrixColumn = {
  qualificationId: string;
  label: string;
  shortLabel: string;
  categoryLabel: string;
};

export type QualificationMatrixData = {
  columns: QualificationMatrixColumn[];
  rows: QualificationMatrixRow[];
  summary: {
    trackedMembers: number;
    displayedQualifications: number;
    expiringSoonCount: number;
    missingRequiredCount: number;
  };
};

export type QualificationRecordDetail = {
  memberProfileId: string;
  memberDisplayName: string;
  memberUnitShortName: string | null;
  memberPositionTitle: string | null;
  qualificationId: string;
  qualificationLabel: string;
  qualificationAbbreviation: string;
  categoryLabel: string;
  record: MemberQualificationRecord | null;
  isRequired: boolean;
  isRecommended: boolean;
  requiredBy: string[];
  activity: QualificationActivityItem[];
  canSignOff: boolean;
};

export type QualificationActivityItem = {
  id: string;
  type:
    | "qualification-created"
    | "qualification-updated"
    | "qualification-archived"
    | "qualification-awarded"
    | "qualification-revoked"
    | "qualification-signoff-completed"
    | "requirement-added"
    | "requirement-removed"
    | "qualification-expiring";
  title: string;
  description: string;
  actorDisplayName: string | null;
  timestamp: Date;
  badgeLabel: string | null;
  badgeTone: "info" | "success" | "warning" | "danger" | "muted";
  details: string[];
};

export type QualificationMemberPreview = {
  memberProfileId: string;
  displayName: string;
  unitShortName: string | null;
  positionTitle: string | null;
  status: QualificationStatus;
  statusLabel: string;
  isExpiringSoon: boolean;
  expiresAt: Date | null;
};

export type MemberQualificationReadinessSummary = {
  memberProfileId: string;
  qualifiedCount: number;
  pendingSignoffCount: number;
  missingRequiredCount: number;
  expiringSoonCount: number;
  readinessPercent: number | null;
  missingLabels: string[];
};

export type UnitQualificationReadinessSummary = {
  unitId: string;
  unitName: string;
  trackedMembers: number;
  requiredQualifications: number;
  missingRequiredCount: number;
  pendingSignoffCount: number;
  expiringSoonCount: number;
  readinessPercent: number | null;
  topMissingQualifications: Array<{
    qualificationId: string;
    qualificationLabel: string;
    count: number;
  }>;
};

export type PendingQualificationSignoffItem = {
  recordId: string;
  memberProfileId: string;
  memberDisplayName: string;
  qualificationId: string;
  qualificationLabel: string;
  unitShortName: string | null;
  positionTitle: string | null;
  awardedAt: Date;
  awardedByDisplayName: string | null;
};

export type QualificationDashboardSummary = {
  catalogCount: number;
  archivedCount: number;
  requiredMappingsCount: number;
  pendingSignoffCount: number;
  expiringSoonCount: number;
};
