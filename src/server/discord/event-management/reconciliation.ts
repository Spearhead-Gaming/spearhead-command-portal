import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/client";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function recordDiscordScheduledEventObservation(input: {
  discordScheduledEventId: string;
  discordServerId: string;
  guildId: string;
  observedState: Record<string, unknown>;
}) {
  const link = await prisma.discordEventLink.findFirst({
    where: {
      archivedAt: null,
      discordScheduledEventId: input.discordScheduledEventId,
      discordServerId: input.discordServerId,
    },
  });

  if (!link) {
    return null;
  }

  await prisma.discordEventLink.update({
    data: {
      currentDiscordStatus:
        typeof input.observedState.status === "string" ? input.observedState.status : link.currentDiscordStatus,
      lastObservedDiscordUpdate: new Date(),
    },
    where: {
      id: link.id,
    },
  });

  if (JSON.stringify(link.desiredPortalState ?? {}) === JSON.stringify(input.observedState)) {
    return null;
  }

  await prisma.discordEventLink.update({
    data: {
      driftState: "drift_detected",
    },
    where: {
      id: link.id,
    },
  });

  return prisma.discordEventDrift.create({
    data: {
      desiredState: link.desiredPortalState ? toJson(link.desiredPortalState) : undefined,
      discordEventLinkId: link.id,
      discordServerId: input.discordServerId,
      driftType: "discord_state_changed",
      guildId: input.guildId,
      observedState: toJson(input.observedState),
      summary: "Discord Scheduled Event state no longer matches the last Portal-published state.",
    },
  });
}
