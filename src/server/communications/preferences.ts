import { prisma } from "@/server/database/client";
import type { CommunicationChannelRequest, CommunicationPriority } from "@/server/communications/types";

export async function filterUsersByCommunicationPreferences(input: {
  category: string;
  priority: CommunicationPriority;
  requestedChannel: CommunicationChannelRequest;
  userIds: string[];
}) {
  if (input.userIds.length === 0) {
    return [];
  }

  const preferences = await prisma.communicationPreference.findMany({
    where: {
      category: input.category,
      userId: {
        in: input.userIds,
      },
    },
  });
  const preferencesByUserId = new Map(preferences.map((preference) => [preference.userId, preference]));

  return input.userIds.filter((userId) => {
    const preference = preferencesByUserId.get(userId);

    if (!preference) {
      return true;
    }

    if (preference.criticalOnly && input.priority !== "critical") {
      return false;
    }

    if (input.requestedChannel.type === "portal") {
      return preference.portalEnabled;
    }

    if (input.requestedChannel.type === "discord_channel") {
      return preference.discordChannelEnabled;
    }

    if (input.requestedChannel.type === "discord_dm") {
      return preference.discordDmEnabled;
    }

    if (input.requestedChannel.type === "email") {
      return preference.emailEnabled;
    }

    return true;
  });
}
