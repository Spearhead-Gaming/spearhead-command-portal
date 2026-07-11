import { recordGatewayEventFailure } from "@/server/discord/gateway/state-store";
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

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await handler.handle(event);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gateway handler failed.";

        if (attempt >= attempts) {
          await recordGatewayEventFailure({
            errorMessage: message,
            event,
            handlerId: handler.handlerId,
            idempotencyKey: `failed:${handler.handlerId}:${event.guildId ?? "global"}:${event.sequence ?? event.receivedAt.getTime()}`,
          });
          return;
        }

        await wait(handler.retry.backoffMs * attempt);
      }
    }
  }
}
