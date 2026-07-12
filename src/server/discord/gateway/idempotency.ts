import { prisma } from "@/server/database/client";

const terminalStatuses = ["queued", "processing", "processed", "skipped", "no_change", "completed"] as const;

export async function hasProcessedGatewayEvent(idempotencyKey: string) {
  const existing = await prisma.discordGatewayEventLog.findUnique({
    where: {
      idempotencyKey,
    },
    select: {
      status: true,
    },
  });

  return existing ? terminalStatuses.includes(existing.status as (typeof terminalStatuses)[number]) : false;
}

export function buildGatewayHandlerIdempotencyKey(input: {
  eventIdempotencyKey: string;
  handlerId: string;
  scope?: string | null;
}) {
  return ["gateway-handler", input.handlerId, input.scope ?? input.eventIdempotencyKey].join(":");
}
