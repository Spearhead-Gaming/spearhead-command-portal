import { prisma } from "@/server/database/client";

export async function getOrCreateDiscordModerationPolicy(input: {
  discordServerId: string;
  guildId: string;
}) {
  return prisma.discordModerationPolicy.upsert({
    create: {
      discordServerId: input.discordServerId,
      guildId: input.guildId,
    },
    update: {},
    where: {
      discordServerId: input.discordServerId,
    },
  });
}

export function getModerationApprovalMode(input: {
  action: string;
  policy: Awaited<ReturnType<typeof getOrCreateDiscordModerationPolicy>>;
}) {
  switch (input.action) {
    case "timeout":
    case "remove_timeout":
      return input.policy.timeoutApprovalMode;
    case "kick":
      return input.policy.kickApprovalMode;
    case "ban":
      return input.policy.banApprovalMode;
    case "unban":
      return input.policy.unbanApprovalMode;
    default:
      return "not_required";
  }
}
