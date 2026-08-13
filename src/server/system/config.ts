import type {
  SystemConfig,
  SystemInfo,
} from "@/server/system/config-schema";
import { getSystemRuntimeConfig } from "@/server/system/runtime-config";

export function getSystemConfig(): SystemConfig {
  const runtime = getSystemRuntimeConfig();

  return {
    appEnv: runtime.appEnv,
    appUrl: runtime.appUrl,
    authUrl: runtime.authUrl,
    nodeEnv: runtime.nodeEnv,
  };
}

export function getSystemInfo(): SystemInfo {
  const runtime = getSystemRuntimeConfig();

  return {
    application: {
      name: runtime.applicationName,
      version: runtime.applicationVersion,
    },
    environment: {
      appEnv: runtime.appEnv,
      nodeEnv: runtime.nodeEnv,
    },
    urls: {
      appUrl: runtime.appUrl,
      authUrl: runtime.authUrl,
    },
  };
}
