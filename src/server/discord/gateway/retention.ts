import { prisma } from "@/server/database/client";

export async function cleanupGatewayEventRetention(input?: {
  processedRetentionDays?: number;
  skippedRetentionDays?: number;
}) {
  const processedRetentionDays = input?.processedRetentionDays ?? 30;
  const skippedRetentionDays = input?.skippedRetentionDays ?? 14;
  const processedCutoff = new Date(Date.now() - processedRetentionDays * 24 * 60 * 60 * 1000);
  const skippedCutoff = new Date(Date.now() - skippedRetentionDays * 24 * 60 * 60 * 1000);
  const [processed, skipped] = await Promise.all([
    prisma.discordGatewayEventLog.deleteMany({
      where: {
        occurredAt: {
          lt: processedCutoff,
        },
        status: {
          in: ["processed", "no_change", "completed"],
        },
      },
    }),
    prisma.discordGatewayEventLog.deleteMany({
      where: {
        occurredAt: {
          lt: skippedCutoff,
        },
        status: "skipped",
      },
    }),
  ]);

  return {
    processedDeleted: processed.count,
    skippedDeleted: skipped.count,
  };
}

