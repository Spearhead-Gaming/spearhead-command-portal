export type RuleStatus = "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";
export type RuleSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RuleCategory =
  | "planning"
  | "execution"
  | "community"
  | "resources"
  | "personnel"
  | "qualifications"
  | "attendance"
  | "communications"
  | "discord"
  | "security"
  | "compliance"
  | string;

export type RuleEvaluationContext = {
  domain?: string;
  now?: Date;
  subject?: {
    id?: string;
    type?: string;
  };
  facts?: Record<string, unknown>;
};

export type RuleEvaluationResult = {
  category: RuleCategory;
  description: string;
  id: string;
  message: string;
  metadata?: Record<string, unknown>;
  providerId: string;
  recommendedAction: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  severity: RuleSeverity;
  status: RuleStatus;
  timestamp: Date;
  title: string;
};

export type RuleProvider<TContext extends RuleEvaluationContext = RuleEvaluationContext> = {
  category: RuleCategory;
  domain: string;
  evaluate: (context: TContext) => RuleEvaluationResult[] | Promise<RuleEvaluationResult[]>;
  id: string;
  name: string;
  priority?: number;
};

export type RuleRecommendation = {
  category: RuleCategory;
  message: string;
  providerId: string;
  recommendedAction: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  ruleId: string;
  severity: RuleSeverity;
  status: RuleStatus;
  title: string;
};

export type RuleCategorySummary = {
  applicableRules: number;
  category: RuleCategory;
  completedRules: number;
  criticalFailures: number;
  failures: number;
  recommendations: RuleRecommendation[];
  totalRules: number;
  warnings: number;
};

export type RuleSummary = {
  applicableRules: number;
  categories: Record<string, RuleCategorySummary>;
  completedRules: number;
  criticalFailures: number;
  failures: number;
  recommendations: RuleRecommendation[];
  totalRules: number;
  warnings: number;
};

export type RuleEngineOutput = {
  results: RuleEvaluationResult[];
  summary: RuleSummary;
};

export type RuleEvaluationOptions = {
  categories?: RuleCategory[];
  domains?: string[];
  providerIds?: string[];
};
