import type {
  MemberQualificationSummary,
} from "@/server/qualifications/types";
import type { MemberAttendanceSummary } from "@/server/attendance/types";
import type {
  MemberReadinessSummary,
} from "@/server/personnel/types";

type BuildMemberReadinessInput = {
  attendanceSummary: MemberAttendanceSummary | null;
  expiringSoonCount: number;
  hasActiveUnitAssignment: boolean;
  missingQualificationLabels: string[];
  pendingSignoffCount: number;
  positionLabel: string | null;
  profileStatusKey: string;
  profileStatusLabel: string;
  unitLabel: string | null;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getStatusPenalty(statusKey: string) {
  switch (statusKey) {
    case "active":
      return 0;
    case "reserve":
      return 12;
    case "loa":
      return 22;
    case "recruit":
      return 28;
    case "applicant":
      return 35;
    case "inactive":
    case "retired":
    case "discharged":
    case "banned":
      return 45;
    default:
      return 18;
  }
}

function getAttendancePenalty(attendanceRate: number | null) {
  if (attendanceRate === null) {
    return 10;
  }

  if (attendanceRate >= 90) {
    return 0;
  }

  if (attendanceRate >= 75) {
    return 6;
  }

  if (attendanceRate >= 60) {
    return 14;
  }

  return 25;
}

export function getMissingQualificationLabels(
  summary: MemberQualificationSummary | null,
) {
  return summary?.missingRequired.map((entry) => entry.qualificationLabel) ?? [];
}

export function buildMemberReadiness(
  input: BuildMemberReadinessInput,
): MemberReadinessSummary {
  const attendanceRate = input.attendanceSummary?.attendanceRate ?? null;
  const missingRequirementCount = input.missingQualificationLabels.length;
  const score = clampScore(
    100 -
      getStatusPenalty(input.profileStatusKey) -
      getAttendancePenalty(attendanceRate) -
      Math.min(missingRequirementCount * 10, 30) -
      Math.min(input.pendingSignoffCount * 6, 18) -
      Math.min(input.expiringSoonCount * 3, 12) -
      (input.hasActiveUnitAssignment ? 0 : 20),
  );

  const reasons: string[] = [];

  if (!input.hasActiveUnitAssignment) {
    reasons.push("No active unit assignment is attached to the service record.");
  }

  if (attendanceRate === null) {
    reasons.push("Attendance history is limited or not yet visible.");
  } else if (attendanceRate < 75) {
    reasons.push(`Attendance is tracking at ${attendanceRate}%.`);
  }

  if (missingRequirementCount > 0) {
    reasons.push(
      `${missingRequirementCount} required qualification${
        missingRequirementCount === 1 ? "" : "s"
      } ${missingRequirementCount === 1 ? "is" : "are"} missing.`,
    );
  }

  if (input.pendingSignoffCount > 0) {
    reasons.push(
      `${input.pendingSignoffCount} qualification${
        input.pendingSignoffCount === 1 ? "" : "s"
      } ${input.pendingSignoffCount === 1 ? "is" : "are"} pending sign-off.`,
    );
  }

  if (input.expiringSoonCount > 0) {
    reasons.push(
      `${input.expiringSoonCount} qualification${
        input.expiringSoonCount === 1 ? "" : "s"
      } ${input.expiringSoonCount === 1 ? "is" : "are"} expiring soon.`,
    );
  }

  if (input.profileStatusKey !== "active") {
    reasons.push(`Profile status is ${input.profileStatusLabel}.`);
  }

  if (score >= 85) {
    return {
      score,
      statusLabel: "Mission Ready",
      tone: "success",
      summary:
        reasons[0] ??
        "Service record is active, assigned, and not currently showing readiness blockers.",
      missingRequirementCount,
      missingRequirementLabels: input.missingQualificationLabels,
      attendanceRate,
      hasActiveUnitAssignment: input.hasActiveUnitAssignment,
      profileStatusLabel: input.profileStatusLabel,
      profileStatusKey: input.profileStatusKey,
      unitLabel: input.unitLabel,
      positionLabel: input.positionLabel,
    };
  }

  if (score >= 65) {
    return {
      score,
      statusLabel: "Watch List",
      tone: "warning",
      summary: reasons[0] ?? "Service record needs follow-up before it is fully mission ready.",
      missingRequirementCount,
      missingRequirementLabels: input.missingQualificationLabels,
      attendanceRate,
      hasActiveUnitAssignment: input.hasActiveUnitAssignment,
      profileStatusLabel: input.profileStatusLabel,
      profileStatusKey: input.profileStatusKey,
      unitLabel: input.unitLabel,
      positionLabel: input.positionLabel,
    };
  }

  return {
    score,
    statusLabel: "Needs Attention",
    tone: "danger",
    summary:
      reasons[0] ??
      "Service record is missing core readiness inputs and needs staff review.",
    missingRequirementCount,
    missingRequirementLabels: input.missingQualificationLabels,
    attendanceRate,
    hasActiveUnitAssignment: input.hasActiveUnitAssignment,
    profileStatusLabel: input.profileStatusLabel,
    profileStatusKey: input.profileStatusKey,
    unitLabel: input.unitLabel,
    positionLabel: input.positionLabel,
  };
}
