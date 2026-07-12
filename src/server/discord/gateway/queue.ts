import { recordGatewayEvent } from "@/server/discord/gateway/state-store";
import type { DiscordGatewayEventEnvelope, DiscordGatewayEventHandler } from "@/server/discord/gateway/types";

export async function enqueueGatewayEvent(input: {
  event: DiscordGatewayEventEnvelope;
  handler: DiscordGatewayEventHandler;
  idempotencyKey: string;
}) {
  await recordGatewayEvent({
    event: {
      ...input.event,
      processingStatus: "queued",
    },
    handlerId: input.handler.handlerId,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      correlationId: input.event.correlationId,
      handlerVersion: input.handler.version ?? "1",
      owningDomain: input.handler.owningDomain,
      requiredIntents: input.handler.requiredIntents,
    },
    status: "queued",
    summary: `${input.handler.handlerId} queued ${input.event.eventName}.`,
  });
}

export async function markGatewayEventSkipped(input: {
  event: DiscordGatewayEventEnvelope;
  handler: DiscordGatewayEventHandler;
  idempotencyKey: string;
  reason: string;
}) {
  await recordGatewayEvent({
    event: {
      ...input.event,
      processingStatus: "skipped",
    },
    handlerId: input.handler.handlerId,
    idempotencyKey: input.idempotencyKey,
    metadata: {
      correlationId: input.event.correlationId,
      reason: input.reason,
    },
    status: "skipped",
    summary: input.reason,
  });
}

