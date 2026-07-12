import type { DiscordGuildChannel, DiscordEventPolicy } from "@prisma/client";

export function validateDiscordEventTarget(input: {
  channels: DiscordGuildChannel[];
  endsAt?: Date | null;
  policy: DiscordEventPolicy;
  startsAt: Date;
}) {
  const warnings: string[] = [];
  const blockingIssues: string[] = [];

  if (!input.policy.integrationEnabled) {
    blockingIssues.push("Event integration is disabled for this guild and event type.");
  }

  if (input.endsAt && input.endsAt < input.startsAt) {
    blockingIssues.push("End time cannot be before start time.");
  }

  if (input.policy.defaultEntityType === "external" && !input.policy.defaultExternalLocation) {
    blockingIssues.push("External Discord Scheduled Events require a location.");
  }

  if (input.policy.defaultEntityType === "voice" || input.policy.defaultEntityType === "stage") {
    const channel = input.channels.find((candidate) => candidate.channelId === input.policy.defaultChannelId);

    if (!input.policy.defaultChannelId) {
      blockingIssues.push(`${input.policy.defaultEntityType} events require a discovered channel.`);
    } else if (!channel || channel.isMissing || channel.isArchived) {
      blockingIssues.push("Selected Discord event channel is missing, archived, or undiscovered.");
    }
  }

  if (input.policy.manualApprovalRequired) {
    warnings.push("Manual approval is required before live Discord Scheduled Event changes.");
  }

  if (input.policy.testMode) {
    warnings.push("Policy is in test mode; review targets carefully before publishing.");
  }

  return {
    blockingIssues,
    validationStatus: blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "valid",
    warnings,
  } as const;
}
