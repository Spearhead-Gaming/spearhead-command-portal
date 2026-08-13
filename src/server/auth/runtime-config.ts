import { getAuthRuntimeConfig } from "@/server/system/auth-runtime-config";

declare global {
  var __spearheadDevLoginProductionWarningShown__: boolean | undefined;
}

export function getDiscordOAuthConfig() {
  const config = getAuthRuntimeConfig();

  return {
    clientId: config.discordClientId,
    clientSecret: config.discordClientSecret,
  };
}

export function isDiscordOAuthConfigured() {
  const { clientId, clientSecret } = getDiscordOAuthConfig();

  return clientId.length > 0 && clientSecret.length > 0;
}

export function getDeveloperBootstrapConfig() {
  const config = getAuthRuntimeConfig();

  if (
    config.developerLoginEnabled &&
    config.nodeEnv === "production" &&
    !globalThis.__spearheadDevLoginProductionWarningShown__
  ) {
    globalThis.__spearheadDevLoginProductionWarningShown__ = true;

    console.warn(
      "Developer bootstrap login is enabled in production. Disable ENABLE_DEV_LOGIN as soon as Discord OAuth access is restored.",
    );
  }

  return {
    enabled:
      config.developerLoginEnabled &&
      config.developerLoginEmail.length > 0 &&
      config.developerLoginSecret.length > 0,
    email: config.developerLoginEmail,
    secret: config.developerLoginSecret,
  };
}

export function isDeveloperBootstrapEnabled() {
  return getDeveloperBootstrapConfig().enabled;
}

