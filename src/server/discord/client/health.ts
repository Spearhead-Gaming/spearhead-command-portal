import { isDiscordOAuthConfigured } from "@/server/auth/runtime-config";
import {
  getDiscordIntegrationConfig,
  isDiscordBotConfigured,
  isDiscordCommandRegistrationConfigured,
  isDiscordInteractionValidationConfigured,
} from "@/server/discord/config";
import type { DiscordBotHealthSummary } from "@/server/discord/types";

export function getDiscordBotHealthSummary(): DiscordBotHealthSummary {
  const config = getDiscordIntegrationConfig();
  const oauthConfigured = isDiscordOAuthConfigured();
  const publicKeyConfigured = config.publicKey.length > 0;
  const botTokenConfigured = config.botToken.length > 0;
  const applicationIdConfigured = config.applicationId.length > 0;
  const interactionValidationReady = isDiscordInteractionValidationConfigured();
  const commandRegistrationReady = isDiscordCommandRegistrationConfigured();
  const commandRegistrationMode = config.registerMode;
  const botConfigured = isDiscordBotConfigured();
  const interactionsUrlIsLocalhost =
    config.interactionsUrl.includes("localhost") ||
    config.interactionsUrl.includes("127.0.0.1") ||
    config.interactionsUrl.includes("[::1]");
  const shared = {
    devGuildConfigured: config.devGuildId.length > 0,
    interactionsUrlConfigured: config.interactionsUrl.length > 0,
    interactionsUrlIsLocalhost,
  };

  if (oauthConfigured && botConfigured && publicKeyConfigured) {
    return {
      applicationIdConfigured,
      botTokenConfigured,
      commandRegistrationMode,
      commandRegistrationReady,
      ...shared,
      interactionValidationReady,
      oauthConfigured,
      publicKeyConfigured,
      statusLabel: "Configured for placeholder delivery",
      summaryTone: "success",
    };
  }

  if (oauthConfigured || botConfigured || publicKeyConfigured) {
    return {
      applicationIdConfigured,
      botTokenConfigured,
      commandRegistrationMode,
      commandRegistrationReady,
      ...shared,
      interactionValidationReady,
      oauthConfigured,
      publicKeyConfigured,
      statusLabel: "Partially configured",
      summaryTone: "warning",
    };
  }

  return {
    applicationIdConfigured,
    botTokenConfigured,
    commandRegistrationMode,
    commandRegistrationReady,
    ...shared,
    interactionValidationReady,
    oauthConfigured,
    publicKeyConfigured,
    statusLabel: "Configuration pending",
    summaryTone: "muted",
  };
}
