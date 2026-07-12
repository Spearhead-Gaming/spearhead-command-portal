import type { RuleEvaluationResult, RuleProvider } from "@/server/rules/types";
import { RuleEngineService } from "@/server/rules/service";

import { getCommunicationPlatformOverview } from "@/server/communications/health";

export function createCommunicationPlatformRuleProvider(): RuleProvider {
  return {
    category: "communications",
    domain: "communications",
    evaluate: async () => {
      const overview = await getCommunicationPlatformOverview();
      const now = new Date();
      const results: RuleEvaluationResult[] = [];

      if (overview.health.missingDomainMappings > 0) {
        results.push({
          category: "communications",
          description: "Communication domains should resolve to active guild channel mappings.",
          id: "communications.domain-mappings.missing",
          message: `${overview.health.missingDomainMappings} domain-to-guild mapping gaps were detected.`,
          metadata: {
            missingDomainMappings: overview.health.missingDomainMappings,
          },
          providerId: "communications.platform.rules",
          recommendedAction: "Open Administration -> Discord -> Communications and map missing domains.",
          relatedEntityId: null,
          relatedEntityType: null,
          severity: "MEDIUM",
          status: "WARNING",
          timestamp: now,
          title: "Communication routing has mapping gaps",
        });
      }

      if (overview.health.failedDeliveries > 0) {
        results.push({
          category: "communications",
          description: "Failed communication deliveries should be reviewed and retried after configuration fixes.",
          id: "communications.delivery.failures",
          message: `${overview.health.failedDeliveries} recent communication delivery failure(s) need review.`,
          metadata: {
            failedDeliveries: overview.health.failedDeliveries,
          },
          providerId: "communications.platform.rules",
          recommendedAction: "Open communication deliveries and inspect provider errors.",
          relatedEntityId: null,
          relatedEntityType: null,
          severity: "HIGH",
          status: "FAIL",
          timestamp: now,
          title: "Communication delivery failures detected",
        });
      }

      if (overview.health.queueDepth > 10) {
        results.push({
          category: "communications",
          description: "Pending or retrying deliveries can indicate rate limits or provider degradation.",
          id: "communications.queue.backlog",
          message: `${overview.health.queueDepth} communication deliveries are pending or retrying.`,
          metadata: {
            queueDepth: overview.health.queueDepth,
          },
          providerId: "communications.platform.rules",
          recommendedAction: "Review communication delivery queue and Discord provider health.",
          relatedEntityId: null,
          relatedEntityType: null,
          severity: "MEDIUM",
          status: "WARNING",
          timestamp: now,
          title: "Communication queue backlog detected",
        });
      }

      if (results.length === 0) {
        results.push({
          category: "communications",
          description: "Communication routing, delivery failures, and queue depth are within expected bounds.",
          id: "communications.platform.healthy",
          message: "Communication platform health checks are clear.",
          metadata: {
            totalDomains: overview.health.totalDomains,
          },
          providerId: "communications.platform.rules",
          recommendedAction: "No action required.",
          relatedEntityId: null,
          relatedEntityType: null,
          severity: "LOW",
          status: "PASS",
          timestamp: now,
          title: "Communication platform is healthy",
        });
      }

      return results;
    },
    id: "communications.platform.rules",
    name: "Communication Platform Rules",
    priority: 60,
  };
}

export async function evaluateCommunicationPlatformRules() {
  const service = new RuleEngineService();

  service.registerProvider(createCommunicationPlatformRuleProvider());

  return service.evaluate({
    domain: "communications",
  });
}
