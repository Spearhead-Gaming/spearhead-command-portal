import { RuleEngine } from "@/server/rules/engine";
import { RuleRegistry } from "@/server/rules/registry";
import type {
  RuleCategory,
  RuleEvaluationContext,
  RuleEvaluationOptions,
  RuleProvider,
} from "@/server/rules/types";

export class RuleEngineService {
  private readonly engine: RuleEngine;
  private readonly registry: RuleRegistry;

  constructor(registry = new RuleRegistry()) {
    this.registry = registry;
    this.engine = new RuleEngine(this.registry);
  }

  registerProvider<TContext extends RuleEvaluationContext>(provider: RuleProvider<TContext>) {
    this.engine.registerProvider(provider);
  }

  async evaluate<TContext extends RuleEvaluationContext>(
    context: TContext,
    options?: RuleEvaluationOptions,
  ) {
    return this.engine.evaluate(context, options);
  }

  async evaluateCategory<TContext extends RuleEvaluationContext>(
    context: TContext,
    category: RuleCategory,
    options: Omit<RuleEvaluationOptions, "categories"> = {},
  ) {
    return this.evaluate(context, {
      ...options,
      categories: [category],
    });
  }

  async getSummary<TContext extends RuleEvaluationContext>(
    context: TContext,
    options?: RuleEvaluationOptions,
  ) {
    return (await this.evaluate(context, options)).summary;
  }

  async getRecommendations<TContext extends RuleEvaluationContext>(
    context: TContext,
    options?: RuleEvaluationOptions,
  ) {
    return (await this.getSummary(context, options)).recommendations;
  }

  async getCategorySummary<TContext extends RuleEvaluationContext>(
    context: TContext,
    category: RuleCategory,
    options: Omit<RuleEvaluationOptions, "categories"> = {},
  ) {
    return (await this.evaluateCategory(context, category, options)).summary.categories[category] ?? null;
  }
}

export const ruleEngineService = new RuleEngineService();
