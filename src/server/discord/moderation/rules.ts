import { getDiscordModerationPlatformOverview } from "@/server/discord/moderation/queries";

export async function evaluateDiscordModerationRules() {
  const overview = await getDiscordModerationPlatformOverview();

  return [
    {
      id: "discord-moderation.failed-actions",
      message: overview.summary.failedActionCount
        ? `${overview.summary.failedActionCount} moderation action(s) need staff follow-up.`
        : "No failed Discord moderation actions need follow-up.",
      recommendedAction: "Open Discord moderation history and resolve failed or pending provider actions.",
      severity: overview.summary.failedActionCount ? "danger" : "info",
      status: overview.summary.failedActionCount ? "FAIL" : "PASS",
      title: "Failed moderation action follow-up",
    },
    {
      id: "discord-moderation.pending-approvals",
      message: overview.summary.pendingApprovalCount
        ? `${overview.summary.pendingApprovalCount} moderation approval(s) are waiting.`
        : "No moderation approvals are pending.",
      recommendedAction: "Review requested moderation actions before REST execution.",
      severity: overview.summary.pendingApprovalCount ? "warning" : "info",
      status: overview.summary.pendingApprovalCount ? "WARNING" : "PASS",
      title: "Pending moderation approvals",
    },
    {
      id: "discord-moderation.appeal-backlog",
      message: overview.summary.pendingAppealCount
        ? `${overview.summary.pendingAppealCount} appeal(s) need review.`
        : "No appeal backlog is open.",
      recommendedAction: "Review appeals attached to their original cases.",
      severity: overview.summary.pendingAppealCount ? "warning" : "info",
      status: overview.summary.pendingAppealCount ? "WARNING" : "PASS",
      title: "Appeal backlog",
    },
  ];
}
