import { RuleEngineService } from "@/server/rules/service";
import type { RuleEvaluationContext, RuleEvaluationResult, RuleProvider } from "@/server/rules/types";
import type { CasePriority } from "@/server/community-management/types";

type CommunityRuleFacts = {
  awaitingAssignment: number;
  awaitingDecision: number;
  criticalCases: number;
  failedModerationActions: number;
  missingEvidenceSeriousCases: number;
  overdueCases: number;
  staffOverloadCount: number;
};

function result(input: {
  id: string;
  message: string;
  recommendedAction: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PASS" | "WARNING" | "FAIL";
  title: string;
}): RuleEvaluationResult {
  return {
    category: "community",
    description: input.message,
    id: input.id,
    message: input.message,
    providerId: "community.case-health",
    recommendedAction: input.recommendedAction,
    relatedEntityId: null,
    relatedEntityType: "CommunityManagement",
    severity: input.severity,
    status: input.status,
    timestamp: new Date(),
    title: input.title,
  };
}

export function createCommunityCaseRuleProvider(): RuleProvider<RuleEvaluationContext & { facts: CommunityRuleFacts }> {
  return {
    category: "community",
    domain: "community-management",
    evaluate: (context) => {
      const facts = context.facts;

      return [
        result({
          id: "community.overdue-cases",
          message: `${facts.overdueCases} active cases are past due.`,
          recommendedAction: "Review overdue cases and reassign or resolve blockers.",
          severity: facts.overdueCases > 0 ? "HIGH" : "LOW",
          status: facts.overdueCases > 0 ? "WARNING" : "PASS",
          title: "Overdue case review",
        }),
        result({
          id: "community.unassigned-cases",
          message: `${facts.awaitingAssignment} cases are awaiting assignment.`,
          recommendedAction: "Assign ownership or route to a permission queue.",
          severity: facts.awaitingAssignment > 0 ? "MEDIUM" : "LOW",
          status: facts.awaitingAssignment > 0 ? "WARNING" : "PASS",
          title: "Cases awaiting assignment",
        }),
        result({
          id: "community.failed-moderation-actions",
          message: `${facts.failedModerationActions} moderation actions need follow-up.`,
          recommendedAction: "Open moderation history and resolve failed Discord actions.",
          severity: facts.failedModerationActions > 0 ? "HIGH" : "LOW",
          status: facts.failedModerationActions > 0 ? "FAIL" : "PASS",
          title: "Failed moderation action follow-up",
        }),
        result({
          id: "community.evidence-missing",
          message: `${facts.missingEvidenceSeriousCases} high priority cases have no evidence records.`,
          recommendedAction: "Request or attach supporting evidence before final decision.",
          severity: facts.missingEvidenceSeriousCases > 0 ? "MEDIUM" : "LOW",
          status: facts.missingEvidenceSeriousCases > 0 ? "WARNING" : "PASS",
          title: "Evidence needed for serious cases",
        }),
        result({
          id: "community.staff-workload",
          message: `${facts.staffOverloadCount} staff members have elevated active case workload.`,
          recommendedAction: "Review staff workload and consider reassignment.",
          severity: facts.staffOverloadCount > 0 ? "MEDIUM" : "LOW",
          status: facts.staffOverloadCount > 0 ? "WARNING" : "PASS",
          title: "Staff workload balance",
        }),
      ];
    },
    id: "community.case-health",
    name: "Community Case Health",
  };
}

export async function evaluateCommunityManagementRules(facts: CommunityRuleFacts) {
  const service = new RuleEngineService();

  service.registerProvider(createCommunityCaseRuleProvider());

  return service.evaluate({
    domain: "community-management",
    facts,
  });
}

export function getCommunityRecommendationsFromRules(results: RuleEvaluationResult[]): Array<{
  id: string;
  priority: CasePriority;
  recommendedAction: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  title: string;
}> {
  return results
    .filter((rule) => rule.status === "WARNING" || rule.status === "FAIL")
    .map((rule) => ({
      id: rule.id,
      priority: (
        rule.severity === "CRITICAL"
          ? "critical"
          : rule.severity === "HIGH"
            ? "high"
            : rule.severity === "MEDIUM"
              ? "medium"
              : "low"
      ) satisfies CasePriority,
      recommendedAction: rule.recommendedAction,
      relatedEntityId: rule.relatedEntityId,
      relatedEntityType: rule.relatedEntityType,
      title: rule.title,
    }));
}
