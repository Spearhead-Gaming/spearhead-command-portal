import type { DeploymentResourceView } from "@/server/deployment-resources/types";
import type { CommandIntentAssessmentView, CommandRecommendationView } from "@/server/recommendations/types";
import type { RuleEvaluationResult, RuleSeverity, RuleStatus } from "@/server/rules/types";

export type ReadinessRuleStatus = "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";
export type ReadinessRuleSeverity = "info" | "warning" | "blocking";
export type ReadinessRuleCategory = "operational" | "publication";

export type ReadinessRuleResult = {
  id: string;
  label: string;
  description: string;
  status: ReadinessRuleStatus;
  severity: ReadinessRuleSeverity;
  category: ReadinessRuleCategory;
  message: string;
  recommendedAction: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
};

export type ReadinessScore = {
  percentage: number;
  statusLabel: "Ready" | "Needs Attention" | "Blocked" | "Incomplete";
  blockingIssues: number;
  warnings: number;
  completedChecks: number;
  totalChecks: number;
};

export type ReadinessEvaluation = {
  category: ReadinessRuleCategory;
  score: ReadinessScore;
  rules: ReadinessRuleResult[];
  lastEvaluatedAt: Date;
};

export type GoNoGoStatus = {
  operational: ReadinessEvaluation;
  publication: ReadinessEvaluation;
  blockingIssues: ReadinessRuleResult[];
  warnings: ReadinessRuleResult[];
  recommendations: ReadinessRuleResult[];
  canContinueToPreview: boolean;
  canPublish: boolean;
  lastEvaluatedAt: Date;
};

export type OperationalHealthCategory = "planning" | "execution" | "community";
export type OperationalHealthRuleStatus = RuleStatus;
export type OperationalHealthSeverity = RuleSeverity;
export type OperationalHealthTrend = "improving" | "stable" | "declining";
export type OperationalHealthStatusLabel = "Excellent" | "Good" | "Fair" | "Poor" | "Critical";

export type HealthRuleResult = RuleEvaluationResult & {
  category: OperationalHealthCategory;
};

export type OperationalHealthCategoryScore = {
  category: OperationalHealthCategory;
  criticalIssues: number;
  lastEvaluatedAt: Date;
  rules: HealthRuleResult[];
  score: number;
  statusLabel: OperationalHealthStatusLabel;
  totalChecks: number;
  trend: OperationalHealthTrend;
  warnings: number;
};

export type OperationalHealthSummary = {
  blockingIssues: HealthRuleResult[];
  categories: Record<OperationalHealthCategory, OperationalHealthCategoryScore>;
  lastEvaluatedAt: Date;
  overallScore: number;
  overallStatus: OperationalHealthStatusLabel;
  recommendations: HealthRuleResult[];
  trend: OperationalHealthTrend;
  warnings: HealthRuleResult[];
};

export type OperationsReleaseStatus =
  | "draft"
  | "ready_for_review"
  | "approved"
  | "scheduled"
  | "published"
  | "superseded"
  | "archived";

export type OperationsReleaseResourceSnapshot = {
  displayName: string;
  downloadUrl: string | null;
  resourceType: string;
  resourceTypeLabel: string;
  updatedAt: Date | null;
  versionLabel: string;
};

export type OperationsReleasePreview = {
  actionUrl: string;
  campaignTitle: string;
  discordFields: Array<{
    label: string;
    value: string;
  }>;
  footer: string;
  releaseVersion: string;
  resources: OperationsReleaseResourceSnapshot[];
  summary: string;
  title: string;
  unitTaskings: OperationsPackageUnitTasking[];
  weekendOperation: OperationsPackageData["weekendOperation"];
  weekNumber: number;
  weeklyTasking: OperationsPackageData["weeklyTasking"];
};

export type OperationsReleaseHistoryItem = {
  id: string;
  amendmentSummary: string | null;
  archivedAt: Date | null;
  comparePlaceholderHref: string;
  discordChannelId: string | null;
  discordErrorMessage: string | null;
  discordMessageId: string | null;
  discordStatus: string;
  publishedAt: Date | null;
  publishedByName: string | null;
  releaseNotes: string | null;
  releaseVersion: string;
  scheduledFor: Date | null;
  status: string;
};

export type OperationsPackageUnitTasking = {
  id: string;
  unitId: string;
  unitName: string;
  unitShortName: string;
  primaryObjective: string | null;
  secondaryObjective: string | null;
  supportingAssets: string | null;
  specialEquipment: string | null;
  specialInstructions: string | null;
  unitNotes: string | null;
};

export type OperationsPackageData = {
  campaign: {
    id: string;
    key: string;
    title: string;
    status: string;
    phase: string | null;
    zeusAssignmentType: string;
    zeusName: string | null;
  };
  week: {
    id: string;
    weekNumber: number;
    label: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    planningStatus: string;
    notes: string | null;
    planningNotes: string | null;
    operationalObjectives: string | null;
    planningAssumptions: string | null;
    commandersIntent: string | null;
    commanderEndState: string | null;
    successCriteria: string | null;
    failureConditions: string | null;
    friendlySituation: string | null;
    enemySituation: string | null;
    intelligenceSummary: string | null;
    logistics: string | null;
    weather: string | null;
    specialInstructions: string | null;
    operationalNotes: string | null;
  };
  weekendOperation: {
    id: string;
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date | null;
    status: string;
    missionStatus: string;
    rsvpCounts: {
      yes: number;
      no: number;
      maybe: number;
      missing: number;
    };
    attendanceSummary: {
      present: number;
      absent: number;
      excused: number;
      late: number;
      loa: number;
      pending: number;
    };
  } | null;
  weeklyTasking: {
    id: string;
    weekNumber: number;
    operationalSummary: string | null;
    commandersIntent: string | null;
    friendlySituation: string | null;
    enemySituation: string | null;
    intelligenceSummary: string | null;
    logisticsNotes: string | null;
    weather: string | null;
    specialInstructions: string | null;
    operationalNotes: string | null;
    timeline: string | null;
    publishStatus: string;
    unitTaskings: OperationsPackageUnitTasking[];
  } | null;
  resources: DeploymentResourceView[];
  activity: Array<{
    id: string;
    action: string;
    summary: string;
    createdAt: Date;
    actorName: string | null;
  }>;
  completion: {
    planningFieldsComplete: number;
    planningFieldsTotal: number;
    unitTaskingsComplete: number;
    unitTaskingsTotal: number;
    hasWeekendOperation: boolean;
    hasTasking: boolean;
    hasConop: boolean;
    hasResources: boolean;
    percent: number;
  };
  permissions: {
    canEditPlanning: boolean;
    canManageResources: boolean;
    canManageTasking: boolean;
    canAssignZeus: boolean;
    canEvaluateReadiness: boolean;
    canViewHealth: boolean;
    canPublishPackage: boolean;
  };
  health: OperationalHealthSummary | null;
  recommendations: {
    active: CommandRecommendationView[];
    history: CommandRecommendationView[];
  };
  intentAssessment: CommandIntentAssessmentView;
  readiness: GoNoGoStatus | null;
  release: {
    current: OperationsReleaseHistoryItem | null;
    history: OperationsReleaseHistoryItem[];
    nextVersion: string;
    preview: OperationsReleasePreview | null;
  } | null;
};

export type CommanderDashboardData = {
  criticalIssues: CommandRecommendationView[];
  currentPackage: OperationsPackageData | null;
  operationalSummary: {
    currentDeploymentTitle: string | null;
    currentWeekNumber: number | null;
    healthStatus: string | null;
    operationalReadiness: string | null;
    publicationReadiness: string | null;
    recommendationCount: number;
  };
  recommendations: CommandRecommendationView[];
};
