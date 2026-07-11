import { RuleEngineService } from "@/server/rules/service";
import type {
  HealthRuleResult,
  OperationalHealthCategory,
  OperationalHealthCategoryScore,
  OperationalHealthStatusLabel,
  OperationalHealthSummary,
  OperationalHealthTrend,
  OperationsPackageData,
} from "@/server/operations-package/types";
import type { RuleEvaluationContext, RuleEvaluationResult, RuleProvider, RuleStatus } from "@/server/rules/types";

export type OperationalHealthContext = RuleEvaluationContext & {
  activeMemberCount: number;
  activeUnitCount: number;
  membersWithoutUnitCount: number;
  now: Date;
  packageData: OperationsPackageData;
  patrols: Array<{
    aarCount: number;
    aarRequired: boolean;
    aarSubmittedAt: Date | null;
    endsAt: Date | null;
    id: string;
    patrolStatus: string | null;
    reviewedAarCount: number;
    startsAt: Date;
    status: string;
    title: string;
  }>;
};

type OperationalHealthProvider = RuleProvider<OperationalHealthContext> & {
  category: OperationalHealthCategory;
};

const operationalHealthRuleEngine = new RuleEngineService();

function healthRule(input: {
  category: OperationalHealthCategory;
  description: string;
  id: string;
  message: string;
  now: Date;
  providerId: string;
  recommendedAction: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  severity?: RuleEvaluationResult["severity"];
  status: RuleStatus;
  title: string;
}): HealthRuleResult {
  return {
    category: input.category,
    description: input.description,
    id: input.id,
    message: input.message,
    providerId: input.providerId,
    recommendedAction: input.recommendedAction,
    relatedEntityId: input.relatedEntityId ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    severity: input.severity ?? getDefaultSeverity(input.status),
    status: input.status,
    timestamp: input.now,
    title: input.title,
  };
}

function getDefaultSeverity(status: RuleStatus): RuleEvaluationResult["severity"] {
  if (status === "FAIL") {
    return "CRITICAL";
  }

  if (status === "WARNING") {
    return "MEDIUM";
  }

  return "LOW";
}

function resourceExists(packageData: OperationsPackageData, resourceType: string) {
  return packageData.resources.some(
    (resource) => resource.resourceType === resourceType && resource.currentVersion,
  );
}

function scoreFromRules(category: OperationalHealthCategory, rules: HealthRuleResult[]): OperationalHealthCategoryScore {
  const applicableRules = rules.filter((rule) => rule.status !== "NOT_APPLICABLE");
  const totalChecks = applicableRules.length;
  const rawScore = applicableRules.reduce((score, rule) => {
    if (rule.status === "PASS") {
      return score + 1;
    }

    if (rule.status === "WARNING") {
      return score + 0.6;
    }

    return score;
  }, 0);
  const score = totalChecks > 0 ? Math.round((rawScore / totalChecks) * 100) : 0;
  const criticalIssues = applicableRules.filter((rule) => rule.status === "FAIL").length;
  const warnings = applicableRules.filter((rule) => rule.status === "WARNING").length;

  return {
    category,
    criticalIssues,
    lastEvaluatedAt: new Date(),
    rules,
    score,
    statusLabel: getHealthStatusLabel(score, criticalIssues),
    totalChecks,
    trend: "stable",
    warnings,
  };
}

function getHealthStatusLabel(score: number, criticalIssues: number): OperationalHealthStatusLabel {
  if (criticalIssues > 0 || score < 35) {
    return "Critical";
  }

  if (score < 55) {
    return "Poor";
  }

  if (score < 75) {
    return "Fair";
  }

  if (score < 90) {
    return "Good";
  }

  return "Excellent";
}

function getOverallTrend(categories: OperationalHealthCategoryScore[]): OperationalHealthTrend {
  const trends = categories.map((category) => category.trend);

  if (trends.includes("declining")) {
    return "declining";
  }

  if (trends.includes("improving")) {
    return "improving";
  }

  return "stable";
}

function createPlanningHealthProvider(): OperationalHealthProvider {
  const providerId = "operations-package.planning-health";

  return {
    category: "planning",
    domain: "operations",
    id: providerId,
    name: "Planning Health Provider",
    priority: 10,
    evaluate: ({ now, packageData }) => [
      healthRule({
        category: "planning",
        description: "The current deployment week has a linked Weekend Operation.",
        id: "planning.weekend_operation.linked",
        message: packageData.weekendOperation
          ? "Weekend Operation is linked to the current deployment week."
          : "No Weekend Operation is linked to this deployment week.",
        now,
        providerId,
        recommendedAction: packageData.weekendOperation
          ? "Keep operation timing and ownership current."
          : "Create or link the Weekend Operation for this week.",
        relatedEntityId: packageData.weekendOperation?.id ?? packageData.week.id,
        relatedEntityType: packageData.weekendOperation ? "Event" : "DeploymentWeek",
        status: packageData.weekendOperation ? "PASS" : "FAIL",
        title: "Weekend Operation linked",
      }),
      healthRule({
        category: "planning",
        description: "A Zeus owner or creator-as-Zeus mode is visible.",
        id: "planning.zeus.assigned",
        message:
          packageData.campaign.zeusAssignmentType === "creator" || packageData.campaign.zeusName
            ? `Zeus coverage is ${packageData.campaign.zeusName ?? packageData.campaign.zeusAssignmentType}.`
            : "No Zeus assignment is visible.",
        now,
        providerId,
        recommendedAction:
          packageData.campaign.zeusAssignmentType === "creator" || packageData.campaign.zeusName
            ? "Confirm Zeus availability before publishing the package."
            : "Assign Zeus or explicitly mark the deployment unassigned.",
        relatedEntityId: packageData.campaign.id,
        relatedEntityType: "Campaign",
        status:
          packageData.campaign.zeusAssignmentType === "creator" || packageData.campaign.zeusName
            ? "PASS"
            : "FAIL",
        title: "Zeus assigned",
      }),
      healthRule({
        category: "planning",
        description: "Weekly Tasking exists for the current operation.",
        id: "planning.weekly_tasking.exists",
        message: packageData.weeklyTasking
          ? "Weekly Tasking is initialized."
          : "Weekly Tasking is not initialized.",
        now,
        providerId,
        recommendedAction: packageData.weeklyTasking
          ? "Review tasking summary, timeline, and unit taskings."
          : "Sync package structure after linking the Weekend Operation.",
        relatedEntityId: packageData.weeklyTasking?.id ?? packageData.week.id,
        relatedEntityType: packageData.weeklyTasking ? "WeeklyTasking" : "DeploymentWeek",
        status: packageData.weeklyTasking ? "PASS" : "FAIL",
        title: "Weekly Tasking exists",
      }),
      healthRule({
        category: "planning",
        description: "Active units have primary tasking objectives.",
        id: "planning.unit_taskings.complete",
        message:
          packageData.completion.unitTaskingsTotal > 0
            ? `${packageData.completion.unitTaskingsComplete}/${packageData.completion.unitTaskingsTotal} unit taskings include primary objectives.`
            : "No active unit tasking rows are present.",
        now,
        providerId,
        recommendedAction:
          packageData.completion.unitTaskingsComplete === packageData.completion.unitTaskingsTotal &&
          packageData.completion.unitTaskingsTotal > 0
            ? "Review support assets and special instructions."
            : "Finish missing Unit Tasking primary objectives.",
        relatedEntityId: packageData.weeklyTasking?.id ?? null,
        relatedEntityType: "WeeklyTasking",
        status:
          packageData.completion.unitTaskingsTotal > 0 &&
          packageData.completion.unitTaskingsComplete === packageData.completion.unitTaskingsTotal
            ? "PASS"
            : "WARNING",
        title: "Unit Taskings complete",
      }),
      healthRule({
        category: "planning",
        description: "A weekly CONOP file or link is attached through resources.",
        id: "planning.conop.attached",
        message: resourceExists(packageData, "CONOP")
          ? "CONOP is attached to the package."
          : "CONOP is missing from the package.",
        now,
        providerId,
        recommendedAction: resourceExists(packageData, "CONOP")
          ? "Confirm the current CONOP version is member-safe."
          : "Attach the CONOP file or external link before publication.",
        status: resourceExists(packageData, "CONOP") ? "PASS" : "WARNING",
        title: "CONOP attached",
      }),
      healthRule({
        category: "planning",
        description: "Critical deployment resources are available to the weekly package.",
        id: "planning.resources.available",
        message: packageData.resources.length > 0
          ? `${packageData.resources.length} deployment resources are visible.`
          : "No deployment resources are visible.",
        now,
        providerId,
        recommendedAction: packageData.resources.length > 0
          ? "Confirm resource versions before release."
          : "Add OPORD, primer, mod preset, or supporting resources.",
        status: packageData.resources.length > 0 ? "PASS" : "WARNING",
        title: "Resources available",
      }),
      healthRule({
        category: "planning",
        description: "The current Arma 3 preset is visible for member preparation.",
        id: "planning.mod_preset.current",
        message: resourceExists(packageData, "ARMA3_PRESET")
          ? "Current Mod Preset is available."
          : "Current Mod Preset is not available.",
        now,
        providerId,
        recommendedAction: resourceExists(packageData, "ARMA3_PRESET")
          ? "Confirm the uploaded preset name, mod count, and date."
          : "Upload or link the current Arma 3 preset.",
        status: resourceExists(packageData, "ARMA3_PRESET") ? "PASS" : "WARNING",
        title: "Current Mod Preset",
      }),
      healthRule({
        category: "planning",
        description: "The operation package has no readiness blockers.",
        id: "planning.package.valid",
        message:
          packageData.readiness && packageData.readiness.blockingIssues.length > 0
            ? `${packageData.readiness.blockingIssues.length} readiness blockers remain.`
            : "No readiness blockers are currently reported.",
        now,
        providerId,
        recommendedAction:
          packageData.readiness && packageData.readiness.blockingIssues.length > 0
            ? "Resolve Go / No-Go blocking issues."
            : "Continue monitoring readiness as planning changes.",
        relatedEntityId: packageData.week.id,
        relatedEntityType: "DeploymentWeek",
        status:
          packageData.readiness && packageData.readiness.blockingIssues.length > 0
            ? "FAIL"
            : "PASS",
        title: "Package valid",
      }),
    ],
  };
}

function createExecutionHealthProvider(): OperationalHealthProvider {
  const providerId = "operations-package.execution-health";

  return {
    category: "execution",
    domain: "operations",
    id: providerId,
    name: "Execution Health Provider",
    priority: 20,
    evaluate: ({ now, packageData, patrols }) => {
      const completedPatrols = patrols.filter((patrol) =>
        ["completed", "aar_submitted", "archived"].includes(patrol.patrolStatus ?? patrol.status),
      );
      const patrolsMissingAars = patrols.filter(
        (patrol) => patrol.aarRequired && patrol.aarCount === 0 && (patrol.endsAt ?? patrol.startsAt) < now,
      );
      const pendingAarReviews = patrols.filter(
        (patrol) => patrol.aarCount > 0 && patrol.reviewedAarCount < patrol.aarCount,
      );
      const operationHasPassed = packageData.weekendOperation
        ? packageData.weekendOperation.endsAt
          ? packageData.weekendOperation.endsAt < now
          : packageData.weekendOperation.startsAt < now
        : false;
      const operationCompleted =
        packageData.weekendOperation &&
        ["completed", "aar_submitted", "archived"].includes(packageData.weekendOperation.missionStatus);

      return [
        healthRule({
          category: "execution",
          description: "The linked Weekend Operation is in a sensible execution state.",
          id: "execution.weekend_operation.state",
          message: !packageData.weekendOperation
            ? "Execution cannot be assessed until a Weekend Operation is linked."
            : operationHasPassed && !operationCompleted
              ? "Weekend Operation appears to have passed but is not marked completed."
              : "Weekend Operation execution state is current.",
          now,
          providerId,
          recommendedAction: !packageData.weekendOperation
            ? "Link a Weekend Operation."
            : operationHasPassed && !operationCompleted
              ? "Update the Weekend Operation lifecycle state."
              : "Keep execution status current as the operation progresses.",
          relatedEntityId: packageData.weekendOperation?.id ?? null,
          relatedEntityType: packageData.weekendOperation ? "Event" : null,
          status: !packageData.weekendOperation
            ? "NOT_APPLICABLE"
            : operationHasPassed && !operationCompleted
              ? "WARNING"
              : "PASS",
          title: "Weekend Operation state",
        }),
        healthRule({
          category: "execution",
          description: "Patrol activity exists for the current deployment week.",
          id: "execution.patrol_activity.visible",
          message: patrols.length > 0
            ? `${patrols.length} patrols are linked to this deployment week.`
            : "No patrol activity is linked to this deployment week yet.",
          now,
          providerId,
          recommendedAction: patrols.length > 0
            ? "Review patrol outcomes and AAR follow-up."
            : "Start or link patrols when week-level activity begins.",
          relatedEntityId: packageData.week.id,
          relatedEntityType: "DeploymentWeek",
          status: patrols.length > 0 ? "PASS" : "WARNING",
          title: "Patrol activity",
        }),
        healthRule({
          category: "execution",
          description: "Started patrols are being completed.",
          id: "execution.patrol_completion.current",
          message: patrols.length > 0
            ? `${completedPatrols.length}/${patrols.length} patrols are completed or closed.`
            : "No patrols are in scope for completion tracking.",
          now,
          providerId,
          recommendedAction:
            patrols.length === 0 || completedPatrols.length === patrols.length
              ? "Continue monitoring active patrols."
              : "Close out outstanding patrols before the next planning cycle.",
          relatedEntityId: packageData.campaign.id,
          relatedEntityType: "Campaign",
          status:
            patrols.length === 0
              ? "NOT_APPLICABLE"
              : completedPatrols.length === patrols.length
                ? "PASS"
                : "WARNING",
          title: "Patrol completion",
        }),
        healthRule({
          category: "execution",
          description: "Required Patrol AARs have been submitted.",
          id: "execution.patrol_aars.submitted",
          message: patrolsMissingAars.length > 0
            ? `${patrolsMissingAars.length} completed patrols are missing AARs.`
            : "No required Patrol AAR submissions are missing.",
          now,
          providerId,
          recommendedAction: patrolsMissingAars.length > 0
            ? "Follow up with patrol leads to submit required AARs."
            : "Keep AAR collection active after patrol completion.",
          relatedEntityId: packageData.campaign.id,
          relatedEntityType: "Campaign",
          status: patrolsMissingAars.length > 0 ? "FAIL" : "PASS",
          title: "Patrol AAR submissions",
        }),
        healthRule({
          category: "execution",
          description: "Submitted Patrol AARs have been reviewed by staff.",
          id: "execution.patrol_aars.reviewed",
          message: pendingAarReviews.length > 0
            ? `${pendingAarReviews.length} patrols have AARs awaiting review.`
            : "No submitted Patrol AARs are awaiting review.",
          now,
          providerId,
          recommendedAction: pendingAarReviews.length > 0
            ? "Review pending Patrol AARs for progression context."
            : "Use reviewed AARs to inform next-week progression notes.",
          relatedEntityId: packageData.campaign.id,
          relatedEntityType: "Campaign",
          status: pendingAarReviews.length > 0 ? "WARNING" : "PASS",
          title: "Patrol AAR reviews",
        }),
        healthRule({
          category: "execution",
          description: "AAR progression feedback is available for the deployment.",
          id: "execution.progression.feedback",
          message: patrols.some((patrol) => patrol.reviewedAarCount > 0)
            ? "Reviewed AAR progression context is available."
            : "No reviewed AAR progression context is available yet.",
          now,
          providerId,
          recommendedAction: patrols.some((patrol) => patrol.reviewedAarCount > 0)
            ? "Fold reviewed AAR progression notes into next-week planning."
            : "Review completed Patrol AARs before selecting the next operation path.",
          relatedEntityId: packageData.campaign.id,
          relatedEntityType: "Campaign",
          status: patrols.length === 0 ? "NOT_APPLICABLE" : patrols.some((patrol) => patrol.reviewedAarCount > 0) ? "PASS" : "WARNING",
          title: "Progression feedback",
        }),
      ];
    },
  };
}

function createCommunityHealthProvider(): OperationalHealthProvider {
  const providerId = "operations-package.community-health";

  return {
    category: "community",
    domain: "operations",
    id: providerId,
    name: "Community Health Provider",
    priority: 30,
    evaluate: ({ activeMemberCount, activeUnitCount, membersWithoutUnitCount, now, packageData }) => {
      const rsvpTotal = packageData.weekendOperation
        ? packageData.weekendOperation.rsvpCounts.yes +
          packageData.weekendOperation.rsvpCounts.no +
          packageData.weekendOperation.rsvpCounts.maybe +
          packageData.weekendOperation.rsvpCounts.missing
        : 0;
      const rsvpResponded = packageData.weekendOperation
        ? packageData.weekendOperation.rsvpCounts.yes +
          packageData.weekendOperation.rsvpCounts.no +
          packageData.weekendOperation.rsvpCounts.maybe
        : 0;
      const rsvpCoverage = rsvpTotal > 0 ? Math.round((rsvpResponded / rsvpTotal) * 100) : 0;
      const attendanceTotal = packageData.weekendOperation
        ? Object.values(packageData.weekendOperation.attendanceSummary).reduce((total, value) => total + value, 0)
        : 0;

      return [
        healthRule({
          category: "community",
          description: "The active member pool exists for operational participation.",
          id: "community.members.active",
          message: activeMemberCount > 0
            ? `${activeMemberCount} active members are available in the portal.`
            : "No active members are visible to the health engine.",
          now,
          providerId,
          recommendedAction: activeMemberCount > 0
            ? "Continue monitoring participation and staffing."
            : "Verify member import, status, and roster data.",
          status: activeMemberCount > 0 ? "PASS" : "FAIL",
          title: "Active members",
        }),
        healthRule({
          category: "community",
          description: "Active units exist for deployment tasking.",
          id: "community.units.active",
          message: activeUnitCount > 0
            ? `${activeUnitCount} active units are configured.`
            : "No active units are configured.",
          now,
          providerId,
          recommendedAction: activeUnitCount > 0
            ? "Keep unit tasking aligned to active unit structure."
            : "Verify active unit configuration.",
          status: activeUnitCount > 0 ? "PASS" : "FAIL",
          title: "Active units",
        }),
        healthRule({
          category: "community",
          description: "Active members are assigned to units where possible.",
          id: "community.unit_staffing.assigned",
          message: membersWithoutUnitCount > 0
            ? `${membersWithoutUnitCount} active members have no current unit.`
            : "Active members have current unit assignments.",
          now,
          providerId,
          recommendedAction: membersWithoutUnitCount > 0
            ? "Review unassigned active members before operation tasking."
            : "Continue monitoring roster assignment changes.",
          status: membersWithoutUnitCount > 0 ? "WARNING" : "PASS",
          title: "Unit staffing",
        }),
        healthRule({
          category: "community",
          description: "Members have responded to the Weekend Operation RSVP.",
          id: "community.attendance.rsvp_coverage",
          message: packageData.weekendOperation
            ? `${rsvpCoverage}% RSVP coverage for the linked Weekend Operation.`
            : "RSVP coverage is unavailable until a Weekend Operation is linked.",
          now,
          providerId,
          recommendedAction: !packageData.weekendOperation
            ? "Link a Weekend Operation."
            : rsvpCoverage >= 75
              ? "Keep monitoring late RSVP changes."
              : "Push RSVP reminders before final planning.",
          relatedEntityId: packageData.weekendOperation?.id ?? null,
          relatedEntityType: packageData.weekendOperation ? "Event" : null,
          status: !packageData.weekendOperation ? "NOT_APPLICABLE" : rsvpCoverage >= 75 ? "PASS" : "WARNING",
          title: "RSVP coverage",
        }),
        healthRule({
          category: "community",
          description: "Attendance records exist for the Weekend Operation when expected.",
          id: "community.attendance.records",
          message: packageData.weekendOperation
            ? attendanceTotal > 0
              ? `${attendanceTotal} attendance records are visible.`
              : "No attendance records are visible yet."
            : "Attendance records are unavailable until a Weekend Operation is linked.",
          now,
          providerId,
          recommendedAction: !packageData.weekendOperation
            ? "Link a Weekend Operation."
            : attendanceTotal > 0
              ? "Use attendance completion to inform community health."
              : "Confirm attendance/RSVP rows have been generated.",
          relatedEntityId: packageData.weekendOperation?.id ?? null,
          relatedEntityType: packageData.weekendOperation ? "Event" : null,
          status: !packageData.weekendOperation ? "NOT_APPLICABLE" : attendanceTotal > 0 ? "PASS" : "WARNING",
          title: "Attendance records",
        }),
        healthRule({
          category: "community",
          description: "Qualification health architecture is ready for deeper provider integration.",
          id: "community.qualifications.provider_ready",
          message: "Qualification readiness provider is not yet contributing detailed health rules.",
          now,
          providerId,
          recommendedAction: "Add a qualifications health provider when Epic 5E+ needs richer community intelligence.",
          status: "NOT_APPLICABLE",
          title: "Qualification readiness provider",
        }),
      ];
    },
  };
}

operationalHealthRuleEngine.registerProvider(createPlanningHealthProvider());
operationalHealthRuleEngine.registerProvider(createExecutionHealthProvider());
operationalHealthRuleEngine.registerProvider(createCommunityHealthProvider());

export async function evaluateOperationalHealth(context: OperationalHealthContext): Promise<OperationalHealthSummary> {
  const output = await operationalHealthRuleEngine.evaluate(context, {
    domains: ["operations"],
  });
  const rules = output.results as HealthRuleResult[];
  const categoryScores = {
    community: scoreFromRules(
      "community",
      rules.filter((rule) => rule.category === "community"),
    ),
    execution: scoreFromRules(
      "execution",
      rules.filter((rule) => rule.category === "execution"),
    ),
    planning: scoreFromRules(
      "planning",
      rules.filter((rule) => rule.category === "planning"),
    ),
  };
  const categories = Object.values(categoryScores);
  const overallScore =
    categories.length > 0
      ? Math.round(categories.reduce((total, category) => total + category.score, 0) / categories.length)
      : 0;
  const blockingIssues = rules.filter((rule) => rule.status === "FAIL");
  const warnings = rules.filter((rule) => rule.status === "WARNING");
  const lastEvaluatedAt = context.now;

  return {
    blockingIssues,
    categories: categoryScores,
    lastEvaluatedAt,
    overallScore,
    overallStatus: getHealthStatusLabel(overallScore, blockingIssues.length),
    recommendations: [...blockingIssues, ...warnings].slice(0, 8),
    trend: getOverallTrend(categories),
    warnings,
  };
}
