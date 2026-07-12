import { evaluateDiscordEventManagementRules } from "@/server/discord/event-management/rules";

export async function getDiscordEventManagementRecommendations() {
  const rules = await evaluateDiscordEventManagementRules();

  return rules
    .filter((rule) => rule.status !== "PASS")
    .map((rule) => ({
      actionHref: "#discord-events",
      actionLabel: "Review events",
      description: rule.message,
      id: rule.id,
      severity: rule.severity,
      title: rule.title,
    }));
}
