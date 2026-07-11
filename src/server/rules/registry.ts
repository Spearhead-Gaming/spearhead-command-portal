import type { RuleEvaluationContext, RuleProvider } from "@/server/rules/types";

export class RuleRegistry {
  private readonly providers = new Map<string, RuleProvider>();

  registerProvider<TContext extends RuleEvaluationContext>(provider: RuleProvider<TContext>) {
    this.providers.set(provider.id, provider as RuleProvider);
  }

  getProvider(providerId: string) {
    return this.providers.get(providerId) ?? null;
  }

  getProviders() {
    return Array.from(this.providers.values()).sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }
}
