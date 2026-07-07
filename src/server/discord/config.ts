import { getDiscordInteractionSessionTtlMinutes } from "@/server/discord/interactions/sessions/constants";

declare global {
  var __spearheadDiscordProductionWarningShown__: boolean | undefined;
}

function getTrimmedEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeDiscordRegisterMode(value: string): "global" | "guild" {
  return value.toLowerCase() === "global" ? "global" : "guild";
}

function isLikelyDiscordSnowflake(value: string) {
  return /^\d{17,20}$/.test(value);
}

export function getDiscordIntegrationConfig() {
  const clientId =
    getTrimmedEnvValue(process.env.DISCORD_CLIENT_ID) ||
    getTrimmedEnvValue(process.env.AUTH_DISCORD_ID);
  const clientSecret =
    getTrimmedEnvValue(process.env.DISCORD_CLIENT_SECRET) ||
    getTrimmedEnvValue(process.env.AUTH_DISCORD_SECRET);
  const botToken = getTrimmedEnvValue(process.env.DISCORD_BOT_TOKEN);
  const publicKey = getTrimmedEnvValue(process.env.DISCORD_PUBLIC_KEY);
  const applicationId =
    getTrimmedEnvValue(process.env.DISCORD_APPLICATION_ID) || clientId;
  const registerMode = normalizeDiscordRegisterMode(
    getTrimmedEnvValue(process.env.DISCORD_REGISTER_MODE),
  );
  const devGuildId =
    getTrimmedEnvValue(process.env.DISCORD_DEV_GUILD_ID) ||
    getTrimmedEnvValue(process.env.DISCORD_GUILD_ID);
  const legacyGuildId = getTrimmedEnvValue(process.env.DISCORD_GUILD_ID);
  const publicAppUrl = (
    getTrimmedEnvValue(process.env.NEXT_PUBLIC_APP_URL) ||
    getTrimmedEnvValue(process.env.AUTH_URL) ||
    getTrimmedEnvValue(process.env.NEXTAUTH_URL) ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  const interactionsUrl =
    getTrimmedEnvValue(process.env.DISCORD_INTERACTIONS_URL) ||
    `${publicAppUrl}/api/discord/interactions`;

  if (
    process.env.NODE_ENV === "production" &&
    registerMode === "guild" &&
    !globalThis.__spearheadDiscordProductionWarningShown__
  ) {
    globalThis.__spearheadDiscordProductionWarningShown__ = true;
    console.warn(
      "DISCORD_REGISTER_MODE=guild is set in production. Prefer global slash-command registration unless you are actively testing a guild-scoped rollout.",
    );
  }

  return {
    applicationId,
    botToken,
    clientId,
    clientSecret,
    devGuildId,
    guildId: devGuildId,
    interactionsUrl,
    legacyGuildId,
    publicKey,
    publicAppUrl,
    registerMode,
  };
}

export function getPortalBaseUrl() {
  const candidate =
    getTrimmedEnvValue(process.env.AUTH_URL) ||
    getTrimmedEnvValue(process.env.NEXT_PUBLIC_APP_URL) ||
    getTrimmedEnvValue(process.env.NEXTAUTH_URL) ||
    "http://localhost:3000";

  return candidate.replace(/\/+$/, "");
}

export function isDiscordBotConfigured() {
  const config = getDiscordIntegrationConfig();

  return (
    config.applicationId.length > 0 &&
    config.botToken.length > 0
  );
}

export function isDiscordInteractionValidationConfigured() {
  return getDiscordIntegrationConfig().publicKey.length > 0;
}

export function isDiscordCommandRegistrationConfigured() {
  const config = getDiscordIntegrationConfig();

  return config.applicationId.length > 0 && config.botToken.length > 0;
}

export function getDiscordSafeConfigDiagnostics() {
  const config = getDiscordIntegrationConfig();
  const interactionUrl = config.interactionsUrl;
  const usesLocalInteractionUrl =
    interactionUrl.includes("localhost") ||
    interactionUrl.includes("127.0.0.1") ||
    interactionUrl.includes("[::1]");

  return {
    applicationIdPresent: config.applicationId.length > 0,
    applicationIdLooksValid: isLikelyDiscordSnowflake(config.applicationId),
    botTokenPresent: config.botToken.length > 0,
    clientIdPresent: config.clientId.length > 0,
    clientSecretPresent: config.clientSecret.length > 0,
    devGuildIdPresent: config.devGuildId.length > 0,
    devGuildIdLooksValid: config.devGuildId.length === 0 || isLikelyDiscordSnowflake(config.devGuildId),
    interactionEndpointPath: "/api/discord/interactions",
    interactionsUrlConfigured: config.interactionsUrl.length > 0,
    interactionsUrlIsLocalhost: usesLocalInteractionUrl,
    interactionSessionTtlMinutes: getDiscordInteractionSessionTtlMinutes(),
    publicAppUrlPresent: config.publicAppUrl.length > 0,
    publicKeyPresent: config.publicKey.length > 0,
    registerMode: config.registerMode,
    requiredForCommandRegistration: {
      applicationId: config.applicationId.length > 0,
      botToken: config.botToken.length > 0,
      devGuildId:
        config.registerMode === "global" ||
        (config.devGuildId.length > 0 && isLikelyDiscordSnowflake(config.devGuildId)),
    },
    requiredForInteractionWebhook: {
      publicKey: config.publicKey.length > 0,
      reachableHttpsUrl: config.interactionsUrl.startsWith("https://") && !usesLocalInteractionUrl,
    },
  };
}

export function shouldSyncDiscordBotAccounts() {
  return getTrimmedEnvValue(process.env.SYNC_DISCORD_BOTS).toLowerCase() === "true";
}
