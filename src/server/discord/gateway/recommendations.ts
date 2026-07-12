import type { RuleEvaluationResult } from "@/server/rules/types";
import type { DiscordGatewayStatus } from "@/server/discord/gateway/types";

export type DiscordGatewayRecommendation = {
  action: string;
  id: string;
  priority: "high" | "medium" | "low" | "informational";
  title: string;
};

function hasFailedRule(rules: RuleEvaluationResult[], id: string) {
  return rules.some((rule) => rule.id === id && rule.status !== "PASS");
}

export function getDiscordGatewayRecommendations(input: {
  enabled: boolean;
  failedEventCount?: number;
  hasBotToken: boolean;
  reconnectCount: number;
  rules: RuleEvaluationResult[];
  status: DiscordGatewayStatus;
}): DiscordGatewayRecommendation[] {
  const recommendations: DiscordGatewayRecommendation[] = [];

  if (!input.enabled || input.status === "disabled") {
    recommendations.push({
      action: "Set DISCORD_GATEWAY_ENABLED=true and run npm run dev:gateway when real-time Discord events are required.",
      id: "gateway.enable-worker",
      priority: "informational",
      title: "Gateway worker is disabled",
    });
  }

  if (!input.hasBotToken) {
    recommendations.push({
      action: "Add DISCORD_BOT_TOKEN to the worker environment. Never commit or print the token.",
      id: "gateway.configure-token",
      priority: "high",
      title: "Bot token is missing",
    });
  }

  if (hasFailedRule(input.rules, "gateway.connection")) {
    recommendations.push({
      action: "Check the gateway worker process, Discord API reachability, and recent Gateway event errors.",
      id: "gateway.restore-connection",
      priority: "high",
      title: "Gateway connection needs attention",
    });
  }

  if (hasFailedRule(input.rules, "gateway.guild-members-intent")) {
    recommendations.push({
      action: "Enable the Guild Members intent in the Discord Developer Portal and include GuildMembers in DISCORD_GATEWAY_INTENTS.",
      id: "gateway.enable-members-intent",
      priority: "medium",
      title: "Guild member events are not available",
    });
  }

  if (input.reconnectCount > 5) {
    recommendations.push({
      action: "Review network stability and Discord Gateway close/error events before enabling broader automation.",
      id: "gateway.review-reconnects",
      priority: "medium",
      title: "Gateway is reconnecting frequently",
    });
  }

  if ((input.failedEventCount ?? 0) > 0) {
    recommendations.push({
      action: "Open the Discord Operations Center Gateway queue, review safe error summaries, then retry only corrected events.",
      id: "gateway.review-failed-events",
      priority: "medium",
      title: "Gateway failed events need review",
    });
  }

  return recommendations;
}
