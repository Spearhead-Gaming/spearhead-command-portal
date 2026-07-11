import type { HealthRuleResult, OperationsPackageData, ReadinessRuleResult } from "@/server/operations-package/types";

export type RecommendationStatus = "active" | "dismissed" | "resolved" | "expired";
export type RecommendationPriority = "critical" | "high" | "medium" | "low" | "informational";
export type RecommendationCategory =
  | "planning"
  | "execution"
  | "community"
  | "personnel"
  | "qualifications"
  | "attendance"
  | "patrols"
  | "resources"
  | "discord"
  | "security"
  | "compliance"
  | string;

export type SupportingRecommendationRule = {
  id: string;
  providerId?: string | null;
  category: string;
  title: string;
  status: string;
  severity: string;
  message: string;
  recommendedAction: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
};

export type AffectedRecommendationEntity = {
  href: string | null;
  id: string;
  label: string;
  type: string;
};

export type RecommendationAuditEntry = {
  action: string;
  actorName: string | null;
  createdAt: Date;
  id: string;
  summary: string;
};

export type CommandRecommendationView = {
  affectedEntities: AffectedRecommendationEntity[];
  auditHistory: RecommendationAuditEntry[];
  category: RecommendationCategory;
  createdAt: Date;
  details: string | null;
  dismissedAt: Date | null;
  id: string;
  priority: RecommendationPriority;
  reason: string;
  recommendedAction: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  resolvedAt: Date | null;
  severity: string;
  status: RecommendationStatus;
  summary: string;
  supportingRules: SupportingRecommendationRule[];
  title: string;
  updatedAt: Date;
};

export type CommandIntentAssessmentView = {
  assessedAt: Date | null;
  assessedByName: string | null;
  assessmentSummary: string | null;
  id: string;
  lessonsLearned: string | null;
  nextWeekRecommendations: string | null;
  status: string;
  supportingEvidence: string | null;
} | null;

export type RecommendationProviderContext = {
  packageData: OperationsPackageData;
};

export type DraftCommandRecommendation = {
  category: RecommendationCategory;
  details?: string | null;
  priority: RecommendationPriority;
  reason: string;
  recommendedAction: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  severity: string;
  sourceKey: string;
  summary: string;
  supportingRules: SupportingRecommendationRule[];
  title: string;
};

export type CommandRecommendationProvider = {
  category: RecommendationCategory;
  evaluate: (context: RecommendationProviderContext) => DraftCommandRecommendation[];
  id: string;
  name: string;
  priority?: number;
};

export type CommandRuleSource = HealthRuleResult | ReadinessRuleResult;
