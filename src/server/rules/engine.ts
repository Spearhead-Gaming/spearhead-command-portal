import { RuleRegistry } from "@/server/rules/registry";
import type {
  RuleCategorySummary,
  RuleEngineOutput,
  RuleEvaluationContext,
  RuleEvaluationOptions,
  RuleEvaluationResult,
  RuleProvider,
  RuleRecommendation,
  RuleSummary,
} from "@/server/rules/types";

function toRecommendation(result: RuleEvaluationResult): RuleRecommendation {
  return {
    category: result.category,
    message: result.message,
    providerId: result.providerId,
    recommendedAction: result.recommendedAction,
    relatedEntityId: result.relatedEntityId,
    relatedEntityType: result.relatedEntityType,
    ruleId: result.id,
    severity: result.severity,
    status: result.status,
    title: result.title,
  };
}

function createEmptyCategorySummary(category: string): RuleCategorySummary {
  return {
    applicableRules: 0,
    category,
    completedRules: 0,
    criticalFailures: 0,
    failures: 0,
    recommendations: [],
    totalRules: 0,
    warnings: 0,
  };
}

export function summarizeRuleResults(results: RuleEvaluationResult[]): RuleSummary {
  const summary: RuleSummary = {
    applicableRules: 0,
    categories: {},
    completedRules: 0,
    criticalFailures: 0,
    failures: 0,
    recommendations: [],
    totalRules: results.length,
    warnings: 0,
  };

  for (const result of results) {
    const categoryKey = result.category;
    const categorySummary = summary.categories[categoryKey] ?? createEmptyCategorySummary(categoryKey);
    const isApplicable = result.status !== "NOT_APPLICABLE";

    categorySummary.totalRules += 1;

    if (isApplicable) {
      summary.applicableRules += 1;
      categorySummary.applicableRules += 1;
    }

    if (result.status === "PASS") {
      summary.completedRules += 1;
      categorySummary.completedRules += 1;
    }

    if (result.status === "WARNING") {
      summary.warnings += 1;
      categorySummary.warnings += 1;
      categorySummary.recommendations.push(toRecommendation(result));
      summary.recommendations.push(toRecommendation(result));
    }

    if (result.status === "FAIL") {
      summary.failures += 1;
      categorySummary.failures += 1;
      categorySummary.recommendations.push(toRecommendation(result));
      summary.recommendations.push(toRecommendation(result));
    }

    if (result.status === "FAIL" && result.severity === "CRITICAL") {
      summary.criticalFailures += 1;
      categorySummary.criticalFailures += 1;
    }

    summary.categories[categoryKey] = categorySummary;
  }

  summary.recommendations.sort((a, b) => {
    const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    return severityRank[a.severity] - severityRank[b.severity];
  });

  return summary;
}

export class RuleEngine {
  constructor(private readonly registry: RuleRegistry) {}

  registerProvider<TContext extends RuleEvaluationContext>(provider: RuleProvider<TContext>) {
    this.registry.registerProvider(provider);
  }

  async evaluate<TContext extends RuleEvaluationContext>(
    context: TContext,
    options: RuleEvaluationOptions = {},
  ): Promise<RuleEngineOutput> {
    const results: RuleEvaluationResult[] = [];

    for (const provider of this.getProviders(options)) {
      try {
        results.push(...(await provider.evaluate(context)));
      } catch {
        results.push({
          category: provider.category,
          description: "Provider evaluation failed before it could return rule results.",
          id: `${provider.id}.failed`,
          message: "A rule provider failed during evaluation.",
          providerId: provider.id,
          recommendedAction: "Review server logs and provider implementation.",
          relatedEntityId: context.subject?.id ?? null,
          relatedEntityType: context.subject?.type ?? null,
          severity: "CRITICAL",
          status: "FAIL",
          timestamp: context.now ?? new Date(),
          title: "Rule provider failed",
        });
      }
    }

    return {
      results,
      summary: summarizeRuleResults(results),
    };
  }

  private getProviders(options: RuleEvaluationOptions) {
    return this.registry.getProviders().filter((provider) => {
      const categoryMatches = !options.categories || options.categories.includes(provider.category);
      const domainMatches = !options.domains || options.domains.includes(provider.domain);
      const providerMatches = !options.providerIds || options.providerIds.includes(provider.id);

      return categoryMatches && domainMatches && providerMatches;
    });
  }
}
