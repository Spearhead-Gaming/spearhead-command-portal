import { RuleEngineService } from "@/server/rules/service";
import type { RuleEvaluationContext, RuleEvaluationResult, RuleProvider } from "@/server/rules/types";

export type DiscordGatewayHealthFacts = {
  enabled: boolean;
  guildCount: number;
  hasBotToken: boolean;
  hasGuildMembersIntent: boolean;
  lastErrorSummary: string | null;
  reconnectCount: number;
  status: string;
};

function gatewayRule(input: {
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
    providerId: "discord.gateway-health",
    recommendedAction: input.recommendedAction,
    relatedEntityId: null,
    relatedEntityType: "DiscordGatewayState",
    severity: input.severity,
    status: input.status,
    timestamp: new Date(),
    title: input.title,
  };
}

export function createDiscordGatewayHealthProvider(): RuleProvider<RuleEvaluationContext & { facts: DiscordGatewayHealthFacts }> {
  return {
    category: "discord",
    domain: "discord-gateway",
    evaluate: (context) => {
      const facts = context.facts;

      return [
        gatewayRule({
          id: "gateway.enabled",
          message: facts.enabled ? "Discord Gateway is enabled." : "Discord Gateway is disabled.",
          recommendedAction: "Enable DISCORD_GATEWAY_ENABLED only when real-time Discord events are needed.",
          severity: facts.enabled ? "LOW" : "LOW",
          status: facts.enabled ? "PASS" : "NOT_APPLICABLE",
          title: "Gateway enabled",
        }),
        gatewayRule({
          id: "gateway.connection",
          message: `Gateway status is ${facts.status}.`,
          recommendedAction: "Start or restart the dedicated Gateway worker if real-time events are required.",
          severity: facts.status === "connected" || !facts.enabled ? "LOW" : "HIGH",
          status: facts.status === "connected" || !facts.enabled ? "PASS" : "FAIL",
          title: "Gateway connection",
        }),
        gatewayRule({
          id: "gateway.guild-members-intent",
          message: facts.hasGuildMembersIntent
            ? "Guild Members intent is configured."
            : "Guild Members intent is not configured.",
          recommendedAction: "Enable Guild Members intent only when member join/update/leave sync is used.",
          severity: facts.hasGuildMembersIntent || !facts.enabled ? "LOW" : "HIGH",
          status: facts.hasGuildMembersIntent || !facts.enabled ? "PASS" : "WARNING",
          title: "Guild Members intent",
        }),
        gatewayRule({
          id: "gateway.reconnects",
          message: `${facts.reconnectCount} reconnects have been recorded.`,
          recommendedAction: "Review Gateway logs and Discord connectivity if reconnect count keeps rising.",
          severity: facts.reconnectCount > 5 ? "MEDIUM" : "LOW",
          status: facts.reconnectCount > 5 ? "WARNING" : "PASS",
          title: "Reconnect health",
        }),
      ];
    },
    id: "discord.gateway-health",
    name: "Discord Gateway Health Provider",
  };
}

export async function evaluateDiscordGatewayHealthRules(facts: DiscordGatewayHealthFacts) {
  const service = new RuleEngineService();

  service.registerProvider(createDiscordGatewayHealthProvider());

  return service.evaluate({
    domain: "discord-gateway",
    facts,
  });
}
