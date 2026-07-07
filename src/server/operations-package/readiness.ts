import type {
  GoNoGoStatus,
  OperationsPackageData,
  ReadinessEvaluation,
  ReadinessRuleCategory,
  ReadinessRuleResult,
  ReadinessRuleSeverity,
  ReadinessRuleStatus,
} from "@/server/operations-package/types";

type RuleInput = {
  canPublish: boolean;
  discordEventChannelMapped: boolean;
  packageData: OperationsPackageData;
};

type RuleDefinition = {
  id: string;
  label: string;
  description: string;
  category: ReadinessRuleCategory;
  relatedEntityType?: string;
  evaluate: (input: RuleInput) => Omit<ReadinessRuleResult, "category" | "description" | "id" | "label">;
};

function ruleResult(input: {
  message: string;
  recommendedAction: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  severity?: ReadinessRuleSeverity;
  status: ReadinessRuleStatus;
}) {
  return {
    message: input.message,
    recommendedAction: input.recommendedAction,
    relatedEntityId: input.relatedEntityId ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    severity: input.severity ?? getDefaultSeverity(input.status),
    status: input.status,
  };
}

function getDefaultSeverity(status: ReadinessRuleStatus): ReadinessRuleSeverity {
  if (status === "FAIL") {
    return "blocking";
  }

  if (status === "WARNING") {
    return "warning";
  }

  return "info";
}

function resourceExists(packageData: OperationsPackageData, resourceType: string) {
  return packageData.resources.some((resource) => resource.resourceType === resourceType && resource.currentVersion);
}

function packageHasPreviewableContent(packageData: OperationsPackageData) {
  return Boolean(
    packageData.week.planningNotes ||
      packageData.week.operationalObjectives ||
      packageData.weeklyTasking?.operationalSummary ||
      packageData.weeklyTasking?.commandersIntent ||
      packageData.weeklyTasking?.timeline,
  );
}

function evaluateRule(definition: RuleDefinition, input: RuleInput): ReadinessRuleResult {
  const result = definition.evaluate(input);
  const { relatedEntityType, ...rest } = result;

  return {
    category: definition.category,
    description: definition.description,
    id: definition.id,
    label: definition.label,
    relatedEntityType: relatedEntityType ?? definition.relatedEntityType ?? null,
    ...rest,
  };
}

function scoreRules(category: ReadinessRuleCategory, rules: ReadinessRuleResult[]): ReadinessEvaluation {
  const applicableRules = rules.filter((rule) => rule.status !== "NOT_APPLICABLE");
  const completedChecks = applicableRules.filter((rule) => rule.status === "PASS").length;
  const blockingIssues = applicableRules.filter((rule) => rule.status === "FAIL").length;
  const warnings = applicableRules.filter((rule) => rule.status === "WARNING").length;
  const percentage =
    applicableRules.length > 0
      ? Math.round((completedChecks / applicableRules.length) * 100)
      : 0;
  const statusLabel =
    blockingIssues > 0
      ? "Blocked"
      : warnings > 0
        ? "Needs Attention"
        : percentage >= 100
          ? "Ready"
          : "Incomplete";

  return {
    category,
    lastEvaluatedAt: new Date(),
    rules,
    score: {
      blockingIssues,
      completedChecks,
      percentage,
      statusLabel,
      totalChecks: applicableRules.length,
      warnings,
    },
  };
}

const operationalRules: RuleDefinition[] = [
  {
    category: "operational",
    description: "The package anchor exists for the operational week.",
    id: "operational.package.exists",
    label: "Operations Package exists",
    relatedEntityType: "DeploymentWeek",
    evaluate: ({ packageData }) =>
      ruleResult({
        message: "Operations Package exists for this deployment week.",
        recommendedAction: "Continue planning.",
        relatedEntityId: packageData.week.id,
        status: "PASS",
      }),
  },
  {
    category: "operational",
    description: "A Weekend Operation is linked to the operational week.",
    id: "operational.weekend_operation.exists",
    label: "Weekend Operation linked",
    relatedEntityType: "Event",
    evaluate: ({ packageData }) =>
      packageData.weekendOperation
        ? ruleResult({
            message: "Weekend Operation is linked.",
            recommendedAction: "Review operation timing and attendance.",
            relatedEntityId: packageData.weekendOperation.id,
            status: "PASS",
          })
        : ruleResult({
            message: "No Weekend Operation is linked to this week.",
            recommendedAction: "Create or link the Weekend Operation for this deployment week.",
            status: "FAIL",
          }),
  },
  {
    category: "operational",
    description: "A Zeus owner is assigned or creator-as-Zeus is selected.",
    id: "operational.zeus.assigned",
    label: "Zeus assigned",
    evaluate: ({ packageData }) =>
      packageData.campaign.zeusAssignmentType === "creator" || Boolean(packageData.campaign.zeusName)
        ? ruleResult({
            message: `Zeus mode is ${packageData.campaign.zeusAssignmentType}.`,
            recommendedAction: "Confirm Zeus availability before review.",
            relatedEntityId: packageData.campaign.id,
            relatedEntityType: "Campaign",
            status: "PASS",
          })
        : ruleResult({
            message: "No Zeus assignment is currently visible.",
            recommendedAction: "Assign Zeus or explicitly mark the deployment as unassigned.",
            relatedEntityId: packageData.campaign.id,
            relatedEntityType: "Campaign",
            status: "FAIL",
          }),
  },
  {
    category: "operational",
    description: "Weekly Tasking exists for the linked Weekend Operation.",
    id: "operational.weekly_tasking.exists",
    label: "Weekly Tasking exists",
    relatedEntityType: "WeeklyTasking",
    evaluate: ({ packageData }) =>
      packageData.weeklyTasking
        ? ruleResult({
            message: "Weekly Tasking is initialized.",
            recommendedAction: "Review commander's intent and timeline.",
            relatedEntityId: packageData.weeklyTasking.id,
            status: "PASS",
          })
        : ruleResult({
            message: "Weekly Tasking has not been initialized.",
            recommendedAction: "Sync package structure after linking the Weekend Operation.",
            status: "FAIL",
          }),
  },
  {
    category: "operational",
    description: "Commander's Intent is present.",
    id: "operational.commanders_intent.exists",
    label: "Commander's Intent written",
    relatedEntityType: "WeeklyTasking",
    evaluate: ({ packageData }) =>
      packageData.weeklyTasking?.commandersIntent
        ? ruleResult({
            message: "Commander's Intent is present.",
            recommendedAction: "Review for clarity before package review.",
            relatedEntityId: packageData.weeklyTasking.id,
            status: "PASS",
          })
        : ruleResult({
            message: "Commander's Intent is missing.",
            recommendedAction: "Add Commander's Intent in Weekly Tasking.",
            relatedEntityId: packageData.weeklyTasking?.id ?? null,
            status: packageData.weeklyTasking ? "FAIL" : "NOT_APPLICABLE",
          }),
  },
  {
    category: "operational",
    description: "Unit Tasking rows exist for active units.",
    id: "operational.unit_taskings.exist",
    label: "Unit Taskings generated",
    evaluate: ({ packageData }) =>
      packageData.completion.unitTaskingsTotal > 0
        ? ruleResult({
            message: `${packageData.completion.unitTaskingsTotal} active unit tasking rows are present.`,
            recommendedAction: "Review each unit's assigned tasking.",
            relatedEntityId: packageData.weeklyTasking?.id ?? null,
            relatedEntityType: "WeeklyTasking",
            status: "PASS",
          })
        : ruleResult({
            message: "No active unit tasking rows are present.",
            recommendedAction: "Sync package structure and confirm active units.",
            relatedEntityId: packageData.weeklyTasking?.id ?? null,
            relatedEntityType: "WeeklyTasking",
            status: "FAIL",
          }),
  },
  {
    category: "operational",
    description: "Every active unit has a primary tasking objective.",
    id: "operational.unit_taskings.complete",
    label: "Unit Taskings complete",
    evaluate: ({ packageData }) =>
      packageData.completion.unitTaskingsComplete === packageData.completion.unitTaskingsTotal &&
      packageData.completion.unitTaskingsTotal > 0
        ? ruleResult({
            message: "Every active unit has a primary objective.",
            recommendedAction: "Review supporting assets and special instructions.",
            relatedEntityId: packageData.weeklyTasking?.id ?? null,
            relatedEntityType: "WeeklyTasking",
            status: "PASS",
          })
        : ruleResult({
            message: `${packageData.completion.unitTaskingsComplete}/${packageData.completion.unitTaskingsTotal} unit taskings have primary objectives.`,
            recommendedAction: "Fill missing primary objectives in Unit Taskings.",
            relatedEntityId: packageData.weeklyTasking?.id ?? null,
            relatedEntityType: "WeeklyTasking",
            status: "FAIL",
          }),
  },
  {
    category: "operational",
    description: "CONOP is attached as a resource or link.",
    id: "operational.conop.attached",
    label: "CONOP attached",
    evaluate: ({ packageData }) =>
      resourceExists(packageData, "CONOP")
        ? ruleResult({
            message: "CONOP is attached.",
            recommendedAction: "Confirm it is the current version.",
            status: "PASS",
          })
        : ruleResult({
            message: "CONOP is not attached.",
            recommendedAction: "Attach a CONOP file or link in Resources.",
            severity: "warning",
            status: "WARNING",
          }),
  },
  {
    category: "operational",
    description: "Deployment resources are inherited into the package.",
    id: "operational.resources.inherited",
    label: "Deployment resources available",
    evaluate: ({ packageData }) =>
      packageData.resources.length > 0
        ? ruleResult({
            message: `${packageData.resources.length} deployment resources are visible.`,
            recommendedAction: "Review resource versions before package review.",
            status: "PASS",
          })
        : ruleResult({
            message: "No deployment resources are visible.",
            recommendedAction: "Add OPORD, primer, preset, or supporting resources.",
            severity: "warning",
            status: "WARNING",
          }),
  },
  {
    category: "operational",
    description: "OPORD is attached where required by local planning practice.",
    id: "operational.resources.opord",
    label: "OPORD attached",
    evaluate: ({ packageData }) =>
      resourceExists(packageData, "OPORD")
        ? ruleResult({
            message: "OPORD is available.",
            recommendedAction: "Confirm the current version is correct.",
            status: "PASS",
          })
        : ruleResult({
            message: "OPORD is not attached.",
            recommendedAction: "Attach OPORD if this package requires one.",
            severity: "warning",
            status: "WARNING",
          }),
  },
  {
    category: "operational",
    description: "Player Primer is attached where useful for members.",
    id: "operational.resources.player_primer",
    label: "Player Primer attached",
    evaluate: ({ packageData }) =>
      resourceExists(packageData, "PLAYER_PRIMER")
        ? ruleResult({
            message: "Player Primer is available.",
            recommendedAction: "Confirm it is member-safe.",
            status: "PASS",
          })
        : ruleResult({
            message: "Player Primer is not attached.",
            recommendedAction: "Attach a Player Primer if members need prep material.",
            severity: "warning",
            status: "WARNING",
          }),
  },
  {
    category: "operational",
    description: "Current Arma 3 mod preset is attached.",
    id: "operational.resources.mod_preset",
    label: "Current Mod Preset attached",
    evaluate: ({ packageData }) =>
      resourceExists(packageData, "ARMA3_PRESET")
        ? ruleResult({
            message: "Current Mod Preset is available.",
            recommendedAction: "Confirm mod count and upload date.",
            status: "PASS",
          })
        : ruleResult({
            message: "Current Mod Preset is not attached.",
            recommendedAction: "Attach the current Arma 3 preset before member prep.",
            severity: "warning",
            status: "WARNING",
          }),
  },
  {
    category: "operational",
    description: "Weekly Tasking includes an execution timeline.",
    id: "operational.timeline.exists",
    label: "Timeline exists",
    relatedEntityType: "WeeklyTasking",
    evaluate: ({ packageData }) =>
      packageData.weeklyTasking?.timeline
        ? ruleResult({
            message: "Timeline is present.",
            recommendedAction: "Review timing against the Weekend Operation.",
            relatedEntityId: packageData.weeklyTasking.id,
            status: "PASS",
          })
        : ruleResult({
            message: "Timeline is missing.",
            recommendedAction: "Add timeline details in Weekly Tasking.",
            relatedEntityId: packageData.weeklyTasking?.id ?? null,
            status: packageData.weeklyTasking ? "FAIL" : "NOT_APPLICABLE",
          }),
  },
  {
    category: "operational",
    description: "Attendance and RSVP records are visible for the linked Weekend Operation.",
    id: "operational.attendance.configured",
    label: "Attendance / RSVP configured",
    relatedEntityType: "Event",
    evaluate: ({ packageData }) => {
      if (!packageData.weekendOperation) {
        return ruleResult({
          message: "No Weekend Operation is linked.",
          recommendedAction: "Link a Weekend Operation first.",
          status: "NOT_APPLICABLE",
        });
      }

      const rsvpTotal =
        packageData.weekendOperation.rsvpCounts.yes +
        packageData.weekendOperation.rsvpCounts.no +
        packageData.weekendOperation.rsvpCounts.maybe +
        packageData.weekendOperation.rsvpCounts.missing;

      return rsvpTotal > 0
        ? ruleResult({
            message: "RSVP/attendance tracking is visible.",
            recommendedAction: "Monitor missing RSVP before publication.",
            relatedEntityId: packageData.weekendOperation.id,
            status: "PASS",
          })
        : ruleResult({
            message: "No RSVP/attendance records are visible yet.",
            recommendedAction: "Confirm RSVP expectations before preview.",
            relatedEntityId: packageData.weekendOperation.id,
            severity: "warning",
            status: "WARNING",
          });
    },
  },
];

const publicationRules: RuleDefinition[] = [
  {
    category: "publication",
    description: "The current user has package or deployment publish permission.",
    id: "publication.permission.publish",
    label: "Publish permission",
    evaluate: ({ canPublish }) =>
      canPublish
        ? ruleResult({
            message: "Current user has publish permission.",
            recommendedAction: "Continue to preview when Epic 5C is available.",
            status: "PASS",
          })
        : ruleResult({
            message: "Current user does not have publish permission.",
            recommendedAction: "Ask an authorized S3 or deployment publisher to continue.",
            status: "FAIL",
          }),
  },
  {
    category: "publication",
    description: "Deployment is in a state that can be prepared for publication.",
    id: "publication.deployment.state",
    label: "Deployment state publishable",
    relatedEntityType: "Campaign",
    evaluate: ({ packageData }) =>
      ["planning", "preparing", "active"].includes(packageData.campaign.status)
        ? ruleResult({
            message: `Deployment status is ${packageData.campaign.status}.`,
            recommendedAction: "Continue publication preparation.",
            relatedEntityId: packageData.campaign.id,
            status: "PASS",
          })
        : ruleResult({
            message: `Deployment status ${packageData.campaign.status} is not ready for publication.`,
            recommendedAction: "Move the deployment to planning, preparing, or active before publishing.",
            relatedEntityId: packageData.campaign.id,
            status: "FAIL",
          }),
  },
  {
    category: "publication",
    description: "Operational week and package data can be addressed.",
    id: "publication.week.exists",
    label: "Operational Week exists",
    relatedEntityType: "DeploymentWeek",
    evaluate: ({ packageData }) =>
      ruleResult({
        message: `Operational Week ${packageData.week.weekNumber} exists.`,
        recommendedAction: "Continue package validation.",
        relatedEntityId: packageData.week.id,
        status: "PASS",
      }),
  },
  {
    category: "publication",
    description: "Package has enough content to preview an announcement later.",
    id: "publication.preview.content",
    label: "Previewable content exists",
    evaluate: ({ packageData }) =>
      packageHasPreviewableContent(packageData)
        ? ruleResult({
            message: "Package has previewable planning content.",
            recommendedAction: "Continue to preview when Epic 5C is available.",
            relatedEntityId: packageData.week.id,
            relatedEntityType: "DeploymentWeek",
            status: "PASS",
          })
        : ruleResult({
            message: "Package does not have enough content to preview.",
            recommendedAction: "Add planning notes, objectives, tasking summary, intent, or timeline.",
            relatedEntityId: packageData.week.id,
            relatedEntityType: "DeploymentWeek",
            status: "FAIL",
          }),
  },
  {
    category: "publication",
    description: "Required tasking exists before publication.",
    id: "publication.tasking.required",
    label: "Required tasking exists",
    relatedEntityType: "WeeklyTasking",
    evaluate: ({ packageData }) =>
      packageData.weeklyTasking
        ? ruleResult({
            message: "Weekly Tasking exists.",
            recommendedAction: "Review tasking before preview.",
            relatedEntityId: packageData.weeklyTasking.id,
            status: "PASS",
          })
        : ruleResult({
            message: "Weekly Tasking is missing.",
            recommendedAction: "Create Weekly Tasking before publication preview.",
            status: "FAIL",
          }),
  },
  {
    category: "publication",
    description: "A Discord event channel mapping exists for later publication.",
    id: "publication.discord.channel_mapping",
    label: "Discord channel mapping exists",
    relatedEntityType: "DiscordChannelMapping",
    evaluate: ({ discordEventChannelMapped }) =>
      discordEventChannelMapped
        ? ruleResult({
            message: "Discord event channel mapping exists.",
            recommendedAction: "Confirm visibility during Epic 5C preview.",
            status: "PASS",
          })
        : ruleResult({
            message: "No active Discord event channel mapping was found.",
            recommendedAction: "Configure Administration > Discord channel mappings.",
            status: "FAIL",
          }),
  },
  {
    category: "publication",
    description: "RSVP is enabled or intentionally absent before publication.",
    id: "publication.rsvp.configured",
    label: "RSVP publication state known",
    relatedEntityType: "Event",
    evaluate: ({ packageData }) =>
      packageData.weekendOperation
        ? ruleResult({
            message: "Weekend Operation RSVP state is visible.",
            recommendedAction: "Confirm RSVP wording during preview.",
            relatedEntityId: packageData.weekendOperation.id,
            status: "PASS",
          })
        : ruleResult({
            message: "RSVP state cannot be checked without a Weekend Operation.",
            recommendedAction: "Link a Weekend Operation before publication preview.",
            status: "FAIL",
          }),
  },
  {
    category: "publication",
    description: "Announcement content can be generated from the package.",
    id: "publication.announcement.generatable",
    label: "Announcement can be generated",
    evaluate: ({ packageData }) =>
      packageData.weekendOperation && packageHasPreviewableContent(packageData)
        ? ruleResult({
            message: "Package has the basic ingredients for a future announcement preview.",
            recommendedAction: "Continue to preview when Epic 5C is implemented.",
            relatedEntityId: packageData.weekendOperation.id,
            relatedEntityType: "Event",
            status: "PASS",
          })
        : ruleResult({
            message: "Announcement preview ingredients are incomplete.",
            recommendedAction: "Link a Weekend Operation and add planning/tasking content.",
            status: "FAIL",
          }),
  },
];

export function evaluateOperationalReadiness(input: RuleInput): ReadinessEvaluation {
  return scoreRules(
    "operational",
    operationalRules.map((rule) => evaluateRule(rule, input)),
  );
}

export function evaluatePublicationReadiness(input: RuleInput): ReadinessEvaluation {
  const operationalEvaluation = evaluateOperationalReadiness(input);
  const publicationRuleResults = publicationRules.map((rule) => evaluateRule(rule, input));
  const criticalOperationalFailures = operationalEvaluation.rules.filter((rule) => rule.status === "FAIL");
  const noCriticalOperationalFailuresRule: ReadinessRuleResult = {
    category: "publication",
    description: "Publication should not proceed while operational readiness has critical failures.",
    id: "publication.no_critical_failures",
    label: "No critical validation failures",
    message:
      criticalOperationalFailures.length > 0
        ? `${criticalOperationalFailures.length} operational readiness checks are blocking publication.`
        : "No critical operational readiness failures were found.",
    recommendedAction:
      criticalOperationalFailures.length > 0
        ? "Resolve blocking operational readiness issues before preview."
        : "Continue to preview when Epic 5C is available.",
    relatedEntityId: input.packageData.week.id,
    relatedEntityType: "DeploymentWeek",
    severity: criticalOperationalFailures.length > 0 ? "blocking" : "info",
    status: criticalOperationalFailures.length > 0 ? "FAIL" : "PASS",
  };

  return scoreRules("publication", [...publicationRuleResults, noCriticalOperationalFailuresRule]);
}

export function getGoNoGoStatus(input: RuleInput): GoNoGoStatus {
  const operational = evaluateOperationalReadiness(input);
  const publication = evaluatePublicationReadiness(input);
  const allRules = [...operational.rules, ...publication.rules];
  const blockingIssues = allRules.filter((rule) => rule.status === "FAIL");
  const warnings = allRules.filter((rule) => rule.status === "WARNING");
  const lastEvaluatedAt = new Date();

  return {
    blockingIssues,
    canContinueToPreview: blockingIssues.length === 0,
    canPublish: false,
    lastEvaluatedAt,
    operational: {
      ...operational,
      lastEvaluatedAt,
    },
    publication: {
      ...publication,
      lastEvaluatedAt,
    },
    recommendations: [...blockingIssues, ...warnings].slice(0, 6),
    warnings,
  };
}
