import { prisma } from "@/server/database/client";

export async function ensureDefaultDiscordEventPolicy(input: {
  discordServerId: string;
  eventType: string;
  guildId: string;
}) {
  return prisma.discordEventPolicy.upsert({
    create: {
      discordServerId: input.discordServerId,
      eventType: input.eventType,
      guildId: input.guildId,
    },
    update: {},
    where: {
      discordServerId_eventType: {
        discordServerId: input.discordServerId,
        eventType: input.eventType,
      },
    },
  });
}

export async function getDiscordEventPolicy(input: {
  discordServerId: string;
  eventType: string;
  guildId: string;
}) {
  return (
    (await prisma.discordEventPolicy.findUnique({
      where: {
        discordServerId_eventType: {
          discordServerId: input.discordServerId,
          eventType: input.eventType,
        },
      },
    })) ??
    ensureDefaultDiscordEventPolicy({
      discordServerId: input.discordServerId,
      eventType: input.eventType,
      guildId: input.guildId,
    })
  );
}
