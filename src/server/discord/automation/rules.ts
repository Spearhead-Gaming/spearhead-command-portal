import { RuleEngineService } from "@/server/rules/service";
import type { RuleEvaluationContext, RuleEvaluationResult, RuleProvider } from "@/server/rules/types";

export type DiscordAutomationRuleFacts = {
  automaticDefinitionsWithWarnings: number;
  failedActionCount: number;
  missingRoleCount: number;
  openConflictCount: number;
  openDriftCount: number;
  pendingApprovalCount: number;
  previewOnlyDefinitionCount: number;
  staleDefinitionCount: number;
};

function automationRule(input: {
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
    providerId: "discord.automation",
    recommendedAction: input.recommendedAction,
    relatedEntityId: null,
    relatedEntityType: "DiscordAutomation",
    severity: input.severity,
    status: input.status,
    timestamp: new Date(),
    title: input.title,
  };
}

export function createDiscordAutomationRuleProvider(): RuleProvider<
  RuleEvaluationContext & { facts: DiscordAutomationRuleFacts }
> {
  return {
    category: "discord",
    domain: "discord-automation",
    evaluate: ({ facts }) => [
      automationRule({
        id: "automation.preview-default",
        message: `${facts.previewOnlyDefinitionCount} automation definitions are in Preview Only mode.`,
        recommendedAction: "Preview role-changing automation before moving any definition to Manual Approval or Automatic.",
        severity: "LOW",
        status: facts.previewOnlyDefinitionCount > 0 ? "PASS" : "NOT_APPLICABLE",
        title: "Preview-first automation",
      }),
      automationRule({
        id: "automation.pending-approvals",
        message: `${facts.pendingApprovalCount} automation executions are awaiting approval.`,
        recommendedAction: "Review the approval queue and approve only validated actions.",
        severity: facts.pendingApprovalCount > 0 ? "MEDIUM" : "LOW",
        status: facts.pendingApprovalCount > 0 ? "WARNING" : "PASS",
        title: "Pending automation approvals",
      }),
      automationRule({
        id: "automation.failed-actions",
        message: `${facts.failedActionCount} Discord automation actions failed.`,
        recommendedAction: "Resolve configuration or Discord-side issues, then retry only safe failed actions.",
        severity: facts.failedActionCount > 0 ? "HIGH" : "LOW",
        status: facts.failedActionCount > 0 ? "FAIL" : "PASS",
        title: "Failed Discord role actions",
      }),
      automationRule({
        id: "automation.role-drift",
        message: `${facts.openDriftCount} role drift items are open.`,
        recommendedAction: "Review managed-role desired state before running broad synchronization.",
        severity: facts.openDriftCount > 0 ? "MEDIUM" : "LOW",
        status: facts.openDriftCount > 0 ? "WARNING" : "PASS",
        title: "Managed role drift",
      }),
      automationRule({
        id: "automation.conflicts",
        message: `${facts.openConflictCount} automation conflicts are open.`,
        recommendedAction: "Resolve conflicts manually; do not let automations silently choose a winner.",
        severity: facts.openConflictCount > 0 ? "CRITICAL" : "LOW",
        status: facts.openConflictCount > 0 ? "FAIL" : "PASS",
        title: "Automation conflicts",
      }),
      automationRule({
        id: "automation.automatic-warnings",
        message: `${facts.automaticDefinitionsWithWarnings} automatic definitions have critical warnings.`,
        recommendedAction: "Move risky definitions back to Preview Only or Manual Approval until validation passes.",
        severity: facts.automaticDefinitionsWithWarnings > 0 ? "CRITICAL" : "LOW",
        status: facts.automaticDefinitionsWithWarnings > 0 ? "FAIL" : "PASS",
        title: "Automatic mode safety",
      }),
    ],
    id: "discord.automation",
    name: "Discord Automation Rule Provider",
  };
}

export async function evaluateDiscordAutomationRules(facts: DiscordAutomationRuleFacts) {
  const service = new RuleEngineService();

  service.registerProvider(createDiscordAutomationRuleProvider());

  return service.evaluate({
    domain: "discord-automation",
    facts,
  });
}
