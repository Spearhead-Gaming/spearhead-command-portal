import { getSystemRuntimeConfig } from "@/server/system/runtime-config";

function getTrimmedEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeBoolean(value: string, defaultValue = false) {
  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
}

function normalizePositiveInteger(value: string, defaultValue: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function normalizeIntents(value: string) {
  const defaultIntents = [
    "Guilds",
    "GuildMembers",
    "GuildVoiceStates",
  ] as const;

  const raw = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return raw.length > 0 ? raw : Array.from(defaultIntents);
}

function normalizeRegisterMode(value: string): "global" | "guild" {
  return value.toLowerCase() === "global" ? "global" : "guild";
}

export const DEFAULT_DISCORD_INTERACTION_SESSION_TTL_MINUTES = 15;

export type DiscordRuntimeConfig = {
  clientId: string;
  clientSecret: string;
  botToken: string;
  publicKey: string;
  applicationId: string;
  registerMode: "global" | "guild";
  devGuildId: string;
  legacyGuildId: string;
  interactionsUrl: string;
  syncBotAccounts: boolean;
  gatewayEnabled: boolean;
  gatewayIntents: string[];
  gatewayShardCount: number;
  gatewayHeartbeatTimeoutMs: number;
  gatewayReconnectMaxDelayMs: number;
  gatewayEventLogLevel: string;
  primaryGuildId: string;
  interactionSessionTtlMinutes: number;
};

export function getDiscordRuntimeConfig(): DiscordRuntimeConfig {
  const systemRuntime = getSystemRuntimeConfig();

  const clientId =
    getTrimmedEnvValue(process.env.DISCORD_CLIENT_ID) ||
    getTrimmedEnvValue(process.env.AUTH_DISCORD_ID);

  const clientSecret =
    getTrimmedEnvValue(process.env.DISCORD_CLIENT_SECRET) ||
    getTrimmedEnvValue(process.env.AUTH_DISCORD_SECRET);

  const applicationId =
    getTrimmedEnvValue(process.env.DISCORD_APPLICATION_ID) || clientId;

  const devGuildId =
    getTrimmedEnvValue(process.env.DISCORD_DEV_GUILD_ID) ||
    getTrimmedEnvValue(process.env.DISCORD_GUILD_ID);

  const legacyGuildId = getTrimmedEnvValue(
    process.env.DISCORD_GUILD_ID,
  );

  const interactionsUrl =
    getTrimmedEnvValue(process.env.DISCORD_INTERACTIONS_URL) ||
    `${systemRuntime.appUrl}/api/discord/interactions`;

  const rawSessionTtl = getTrimmedEnvValue(
    process.env.DISCORD_INTERACTION_SESSION_TTL_MINUTES,
  );

  return {
    clientId,
    clientSecret,
    botToken: getTrimmedEnvValue(process.env.DISCORD_BOT_TOKEN),
    publicKey: getTrimmedEnvValue(process.env.DISCORD_PUBLIC_KEY),
    applicationId,
    registerMode: normalizeRegisterMode(
      getTrimmedEnvValue(process.env.DISCORD_REGISTER_MODE),
    ),
    devGuildId,
    legacyGuildId,
    interactionsUrl,
    syncBotAccounts: normalizeBoolean(
      getTrimmedEnvValue(process.env.SYNC_DISCORD_BOTS),
    ),
    gatewayEnabled: normalizeBoolean(
      getTrimmedEnvValue(process.env.DISCORD_GATEWAY_ENABLED),
    ),
    gatewayIntents: normalizeIntents(
      getTrimmedEnvValue(process.env.DISCORD_GATEWAY_INTENTS),
    ),
    gatewayShardCount: normalizePositiveInteger(
      getTrimmedEnvValue(process.env.DISCORD_GATEWAY_SHARD_COUNT),
      1,
    ),
    gatewayHeartbeatTimeoutMs: normalizePositiveInteger(
      getTrimmedEnvValue(process.env.DISCORD_GATEWAY_HEARTBEAT_TIMEOUT),
      45000,
    ),
    gatewayReconnectMaxDelayMs: normalizePositiveInteger(
      getTrimmedEnvValue(process.env.DISCORD_GATEWAY_RECONNECT_MAX_DELAY),
      30000,
    ),
    gatewayEventLogLevel:
      getTrimmedEnvValue(
        process.env.DISCORD_GATEWAY_EVENT_LOG_LEVEL,
      ).toLowerCase() || "summary",
    primaryGuildId:
      getTrimmedEnvValue(process.env.DISCORD_PRIMARY_GUILD_ID) ||
      devGuildId ||
      legacyGuildId,
    interactionSessionTtlMinutes: Math.min(
      Math.max(
        Math.round(
          normalizePositiveInteger(
            rawSessionTtl,
            DEFAULT_DISCORD_INTERACTION_SESSION_TTL_MINUTES,
          ),
        ),
        1,
      ),
      24 * 60,
    ),
  };
}