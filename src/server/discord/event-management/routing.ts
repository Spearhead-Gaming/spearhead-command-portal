import { prisma } from "@/server/database/client";

export async function resolveDiscordEventTargetGuilds(input: {
  eventType: string;
  hostUnitId?: string | null;
}) {
  const servers = await prisma.discordServer.findMany({
    where: {
      archivedAt: null,
      isActive: true,
      OR: [
        {
          isPrimary: true,
        },
        input.hostUnitId
          ? {
              unitId: input.hostUnitId,
            }
          : {
              id: "__no_unit_server__",
            },
      ],
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return servers;
}
