import path from "node:path";

import { getSystemRuntimeConfig } from "@/server/system/runtime-config";

function getTrimmedEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

export type DeploymentRuntimeConfig = {
  databaseUrl: string;
  authSecret: string;
  fileStorageRoot: string;
  fileStoragePath: string;
  authUrl: string;
  appUrl: string;
  enableDevLogin: boolean;
  devLoginSecret: string;
  discordClientId: string;
  discordClientSecret: string;
  discordApplicationId: string;
  discordPublicKey: string;
  discordBotToken: string;
  discordRegisterMode: string;
  discordDevGuildId: string;
  discordGuildId: string;
  discordPrimaryGuildId: string;
  discordGatewayEnabled: boolean;
};

export function getDeploymentRuntimeConfig(): DeploymentRuntimeConfig {
  const runtime = getSystemRuntimeConfig();

  return {
    databaseUrl: getTrimmedEnvValue(process.env.DATABASE_URL),

    authSecret: getTrimmedEnvValue(process.env.AUTH_SECRET),

    fileStorageRoot: getTrimmedEnvValue(process.env.FILE_STORAGE_ROOT),

    fileStoragePath: getTrimmedEnvValue(process.env.FILE_STORAGE_PATH),

    authUrl: runtime.authUrl,

    appUrl: runtime.appUrl,

    enableDevLogin:
      getTrimmedEnvValue(process.env.ENABLE_DEV_LOGIN).toLowerCase() === "true",

    devLoginSecret: getTrimmedEnvValue(process.env.DEV_LOGIN_SECRET),

    discordClientId:
      getTrimmedEnvValue(process.env.DISCORD_CLIENT_ID) ||
      getTrimmedEnvValue(process.env.AUTH_DISCORD_ID),

    discordClientSecret:
      getTrimmedEnvValue(process.env.DISCORD_CLIENT_SECRET) ||
      getTrimmedEnvValue(process.env.AUTH_DISCORD_SECRET),

    discordApplicationId: getTrimmedEnvValue(
      process.env.DISCORD_APPLICATION_ID,
    ),

    discordPublicKey: getTrimmedEnvValue(process.env.DISCORD_PUBLIC_KEY),

    discordBotToken: getTrimmedEnvValue(process.env.DISCORD_BOT_TOKEN),

    discordRegisterMode:
      getTrimmedEnvValue(process.env.DISCORD_REGISTER_MODE) || "guild",

    discordDevGuildId: getTrimmedEnvValue(
      process.env.DISCORD_DEV_GUILD_ID,
    ),

    discordGuildId: getTrimmedEnvValue(process.env.DISCORD_GUILD_ID),

    discordPrimaryGuildId: getTrimmedEnvValue(
      process.env.DISCORD_PRIMARY_GUILD_ID,
    ),

    discordGatewayEnabled:
      getTrimmedEnvValue(
        process.env.DISCORD_GATEWAY_ENABLED,
      ).toLowerCase() === "true",
  };
}

export function getResolvedFileStorageRoot() {
  const config = getDeploymentRuntimeConfig();

  return (
    config.fileStorageRoot ||
    config.fileStoragePath ||
    path.join(process.cwd(), "storage")
  );
}