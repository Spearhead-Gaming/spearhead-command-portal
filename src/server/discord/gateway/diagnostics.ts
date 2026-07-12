import { prisma } from "@/server/database/client";

export async function listFailedGatewayEvents(limit = 25) {
  return prisma.discordGatewayEventLog.findMany({
    where: {
      status: "failed",
    },
    include: {
      discordServer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      occurredAt: "desc",
    },
    take: limit,
  });
}

export async function getGatewayEventMetrics() {
  const staleCutoff = new Date(Date.now() - 1000 * 60 * 60);
  const [failedEventCount, processedEventCount, skippedEventCount, staleEventCount] = await Promise.all([
    prisma.discordGatewayEventLog.count({
      where: {
        status: "failed",
      },
    }),
    prisma.discordGatewayEventLog.count({
      where: {
        status: "processed",
      },
    }),
    prisma.discordGatewayEventLog.count({
      where: {
        status: "skipped",
      },
    }),
    prisma.discordGatewayEventLog.count({
      where: {
        occurredAt: {
          lt: staleCutoff,
        },
        status: {
          in: ["queued", "processing"],
        },
      },
    }),
  ]);

  return {
    failedEventCount,
    processedEventCount,
    skippedEventCount,
    staleEventCount,
  };
}

