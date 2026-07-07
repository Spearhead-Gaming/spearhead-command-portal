declare global {
  var __spearheadDevLoginProductionWarningShown__: boolean | undefined;
}

function getTrimmedEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getDiscordOAuthConfig() {
  return {
    clientId:
      getTrimmedEnvValue(process.env.DISCORD_CLIENT_ID) ||
      getTrimmedEnvValue(process.env.AUTH_DISCORD_ID),
    clientSecret:
      getTrimmedEnvValue(process.env.DISCORD_CLIENT_SECRET) ||
      getTrimmedEnvValue(process.env.AUTH_DISCORD_SECRET),
  };
}

export function isDiscordOAuthConfigured() {
  const { clientId, clientSecret } = getDiscordOAuthConfig();

  return clientId.length > 0 && clientSecret.length > 0;
}

export function getDeveloperBootstrapConfig() {
  const enabled = getTrimmedEnvValue(process.env.ENABLE_DEV_LOGIN).toLowerCase() === "true";
  const email = getTrimmedEnvValue(process.env.DEV_LOGIN_EMAIL).toLowerCase();
  const secret = getTrimmedEnvValue(process.env.DEV_LOGIN_SECRET);

  if (
    enabled &&
    process.env.NODE_ENV === "production" &&
    !globalThis.__spearheadDevLoginProductionWarningShown__
  ) {
    globalThis.__spearheadDevLoginProductionWarningShown__ = true;
    console.warn(
      "Developer bootstrap login is enabled in production. Disable ENABLE_DEV_LOGIN as soon as Discord OAuth access is restored.",
    );
  }

  return {
    enabled: enabled && email.length > 0 && secret.length > 0,
    email,
    secret,
  };
}

export function isDeveloperBootstrapEnabled() {
  return getDeveloperBootstrapConfig().enabled;
}
