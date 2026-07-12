import { prisma } from "@/server/database/client";

export async function getDiscordEventManagementOverview() {
  const [policies, links, plans, executions, drifts, observations] = await Promise.all([
    prisma.discordEventPolicy.findMany({
      orderBy: [{ guildId: "asc" }, { eventType: "asc" }],
      take: 250,
    }),
    prisma.discordEventLink.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    }),
    prisma.discordEventPlan.findMany({
      include: {
        targets: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.discordEventExecution.findMany({
      include: {
        actions: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.discordEventDrift.findMany({
      orderBy: {
        detectedAt: "desc",
      },
      take: 20,
    }),
    prisma.discordEventParticipationObservation.findMany({
      orderBy: {
        observedAt: "desc",
      },
      take: 20,
    }),
  ]);

  return {
    drifts,
    executions,
    links,
    observations,
    plans,
    policies,
    summary: {
      activePolicyCount: policies.filter((policy) => policy.integrationEnabled && !policy.archivedAt).length,
      driftCount: drifts.filter((drift) => drift.status === "open").length,
      linkedEventCount: links.filter((link) => !link.archivedAt).length,
      partialFailureCount: executions.filter((execution) => execution.status === "partial_success").length,
      pendingApprovalCount: plans.filter((plan) => plan.status === "approval_requested").length,
    },
  };
}
