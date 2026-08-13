import packageJson from "../../../package.json";

import type {
  ApplicationEnvironment,
  SystemConfig,
  SystemInfo,
} from "@/server/system/config-schema";
import { getApplicationVersion } from "@/server/system/version";

function getTrimmedEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function resolveApplicationEnvironment(): ApplicationEnvironment {
  const value = getTrimmedEnvValue(process.env.APP_ENV).toLowerCase();

  if (value === "production") {
    return "production";
  }

  if (value === "staging") {
    return "staging";
  }

  return "development";
}

function resolveAppUrl() {
  return (
    getTrimmedEnvValue(process.env.NEXT_PUBLIC_APP_URL) ||
    getTrimmedEnvValue(process.env.AUTH_URL) ||
    getTrimmedEnvValue(process.env.NEXTAUTH_URL) ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

function resolveAuthUrl() {
  return (
    getTrimmedEnvValue(process.env.AUTH_URL) ||
    getTrimmedEnvValue(process.env.NEXTAUTH_URL) ||
    resolveAppUrl()
  ).replace(/\/+$/, "");
}

export function getSystemConfig(): SystemConfig {
  return {
    appEnv: resolveApplicationEnvironment(),
    appUrl: resolveAppUrl(),
    authUrl: resolveAuthUrl(),
    nodeEnv: process.env.NODE_ENV ?? "development",
  };
}

export function getSystemInfo(): SystemInfo {
  const config = getSystemConfig();
  const version = getApplicationVersion();

  return {
    application: {
      name: version.name || packageJson.name,
      version: version.version,
    },
    environment: {
      appEnv: config.appEnv,
      nodeEnv: config.nodeEnv,
    },
    urls: {
      appUrl: config.appUrl,
      authUrl: config.authUrl,
    },
  };
}