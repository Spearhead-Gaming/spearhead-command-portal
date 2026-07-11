import "dotenv/config";

import { DiscordGatewayService } from "../src/server/discord/gateway/service";

const gateway = new DiscordGatewayService();

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Stopping Discord Gateway worker...`);
  await gateway.stop(signal);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

gateway.start().catch((error) => {
  console.error(error instanceof Error ? error.message : "Discord Gateway worker failed.");
  process.exitCode = 1;
});
