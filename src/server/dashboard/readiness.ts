export function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

export function calculateAttendanceReadiness(input: {
  absent: number;
  late: number;
  present: number;
}) {
  return percentage(input.present + input.late, input.present + input.late + input.absent);
}

export function calculateUnitReadiness(input: {
  active: number;
  inactive: number;
  loa: number;
  openBillets: number;
}) {
  return percentage(
    input.active,
    input.active + input.loa + input.inactive + input.openBillets,
  );
}

export function calculateQualificationReadiness(input: {
  missingRequired: number;
  qualified: number;
}) {
  return percentage(input.qualified, input.qualified + input.missingRequired);
}

export function calculateMemberReadiness(input: {
  activeAssignment: boolean;
  attendancePercent: number | null;
  missingRequiredQualifications: number;
  profileStatusKey: string | null;
}) {
  let score = 100;

  if (input.profileStatusKey !== "active") {
    score -= input.profileStatusKey === "loa" ? 25 : 40;
  }

  if (!input.activeAssignment) {
    score -= 25;
  }

  score -= Math.min(40, input.missingRequiredQualifications * 15);

  if (input.attendancePercent !== null && input.attendancePercent < 75) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function calculateCampaignReadiness(input: {
  completedEvents: number;
  totalEvents: number;
}) {
  return percentage(input.completedEvents, input.totalEvents);
}
