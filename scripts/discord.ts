import "dotenv/config";

import {
  clearGuildDiscordSlashCommands,
  getDiscordRegistrationHealth,
  listDiscordSlashCommands,
  registerDiscordSlashCommands,
} from "../src/server/discord/commands/register";
import {
  getDiscordIntegrationConfig,
  getDiscordGatewaySafeDiagnostics,
  getDiscordSafeConfigDiagnostics,
} from "../src/server/discord/config";
import { getDiscordGatewayHealthSummary } from "../src/server/discord/gateway/health";

function printHeading(title: string) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

function printBoolean(label: string, value: boolean) {
  console.log(`${label}: ${value ? "yes" : "no"}`);
}

function printCommandList(commands: Array<{ id: string; name: string }>) {
  if (commands.length === 0) {
    console.log("No commands returned by Discord.");
    return;
  }

  for (const command of commands) {
    console.log(`- /${command.name} (${command.id})`);
  }
}

function printSafeConfigDiagnostics() {
  const diagnostics = getDiscordSafeConfigDiagnostics();
  const config = getDiscordIntegrationConfig();

  printHeading("Safe Discord Config");
  console.log(`Register mode: ${diagnostics.registerMode}`);
  printBoolean("DISCORD_BOT_TOKEN present", diagnostics.botTokenPresent);
  printBoolean("DISCORD_CLIENT_ID present", diagnostics.clientIdPresent);
  printBoolean("DISCORD_CLIENT_SECRET present", diagnostics.clientSecretPresent);
  printBoolean("DISCORD_APPLICATION_ID or client ID present", diagnostics.applicationIdPresent);
  printBoolean("Application ID looks like a Discord snowflake", diagnostics.applicationIdLooksValid);
  printBoolean("DISCORD_PUBLIC_KEY present", diagnostics.publicKeyPresent);
  printBoolean("DISCORD_DEV_GUILD_ID present", diagnostics.devGuildIdPresent);
  printBoolean("Dev guild ID looks like a Discord snowflake", diagnostics.devGuildIdLooksValid);
  printBoolean("Interaction URL configured", diagnostics.interactionsUrlConfigured);
  printBoolean("Interaction URL is localhost", diagnostics.interactionsUrlIsLocalhost);
  console.log(`Interaction endpoint: ${config.interactionsUrl || "(not configured)"}`);
  console.log("Secrets are intentionally not printed.");
}

function printSafeGatewayDiagnostics() {
  const diagnostics = getDiscordGatewaySafeDiagnostics();

  printHeading("Safe Discord Gateway Config");
  printBoolean("DISCORD_GATEWAY_ENABLED", diagnostics.enabled);
  printBoolean("DISCORD_BOT_TOKEN present", diagnostics.botTokenPresent);
  printBoolean("DISCORD_APPLICATION_ID present", diagnostics.applicationIdPresent);
  printBoolean("Primary guild configured", diagnostics.primaryGuildConfigured);
  printBoolean("Primary guild looks valid", diagnostics.primaryGuildLooksValid);
  console.log(`Intents: ${diagnostics.intents.join(", ") || "(none)"}`);
  console.log(`Shard count: ${diagnostics.shardCount}`);
  console.log(`Heartbeat timeout: ${diagnostics.heartbeatTimeoutMs}ms`);
  console.log(`Reconnect max delay: ${diagnostics.reconnectMaxDelayMs}ms`);
  console.log(`Event log level: ${diagnostics.eventLogLevel}`);
  console.log("Secrets are intentionally not printed.");
}

async function run() {
  const command = process.argv[2] ?? "health";

  switch (command) {
    case "commands:register": {
      printSafeConfigDiagnostics();
      const result = await registerDiscordSlashCommands();
      printHeading("Registered Commands");
      console.log(`Mode: ${result.mode}`);
      console.log(`Scope: ${result.scopeId ?? "global"}`);
      printCommandList(result.commands);
      return;
    }
    case "commands:list": {
      printSafeConfigDiagnostics();
      const result = await listDiscordSlashCommands();
      printHeading("Registered Commands");
      console.log(`Mode: ${result.mode}`);
      console.log(`Scope: ${result.scopeId ?? "global"}`);
      printCommandList(result.commands);
      return;
    }
    case "commands:clear:guild": {
      printSafeConfigDiagnostics();
      const result = await clearGuildDiscordSlashCommands();
      printHeading("Guild Commands Cleared");
      console.log(`Scope: ${result.scopeId}`);
      console.log("Guild command list was replaced with an empty list.");
      return;
    }
    case "health": {
      printSafeConfigDiagnostics();
      const result = await getDiscordRegistrationHealth();
      printHeading("Discord API Health");
      console.log(`Bot user: ${result.checks.botUser?.username ?? "unavailable"}`);
      console.log("Application ID: validated through slash-command API access");
      console.log(`Dev guild: ${result.checks.devGuild?.name ?? "not checked"}`);
      console.log(`Registered command count: ${result.checks.commands.length}`);
      console.log(
        result.config.interactionEndpoint.includes("localhost") ||
          result.config.interactionEndpoint.includes("127.0.0.1")
          ? "Interaction URL is local. Discord will require a public HTTPS tunnel for live testing."
          : "Interaction URL is not localhost. Ensure Discord Developer Portal points to this exact URL.",
      );
      return;
    }
    case "gateway:health": {
      printSafeGatewayDiagnostics();
      const health = await getDiscordGatewayHealthSummary();

      printHeading("Discord Gateway Health");
      console.log(`Status: ${health.status}`);
      console.log(`Enabled: ${health.enabled ? "yes" : "no"}`);
      console.log(`Bot user: ${health.botUsername ?? "unavailable"}`);
      console.log(`Guild count: ${health.guildCount}`);
      console.log(`Latency: ${health.latencyMs === null ? "unavailable" : `${health.latencyMs}ms`}`);
      console.log(`Reconnect count: ${health.reconnectCount}`);
      console.log(`Last connected: ${health.lastConnectedAtLabel ?? "not recorded"}`);
      console.log(`Last event: ${health.lastEventAtLabel ?? "not recorded"}`);
      console.log(`Registered handlers: ${health.eventHandlers.length}`);
      console.log(`Recent Gateway events: ${health.recentEvents.length}`);
      return;
    }
    default:
      throw new Error(
        `Unknown Discord script command "${command}". Use health, gateway:health, commands:register, commands:list, or commands:clear:guild.`,
      );
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Discord script failed.");
  process.exitCode = 1;
});
