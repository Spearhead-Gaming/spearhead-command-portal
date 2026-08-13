import { getDiscordInteractionSessionTtlMinutes } from "@/server/discord/interactions/sessions/constants";
import { getDiscordRuntimeConfig } from "@/server/system/discord-runtime-config";
import { getSystemRuntimeConfig } from "@/server/system/runtime-config";

declare global {
  var __spearheadDiscordProductionWarningShown__: boolean | undefined;
}

function isLikelyDiscordSnowflake(value: string) {
  return /^\d{17,20}$/.test(value);
}

export function getDiscordIntegrationConfig() {
  const runtime = getDiscordRuntimeConfig();
  const systemRuntime = getSystemRuntimeConfig();

  if (
    systemRuntime.nodeEnv === "production" &&
    runtime.registerMode === "guild" &&
    !globalThis.__spearheadDiscordProductionWarningShown__
  ) {
    globalThis.__spearheadDiscordProductionWarningShown__ = true;

    console.warn(
      "DISCORD_REGISTER_MODE=guild is set in production. Prefer global slash-command registration unless you are actively testing a guild-scoped rollout.",
    );
  }

  return {
    applicationId: runtime.applicationId,
    botToken: runtime.botToken,
    clientId: runtime.clientId,
    clientSecret: runtime.clientSecret,
    devGuildId: runtime.devGuildId,
    guildId: runtime.devGuildId,
    interactionsUrl: runtime.interactionsUrl,
    legacyGuildId: runtime.legacyGuildId,
    publicKey: runtime.publicKey,
    publicAppUrl: systemRuntime.appUrl,
    registerMode: runtime.registerMode,
  };
}

export function getPortalBaseUrl() {
  return getSystemRuntimeConfig().authUrl;
}

export function isDiscordBotConfigured() {
  const config = getDiscordIntegrationConfig();

  return config.applicationId.length > 0 && config.botToken.length > 0;
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
    devGuildIdLooksValid:
      config.devGuildId.length === 0 ||
      isLikelyDiscordSnowflake(config.devGuildId),
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
        (config.devGuildId.length > 0 &&
          isLikelyDiscordSnowflake(config.devGuildId)),
    },
    requiredForInteractionWebhook: {
      publicKey: config.publicKey.length > 0,
      reachableHttpsUrl:
        config.interactionsUrl.startsWith("https://") &&
        !usesLocalInteractionUrl,
    },
  };
}

export function shouldSyncDiscordBotAccounts() {
  return getDiscordRuntimeConfig().syncBotAccounts;
}

export function getDiscordGatewayConfig() {
  const runtime = getDiscordRuntimeConfig();

  return {
    applicationId: runtime.applicationId,
    botToken: runtime.botToken,
    enabled: runtime.gatewayEnabled,
    eventLogLevel: runtime.gatewayEventLogLevel,
    heartbeatTimeoutMs: runtime.gatewayHeartbeatTimeoutMs,
    intents: runtime.gatewayIntents,
    primaryGuildId: runtime.primaryGuildId,
    reconnectMaxDelayMs: runtime.gatewayReconnectMaxDelayMs,
    shardCount: runtime.gatewayShardCount,
  };
}

export function getDiscordGatewaySafeDiagnostics() {
  const config = getDiscordGatewayConfig();

  return {
    applicationIdPresent: config.applicationId.length > 0,
    botTokenPresent: config.botToken.length > 0,
    enabled: config.enabled,
    eventLogLevel: config.eventLogLevel,
    heartbeatTimeoutMs: config.heartbeatTimeoutMs,
    intents: config.intents,
    primaryGuildConfigured: config.primaryGuildId.length > 0,
    primaryGuildLooksValid:
      config.primaryGuildId.length === 0 ||
      isLikelyDiscordSnowflake(config.primaryGuildId),
    reconnectMaxDelayMs: config.reconnectMaxDelayMs,
    shardCount: config.shardCount,
  };
}
