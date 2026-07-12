import { prisma } from "@/server/database/client";
import { checkFileStorageWritable } from "@/server/deployment/storage";
import { getDiscordGatewaySafeDiagnostics, getDiscordSafeConfigDiagnostics } from "@/server/discord/config";

type CheckStatus = "ok" | "degraded" | "error";

type HealthCheck = {
  detail?: string;
  status: CheckStatus;
};

export type HealthReport = {
  checks: {
    database?: HealthCheck;
    discord?: HealthCheck;
    fileStorage?: HealthCheck;
    gateway?: HealthCheck;
  };
  environment: string;
  service: string;
  status: CheckStatus;
  timestamp: string;
  uptimeSeconds: number;
  version: string;
};

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getStatus(checks: HealthReport["checks"]): CheckStatus {
  const statuses = Object.values(checks).map((check) => check.status);

  if (statuses.includes("error")) {
    return "error";
  }

  if (statuses.includes("degraded")) {
    return "degraded";
  }

  return "ok";
}

export function getLivenessReport(): HealthReport {
  return {
    checks: {},
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    service: "spearhead-command-portal",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    version: process.env.APP_VERSION ?? process.env.npm_package_version ?? "0.1.0",
  };
}

export async function getReadinessReport(): Promise<HealthReport> {
  const checks: HealthReport["checks"] = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok" };
  } catch (error) {
    checks.database = { detail: normalizeError(error), status: "error" };
  }

  try {
    await checkFileStorageWritable();
    checks.fileStorage = { status: "ok" };
  } catch (error) {
    checks.fileStorage = { detail: normalizeError(error), status: "error" };
  }

  const discord = getDiscordSafeConfigDiagnostics();
  checks.discord =
    discord.botTokenPresent && discord.applicationIdPresent
      ? { status: "ok" }
      : { detail: "Discord bot credentials are not fully configured.", status: "degraded" };

  const gateway = getDiscordGatewaySafeDiagnostics();
  checks.gateway =
    gateway.enabled && gateway.botTokenPresent
      ? { status: "ok" }
      : { detail: "Discord Gateway worker is disabled or not configured.", status: "degraded" };

  const baseReport = getLivenessReport();

  return {
    ...baseReport,
    checks,
    status: getStatus(checks),
  };
}
