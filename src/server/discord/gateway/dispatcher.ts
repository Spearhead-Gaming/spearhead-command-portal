import { recordGatewayEvent, recordGatewayEventFailure } from "@/server/discord/gateway/state-store";
import { hasProcessedGatewayEvent, buildGatewayHandlerIdempotencyKey } from "@/server/discord/gateway/idempotency";
import { resolveGatewayGuildPolicy } from "@/server/discord/gateway/policy";
import { enqueueGatewayEvent, markGatewayEventSkipped } from "@/server/discord/gateway/queue";
import type { DiscordGatewayEventEnvelope, DiscordGatewayEventHandler } from "@/server/discord/gateway/types";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class DiscordGatewayEventDispatcher {
  constructor(private readonly handlers: DiscordGatewayEventHandler[]) {}

  getHandlers() {
    return this.handlers;
  }

  dispatch(event: DiscordGatewayEventEnvelope) {
    const matchingHandlers = this.handlers.filter(
      (handler) => handler.enabled && handler.eventName === event.eventName,
    );

    for (const handler of matchingHandlers) {
      void this.runHandler(handler, event);
    }
  }

  private async runHandler(handler: DiscordGatewayEventHandler, event: DiscordGatewayEventEnvelope) {
    const attempts = Math.max(handler.retry.attempts, 1);
    const idempotencyKey =
      handler.getIdempotencyKey?.(event) ??
      buildGatewayHandlerIdempotencyKey({
        eventIdempotencyKey: event.idempotencyKey,
        handlerId: handler.handlerId,
      });

    if (await hasProcessedGatewayEvent(idempotencyKey)) {
      await markGatewayEventSkipped({
        event,
        handler,
        idempotencyKey,
        reason: `${handler.handlerId} skipped duplicate ${event.eventName}.`,
      });
      return;
    }

    const policy = await resolveGatewayGuildPolicy(event.guildId);

    if (event.guildId && !policy.isManaged && !["READY", "RESUMED"].includes(event.eventName)) {
      await markGatewayEventSkipped({
        event,
        handler,
        idempotencyKey,
        reason: `${handler.handlerId} ignored unmanaged guild ${event.guildId}.`,
      });
      return;
    }

    await enqueueGatewayEvent({
      event,
      handler,
      idempotencyKey,
    });

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await handler.handle(event);
        await recordGatewayEvent({
          event,
          handlerId: handler.handlerId,
          idempotencyKey,
          metadata: {
            handlerVersion: handler.version,
            idempotencyScope: handler.idempotencyScope ?? "event",
            owningDomain: handler.owningDomain,
            requiredIntents: handler.requiredIntents,
          },
          status: "processed",
          summary: `${handler.handlerId} processed ${event.eventName}.`,
        });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gateway handler failed.";

        if (attempt >= attempts) {
          await recordGatewayEventFailure({
            errorMessage: message,
            event,
            handlerId: handler.handlerId,
            idempotencyKey,
          });
          return;
        }

        await wait(handler.retry.backoffMs * attempt);
      }
    }
  }
}
