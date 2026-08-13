import packageJson from "../../../package.json";

export const applicationEnvironments = [
  "development",
  "staging",
  "production",
] as const;

export type ApplicationEnvironment =
  (typeof applicationEnvironments)[number];

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

function resolveAuthUrl(appUrl: string) {
  return (
    getTrimmedEnvValue(process.env.AUTH_URL) ||
    getTrimmedEnvValue(process.env.NEXTAUTH_URL) ||
    appUrl
  ).replace(/\/+$/, "");
}

export type SystemRuntimeConfig = {
  appEnv: ApplicationEnvironment;
  nodeEnv: string;
  appUrl: string;
  authUrl: string;
  applicationName: string;
  applicationVersion: string;
};

export function getSystemRuntimeConfig(): SystemRuntimeConfig {
  const appUrl = resolveAppUrl();

  return {
    appEnv: resolveApplicationEnvironment(),
    nodeEnv: process.env.NODE_ENV ?? "development",
    appUrl,
    authUrl: resolveAuthUrl(appUrl),
    applicationName: packageJson.name,
    applicationVersion: packageJson.version,
  };
}
