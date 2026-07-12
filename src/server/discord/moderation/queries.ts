import { prisma } from "@/server/database/client";

export async function getDiscordModerationPlatformOverview() {
  const [policies, actions, approvals, observations, openCases, appeals] = await Promise.all([
    prisma.discordModerationPolicy.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    }),
    prisma.discordModerationAction.findMany({
      include: {
        discordServer: true,
        relatedCase: true,
        targetMemberProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
    prisma.discordModerationApproval.findMany({
      orderBy: {
        requestedAt: "desc",
      },
      take: 50,
    }),
    prisma.discordModerationObservation.findMany({
      orderBy: {
        observedAt: "desc",
      },
      take: 50,
    }),
    prisma.communityCase.count({
      where: {
        caseType: {
          in: ["INCIDENT", "APPEAL"],
        },
        status: {
          in: ["open", "under_review", "awaiting_information", "pending_decision", "reopened", "appealed"],
        },
      },
    }),
    prisma.caseAppeal.count({
      where: {
        status: {
          in: ["submitted", "under_review", "additional_information"],
        },
      },
    }),
  ]);

  return {
    actions,
    appeals,
    approvals,
    observations,
    openCases,
    policies,
    summary: {
      activeBanCount: actions.filter((action) => action.action === "ban" && action.result === "succeeded" && !action.reversedAt).length,
      activeTimeoutCount: actions.filter((action) => action.action === "timeout" && action.result === "succeeded" && !action.reversedAt).length,
      failedActionCount: actions.filter((action) => action.result === "failed" || action.result === "pending_provider").length,
      openCaseCount: openCases,
      pendingAppealCount: appeals,
      pendingApprovalCount: approvals.filter((approval) => approval.status === "requested").length,
      warningCount: actions.filter((action) => action.action === "warning").length,
    },
  };
}
