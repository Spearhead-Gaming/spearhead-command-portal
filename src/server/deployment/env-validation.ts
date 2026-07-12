import { checkFileStorageWritable, getFileStorageRoot } from "@/server/deployment/storage";

type DeploymentTarget = "web" | "gateway" | "staging" | "production";

type ValidationOptions = {
  checkFileSystem?: boolean;
  target?: DeploymentTarget;
};

type ValidationIssue = {
  message: string;
  variable?: string;
};

export type DeploymentEnvironmentValidation = {
  errors: ValidationIssue[];
  ok: boolean;
  target: DeploymentTarget;
  warnings: ValidationIssue[];
};

const placeholderPatterns = [
  /^$/,
  /replace/i,
  /changeme/i,
  /change-me/i,
  /your-/i,
  /example/i,
  /placeholder/i,
];

function getEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function isPlaceholder(value: string) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function isSnowflake(value: string) {
  return /^\d{17,20}$/.test(value);
}

function parseBoolean(value: string) {
  return value.toLowerCase() === "true";
}

function addRequiredSecret(
  errors: ValidationIssue[],
  variable: string,
  minimumLength = 1,
) {
  const value = getEnv(variable);

  if (value.length < minimumLength || isPlaceholder(value)) {
    errors.push({
      message: `${variable} is required and must not be a placeholder.`,
      variable,
    });
  }
}

function addRequiredUrl(errors: ValidationIssue[], variable: string, options?: { httpsOnly?: boolean }) {
  const value = getEnv(variable);

  if (isPlaceholder(value)) {
    errors.push({ message: `${variable} is required and must not be a placeholder.`, variable });
    return;
  }

  try {
    const url = new URL(value);

    if (options?.httpsOnly && url.protocol !== "https:") {
      errors.push({ message: `${variable} must use HTTPS for staging/production.`, variable });
    }
  } catch {
    errors.push({ message: `${variable} must be a valid URL.`, variable });
  }
}

function addOptionalSnowflakeWarning(warnings: ValidationIssue[], variable: string) {
  const value = getEnv(variable);

  if (value.length > 0 && !isPlaceholder(value) && !isSnowflake(value)) {
    warnings.push({ message: `${variable} is present but does not look like a Discord snowflake.`, variable });
  }
}

function validateDatabaseUrl(errors: ValidationIssue[]) {
  const value = getEnv("DATABASE_URL");

  if (isPlaceholder(value)) {
    errors.push({
      message: "DATABASE_URL is required and must not be a placeholder.",
      variable: "DATABASE_URL",
    });
    return;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") {
      errors.push({
        message: "DATABASE_URL must use a mysql:// or mariadb:// URL for MariaDB.",
        variable: "DATABASE_URL",
      });
    }
  } catch {
    errors.push({ message: "DATABASE_URL must be a valid database URL.", variable: "DATABASE_URL" });
  }
}

function validateFileStorage(warnings: ValidationIssue[], errors: ValidationIssue[], target: DeploymentTarget) {
  const root = getFileStorageRoot();
  const isProductionLike = target === "staging" || target === "production";

  if (isProductionLike && /^[A-Za-z]:\\/.test(root)) {
    errors.push({
      message: "FILE_STORAGE_ROOT must be a Linux path inside Plesk/Docker staging or production.",
      variable: "FILE_STORAGE_ROOT",
    });
  }

  if (!getEnv("FILE_STORAGE_ROOT") && getEnv("FILE_STORAGE_PATH")) {
    warnings.push({
      message: "FILE_STORAGE_PATH is supported as a compatibility alias. Prefer FILE_STORAGE_ROOT.",
      variable: "FILE_STORAGE_PATH",
    });
  }
}

function validateDiscord(warnings: ValidationIssue[], errors: ValidationIssue[], target: DeploymentTarget) {
  const isProductionLike = target === "staging" || target === "production";
  const registerMode = getEnv("DISCORD_REGISTER_MODE").toLowerCase() || "guild";
  const gatewayEnabled = parseBoolean(getEnv("DISCORD_GATEWAY_ENABLED"));

  if (isProductionLike) {
    addRequiredSecret(errors, "DISCORD_CLIENT_ID");
    addRequiredSecret(errors, "DISCORD_CLIENT_SECRET");
    addRequiredSecret(errors, "DISCORD_APPLICATION_ID");
    addRequiredSecret(errors, "DISCORD_PUBLIC_KEY");
  }

  if (target === "gateway" || gatewayEnabled) {
    addRequiredSecret(errors, "DISCORD_BOT_TOKEN");
    addRequiredSecret(errors, "DISCORD_APPLICATION_ID");
  }

  if (registerMode === "guild" && !getEnv("DISCORD_DEV_GUILD_ID") && !getEnv("DISCORD_GUILD_ID")) {
    warnings.push({
      message: "Guild command registration needs DISCORD_DEV_GUILD_ID for local/staging testing.",
      variable: "DISCORD_DEV_GUILD_ID",
    });
  }

  if (target === "production" && registerMode === "guild") {
    warnings.push({
      message: "DISCORD_REGISTER_MODE=guild is intended for development/staging, not normal production rollout.",
      variable: "DISCORD_REGISTER_MODE",
    });
  }

  addOptionalSnowflakeWarning(warnings, "DISCORD_CLIENT_ID");
  addOptionalSnowflakeWarning(warnings, "DISCORD_APPLICATION_ID");
  addOptionalSnowflakeWarning(warnings, "DISCORD_DEV_GUILD_ID");
  addOptionalSnowflakeWarning(warnings, "DISCORD_GUILD_ID");
  addOptionalSnowflakeWarning(warnings, "DISCORD_PRIMARY_GUILD_ID");
}

function resolveTarget(target?: DeploymentTarget): DeploymentTarget {
  if (target) {
    return target;
  }

  const appEnv = getEnv("APP_ENV").toLowerCase();

  if (appEnv === "staging" || appEnv === "production") {
    return appEnv;
  }

  return "web";
}

export async function validateDeploymentEnvironment(
  options: ValidationOptions = {},
): Promise<DeploymentEnvironmentValidation> {
  const target = resolveTarget(options.target);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const isProductionLike = target === "staging" || target === "production";

  validateDatabaseUrl(errors);

  if (isProductionLike) {
    addRequiredUrl(errors, "AUTH_URL", { httpsOnly: true });
    addRequiredUrl(errors, "NEXT_PUBLIC_APP_URL", { httpsOnly: true });
    addRequiredSecret(errors, "AUTH_SECRET", 32);
  } else {
    addRequiredSecret(errors, "AUTH_SECRET", 16);
  }

  validateFileStorage(warnings, errors, target);
  validateDiscord(warnings, errors, target);

  if (target === "production" && parseBoolean(getEnv("ENABLE_DEV_LOGIN"))) {
    errors.push({
      message: "ENABLE_DEV_LOGIN must be false for production deployments.",
      variable: "ENABLE_DEV_LOGIN",
    });
  }

  if (parseBoolean(getEnv("ENABLE_DEV_LOGIN"))) {
    addRequiredSecret(errors, "DEV_LOGIN_SECRET", 24);
    warnings.push({
      message: "Developer bootstrap login is enabled. Disable it after access is restored.",
      variable: "ENABLE_DEV_LOGIN",
    });
  }

  if (options.checkFileSystem) {
    try {
      await checkFileStorageWritable();
    } catch {
      errors.push({
        message: "FILE_STORAGE_ROOT is not writable by the current process.",
        variable: "FILE_STORAGE_ROOT",
      });
    }
  }

  return {
    errors,
    ok: errors.length === 0,
    target,
    warnings,
  };
}
