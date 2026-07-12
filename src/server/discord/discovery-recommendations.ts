import type { RuleEvaluationResult } from "@/server/rules/types";

export type DiscordDiscoveryRecommendation = {
  action: string;
  href: string;
  id: string;
  priority: "critical" | "high" | "medium" | "low" | "informational";
  title: string;
};

function priorityFromRule(rule: RuleEvaluationResult): DiscordDiscoveryRecommendation["priority"] {
  if (rule.severity === "CRITICAL") {
    return "critical";
  }

  if (rule.severity === "HIGH") {
    return "high";
  }

  if (rule.severity === "MEDIUM") {
    return "medium";
  }

  if (rule.status === "PASS") {
    return "informational";
  }

  return "low";
}

export function getDiscordDiscoveryRecommendations(
  rules: RuleEvaluationResult[],
): DiscordDiscoveryRecommendation[] {
  return rules
    .filter((rule) => rule.status === "FAIL" || rule.status === "WARNING")
    .map((rule) => ({
      action: rule.recommendedAction,
      href: "/administration/discord#discord-reconciliation",
      id: `discord-discovery:${rule.id}`,
      priority: priorityFromRule(rule),
      title: rule.title,
    }));
}
