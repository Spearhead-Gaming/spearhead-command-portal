import { getSystemRuntimeConfig } from "@/server/system/runtime-config";

function getTrimmedEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

export type AuthRuntimeConfig = {
  discordClientId: string;
  discordClientSecret: string;
  developerLoginEnabled: boolean;
  developerLoginEmail: string;
  developerLoginSecret: string;
  nodeEnv: string;
};

export function getAuthRuntimeConfig(): AuthRuntimeConfig {
  const runtime = getSystemRuntimeConfig();

  return {
    discordClientId:
      getTrimmedEnvValue(process.env.DISCORD_CLIENT_ID) ||
      getTrimmedEnvValue(process.env.AUTH_DISCORD_ID),

    discordClientSecret:
      getTrimmedEnvValue(process.env.DISCORD_CLIENT_SECRET) ||
      getTrimmedEnvValue(process.env.AUTH_DISCORD_SECRET),

    developerLoginEnabled:
      getTrimmedEnvValue(process.env.ENABLE_DEV_LOGIN).toLowerCase() === "true",

    developerLoginEmail:
      getTrimmedEnvValue(process.env.DEV_LOGIN_EMAIL).toLowerCase(),

    developerLoginSecret:
      getTrimmedEnvValue(process.env.DEV_LOGIN_SECRET),

    nodeEnv: runtime.nodeEnv,
  };
}
