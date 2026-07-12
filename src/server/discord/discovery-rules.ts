import { RuleEngineService } from "@/server/rules/service";
import type { RuleEvaluationContext, RuleEvaluationResult, RuleProvider } from "@/server/rules/types";

export type DiscordDiscoveryHealthFacts = {
  guildCount: number;
  invalidMappingCount: number;
  neverDiscoveredGuildCount: number;
  openReconciliationCount: number;
  repeatedFailureCount: number;
  staleGuildCount: number;
};

function discoveryRule(input: {
  id: string;
  message: string;
  recommendedAction: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";
  title: string;
}): RuleEvaluationResult {
  return {
    category: "discord",
    description: input.message,
    id: input.id,
    message: input.message,
    providerId: "discord.resource-discovery",
    recommendedAction: input.recommendedAction,
    relatedEntityId: null,
    relatedEntityType: "DiscordResourceDiscovery",
    severity: input.severity,
    status: input.status,
    timestamp: new Date(),
    title: input.title,
  };
}

export function createDiscordDiscoveryRuleProvider(): RuleProvider<
  RuleEvaluationContext & { facts: DiscordDiscoveryHealthFacts }
> {
  return {
    category: "discord",
    domain: "discord-discovery",
    evaluate: (context) => {
      const facts = context.facts;

      return [
        discoveryRule({
          id: "discovery.guild-inventory",
          message:
            facts.neverDiscoveredGuildCount > 0
              ? `${facts.neverDiscoveredGuildCount} managed guilds have never completed resource discovery.`
              : "Managed guilds have completed at least one discovery pass.",
          recommendedAction: "Run full discovery for each managed guild before configuring mappings.",
          severity: facts.neverDiscoveredGuildCount > 0 ? "HIGH" : "LOW",
          status: facts.neverDiscoveredGuildCount > 0 ? "FAIL" : "PASS",
          title: "Guild resource inventory",
        }),
        discoveryRule({
          id: "discovery.staleness",
          message:
            facts.staleGuildCount > 0
              ? `${facts.staleGuildCount} guild inventories are stale.`
              : "No stale guild inventories were reported.",
          recommendedAction: "Run targeted or incremental discovery for stale guilds before publishing Discord-dependent workflows.",
          severity: facts.staleGuildCount > 0 ? "MEDIUM" : "LOW",
          status: facts.staleGuildCount > 0 ? "WARNING" : "PASS",
          title: "Discovery freshness",
        }),
        discoveryRule({
          id: "discovery.reconciliation",
          message:
            facts.openReconciliationCount > 0
              ? `${facts.openReconciliationCount} Discord resource reconciliation items are open.`
              : "No open Discord reconciliation items were reported.",
          recommendedAction: "Resolve, ignore, disable, or remap affected resources from the Discord Operations Center.",
          severity: facts.openReconciliationCount > 0 ? "HIGH" : "LOW",
          status: facts.openReconciliationCount > 0 ? "WARNING" : "PASS",
          title: "Resource reconciliation",
        }),
        discoveryRule({
          id: "discovery.invalid-mappings",
          message:
            facts.invalidMappingCount > 0
              ? `${facts.invalidMappingCount} mappings reference missing or invalid Discord resources.`
              : "No invalid Discord mappings were reported.",
          recommendedAction: "Do not auto-remap by name. Remap by Discord ID or disable the stale mapping.",
          severity: facts.invalidMappingCount > 0 ? "CRITICAL" : "LOW",
          status: facts.invalidMappingCount > 0 ? "FAIL" : "PASS",
          title: "Mapping integrity",
        }),
        discoveryRule({
          id: "discovery.failures",
          message:
            facts.repeatedFailureCount > 0
              ? `${facts.repeatedFailureCount} discovery scans have failed recently.`
              : "No repeated discovery failures were reported.",
          recommendedAction: "Review bot token, guild access, Discord API reachability, and rate-limit warnings.",
          severity: facts.repeatedFailureCount > 0 ? "HIGH" : "LOW",
          status: facts.repeatedFailureCount > 0 ? "WARNING" : "PASS",
          title: "Discovery failures",
        }),
      ];
    },
    id: "discord.resource-discovery",
    name: "Discord Resource Discovery Provider",
  };
}

export async function evaluateDiscordDiscoveryRules(facts: DiscordDiscoveryHealthFacts) {
  const service = new RuleEngineService();

  service.registerProvider(createDiscordDiscoveryRuleProvider());

  return service.evaluate({
    domain: "discord-discovery",
    facts,
  });
}
