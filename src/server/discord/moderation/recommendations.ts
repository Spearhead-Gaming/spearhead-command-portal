import { evaluateDiscordModerationRules } from "@/server/discord/moderation/rules";

export async function getDiscordModerationRecommendations() {
  const rules = await evaluateDiscordModerationRules();

  return rules
    .filter((rule) => rule.status !== "PASS")
    .map((rule) => ({
      actionHref: "#discord-moderation",
      actionLabel: "Review moderation",
      description: rule.message,
      id: rule.id,
      severity: rule.severity,
      title: rule.title,
    }));
}
