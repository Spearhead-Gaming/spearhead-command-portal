import type {
  MemberQualificationReadinessSummary,
  QualificationStatus,
  UnitQualificationReadinessSummary,
} from "@/server/qualifications/types";

export function getQualificationStatusLabel(status: QualificationStatus) {
  switch (status) {
    case "pending_signoff":
      return "Pending Sign-Off";
    case "qualified":
      return "Qualified";
    case "expired":
      return "Expired";
    case "revoked":
      return "Revoked";
    case "missing":
      return "Missing Required";
    default:
      return "Not Required";
  }
}

export function getQualificationBadgeTone(status: QualificationStatus, expiringSoon = false) {
  if (status === "qualified") {
    return expiringSoon ? "warning" : ("success" as const);
  }

  switch (status) {
    case "pending_signoff":
      return "warning" as const;
    case "expired":
      return "warning" as const;
    case "revoked":
      return "danger" as const;
    case "missing":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

export function calculateMemberQualificationReadiness(input: {
  memberProfileId: string;
  expiringSoonCount: number;
  missingLabels: string[];
  pendingSignoffCount: number;
  qualifiedCount: number;
}) : MemberQualificationReadinessSummary {
  const readinessPercent = Math.max(
    0,
    Math.min(
      100,
      100 -
        input.missingLabels.length * 20 -
        input.pendingSignoffCount * 10 -
        input.expiringSoonCount * 5,
    ),
  );

  return {
    memberProfileId: input.memberProfileId,
    qualifiedCount: input.qualifiedCount,
    pendingSignoffCount: input.pendingSignoffCount,
    missingRequiredCount: input.missingLabels.length,
    expiringSoonCount: input.expiringSoonCount,
    readinessPercent,
    missingLabels: input.missingLabels,
  };
}

export function calculateUnitQualificationReadiness(input: {
  expiringSoonCount: number;
  missingRequiredCount: number;
  pendingSignoffCount: number;
  requiredQualifications: number;
  topMissingQualifications: UnitQualificationReadinessSummary["topMissingQualifications"];
  trackedMembers: number;
  unitId: string;
  unitName: string;
}): UnitQualificationReadinessSummary {
  const denominator = Math.max(1, input.requiredQualifications * Math.max(input.trackedMembers, 1));
  const resolvedCount = Math.max(
    0,
    denominator - input.missingRequiredCount - input.pendingSignoffCount,
  );
  const readinessPercent = Math.max(
    0,
    Math.min(100, Math.round((resolvedCount / denominator) * 100)),
  );

  return {
    unitId: input.unitId,
    unitName: input.unitName,
    trackedMembers: input.trackedMembers,
    requiredQualifications: input.requiredQualifications,
    missingRequiredCount: input.missingRequiredCount,
    pendingSignoffCount: input.pendingSignoffCount,
    expiringSoonCount: input.expiringSoonCount,
    readinessPercent,
    topMissingQualifications: input.topMissingQualifications,
  };
}
