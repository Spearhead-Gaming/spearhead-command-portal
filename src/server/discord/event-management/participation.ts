import { prisma } from "@/server/database/client";

export async function recordDiscordEventParticipationObservation(input: {
  discordScheduledEventId: string;
  discordUserId: string;
  guildId: string;
  participationStatus: "interested" | "removed";
}) {
  const server = await prisma.discordServer.findUnique({
    where: {
      guildId: input.guildId,
    },
  });

  if (!server) {
    return null;
  }

  const link = await prisma.discordEventLink.findFirst({
    where: {
      archivedAt: null,
      discordScheduledEventId: input.discordScheduledEventId,
      discordServerId: server.id,
    },
  });
  const identity = await prisma.discordGuildMemberState.findFirst({
    where: {
      discordUserId: input.discordUserId,
      isBot: false,
    },
    select: {
      memberProfileId: true,
      userId: true,
    },
  });

  return prisma.discordEventParticipationObservation.upsert({
    create: {
      discordEventLinkId: link?.id ?? null,
      discordScheduledEventId: input.discordScheduledEventId,
      discordServerId: server.id,
      discordUserId: input.discordUserId,
      guildId: input.guildId,
      memberProfileId: identity?.memberProfileId ?? null,
      participationStatus: input.participationStatus,
      portalEventId: link?.portalEventId ?? null,
      portalEventType: link?.portalEventType ?? null,
      userId: identity?.userId ?? null,
    },
    update: {
      discordEventLinkId: link?.id ?? null,
      memberProfileId: identity?.memberProfileId ?? null,
      observedAt: new Date(),
      portalEventId: link?.portalEventId ?? null,
      portalEventType: link?.portalEventType ?? null,
      userId: identity?.userId ?? null,
    },
    where: {
      discordScheduledEventId_discordUserId_participationStatus: {
        discordScheduledEventId: input.discordScheduledEventId,
        discordUserId: input.discordUserId,
        participationStatus: input.participationStatus,
      },
    },
  });
}
