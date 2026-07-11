import { DiscordGatewayClient } from "@/server/discord/gateway/client";

export class DiscordGatewayService {
  private readonly client = new DiscordGatewayClient();

  async start() {
    await this.client.start();
  }

  async stop(reason?: string) {
    await this.client.stop(reason);
  }

  getRegisteredHandlers() {
    return this.client.getRegisteredHandlers();
  }
}
