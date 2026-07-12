import { prisma } from "@/server/database/client";

export type DiscordEventManagementRule = {
  id: string;
  message: string;
  recommendedAction: string;
  severity: "info" | "warning" | "danger";
  status: "PASS" | "WARNING" | "FAIL";
  title: string;
};

export async function evaluateDiscordEventManagementRules(): Promise<DiscordEventManagementRule[]> {
  const [openDriftCount, partialFailureCount, missingPolicyCount] = await Promise.all([
    prisma.discordEventDrift.count({
      where: {
        status: "open",
      },
    }),
    prisma.discordEventExecution.count({
      where: {
        status: "partial_success",
      },
    }),
    prisma.discordEventPolicy.count({
      where: {
        integrationEnabled: false,
        archivedAt: null,
      },
    }),
  ]);

  return [
    {
      id: "discord-events.open-drift",
      message: openDriftCount
        ? `${openDriftCount} linked Discord Scheduled Event drift item(s) require review.`
        : "No linked Discord Scheduled Event drift is open.",
      recommendedAction: "Review Event Management drift and reapply Portal state only after validation.",
      severity: openDriftCount ? "warning" : "info",
      status: openDriftCount ? "WARNING" : "PASS",
      title: "Discord Event Drift",
    },
    {
      id: "discord-events.partial-failures",
      message: partialFailureCount
        ? `${partialFailureCount} multi-guild Discord Event execution(s) partially failed.`
        : "No partial Discord Event executions are unresolved.",
      recommendedAction: "Retry only failed guild targets after correcting permissions or policy.",
      severity: partialFailureCount ? "danger" : "info",
      status: partialFailureCount ? "FAIL" : "PASS",
      title: "Discord Event Partial Success",
    },
    {
      id: "discord-events.policy-defaults",
      message: missingPolicyCount
        ? `${missingPolicyCount} Discord Event policy record(s) are disabled or still at safe defaults.`
        : "Discord Event policies are configured for active integrations.",
      recommendedAction: "Enable only validated event types and keep preview/manual approval as the default rollout mode.",
      severity: missingPolicyCount ? "info" : "info",
      status: "PASS",
      title: "Discord Event Policy Defaults",
    },
  ];
}
