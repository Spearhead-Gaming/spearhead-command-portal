import { checkFileStorageWritable } from "@/server/deployment/storage";
import { getDeploymentRuntimeConfig } from "@/server/system/deployment-runtime-config";
import { getSystemRuntimeConfig } from "@/server/system/runtime-config";

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

function isPlaceholder(value: string) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function isSnowflake(value: string) {
  return /^\d{17,20}$/.test(value);
}

function addRequiredSecret(
  errors: ValidationIssue[],
  variable: string,
  value: string,
  minimumLength = 1,
) {
  if (value.length < minimumLength || isPlaceholder(value)) {
    errors.push({
      message: `${variable} is required and must not be a placeholder.`,
      variable,
    });
  }
}

function addRequiredUrl(
  errors: ValidationIssue[],
  variable: string,
  value: string,
  options?: { httpsOnly?: boolean },
) {
  if (isPlaceholder(value)) {
    errors.push({
      message: `${variable} is required and must not be a placeholder.`,
      variable,
    });
    return;
  }

  try {
    const url = new URL(value);

    if (options?.httpsOnly && url.protocol !== "https:") {
      errors.push({
        message: `${variable} must use HTTPS for staging/production.`,
        variable,
      });
    }
  } catch {
    errors.push({
      message: `${variable} must be a valid URL.`,
      variable,
    });
  }
}

function addOptionalSnowflakeWarning(
  warnings: ValidationIssue[],
  variable: string,
  value: string,
) {
  if (value.length > 0 && !isPlaceholder(value) && !isSnowflake(value)) {
    warnings.push({
      message: `${variable} is present but does not look like a Discord snowflake.`,
      variable,
    });
  }
}

function validateDatabaseUrl(
  errors: ValidationIssue[],
  databaseUrl: string,
) {
  if (isPlaceholder(databaseUrl)) {
    errors.push({
      message: "DATABASE_URL is required and must not be a placeholder.",
      variable: "DATABASE_URL",
    });
    return;
  }

  try {
    const url = new URL(databaseUrl);

    if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") {
      errors.push({
        message:
          "DATABASE_URL must use a mysql:// or mariadb:// URL for MariaDB.",
        variable: "DATABASE_URL",
      });
    }
  } catch {
    errors.push({
      message: "DATABASE_URL must be a valid database URL.",
      variable: "DATABASE_URL",
    });
  }
}

function validateFileStorage(
  warnings: ValidationIssue[],
  errors: ValidationIssue[],
  target: DeploymentTarget,
  fileStorageRoot: string,
  fileStoragePath: string,
) {
  const isProductionLike = target === "staging" || target === "production";

  if (isProductionLike && /^[A-Za-z]:\\/.test(fileStorageRoot)) {
    errors.push({
      message:
        "FILE_STORAGE_ROOT must be a Linux path inside Plesk/Docker staging or production.",
      variable: "FILE_STORAGE_ROOT",
    });
  }

  if (!fileStorageRoot && fileStoragePath) {
    warnings.push({
      message:
        "FILE_STORAGE_PATH is supported as a compatibility alias. Prefer FILE_STORAGE_ROOT.",
      variable: "FILE_STORAGE_PATH",
    });
  }
}

function validateDiscord(
  warnings: ValidationIssue[],
  errors: ValidationIssue[],
  target: DeploymentTarget,
  config: ReturnType<typeof getDeploymentRuntimeConfig>,
) {
  const isProductionLike =
    target === "staging" || target === "production";

  const registerMode = config.discordRegisterMode.toLowerCase() || "guild";
  const gatewayEnabled = config.discordGatewayEnabled;

  if (isProductionLike) {
    addRequiredSecret(errors, "DISCORD_CLIENT_ID", config.discordClientId);
    addRequiredSecret(
      errors,
      "DISCORD_CLIENT_SECRET",
      config.discordClientSecret,
    );
    addRequiredSecret(
      errors,
      "DISCORD_APPLICATION_ID",
      config.discordApplicationId,
    );
    addRequiredSecret(
      errors,
      "DISCORD_PUBLIC_KEY",
      config.discordPublicKey,
    );
  }

  if (target === "gateway" || gatewayEnabled) {
    addRequiredSecret(
      errors,
      "DISCORD_BOT_TOKEN",
      config.discordBotToken,
    );
    addRequiredSecret(
      errors,
      "DISCORD_APPLICATION_ID",
      config.discordApplicationId,
    );
  }

  if (
    registerMode === "guild" &&
    !config.discordDevGuildId &&
    !config.discordGuildId
  ) {
    warnings.push({
      message:
        "Guild command registration needs DISCORD_DEV_GUILD_ID for local/staging testing.",
      variable: "DISCORD_DEV_GUILD_ID",
    });
  }

  if (target === "production" && registerMode === "guild") {
    warnings.push({
      message:
        "DISCORD_REGISTER_MODE=guild is intended for development/staging, not normal production rollout.",
      variable: "DISCORD_REGISTER_MODE",
    });
  }

  addOptionalSnowflakeWarning(
    warnings,
    "DISCORD_CLIENT_ID",
    config.discordClientId,
  );
  addOptionalSnowflakeWarning(
    warnings,
    "DISCORD_APPLICATION_ID",
    config.discordApplicationId,
  );
  addOptionalSnowflakeWarning(
    warnings,
    "DISCORD_DEV_GUILD_ID",
    config.discordDevGuildId,
  );
  addOptionalSnowflakeWarning(
    warnings,
    "DISCORD_GUILD_ID",
    config.discordGuildId,
  );
  addOptionalSnowflakeWarning(
    warnings,
    "DISCORD_PRIMARY_GUILD_ID",
    config.discordPrimaryGuildId,
  );
}

function resolveTarget(
  target: DeploymentTarget | undefined,
  appEnv: ReturnType<typeof getSystemRuntimeConfig>["appEnv"],
): DeploymentTarget {
  if (target) {
    return target;
  }

  if (appEnv === "staging" || appEnv === "production") {
    return appEnv;
  }

  return "web";
}

export async function validateDeploymentEnvironment(
  options: ValidationOptions = {},
): Promise<DeploymentEnvironmentValidation> {
  const runtime = getDeploymentRuntimeConfig();
  const systemRuntime = getSystemRuntimeConfig();

  const target = resolveTarget(options.target, systemRuntime.appEnv);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const isProductionLike =
    target === "staging" || target === "production";

  validateDatabaseUrl(errors, runtime.databaseUrl);

  if (isProductionLike) {
    addRequiredUrl(errors, "AUTH_URL", runtime.authUrl, {
      httpsOnly: true,
    });

    addRequiredUrl(
      errors,
      "NEXT_PUBLIC_APP_URL",
      runtime.appUrl,
      {
        httpsOnly: true,
      },
    );

    addRequiredSecret(errors, "AUTH_SECRET", runtime.authSecret, 32);
  } else {
    addRequiredSecret(errors, "AUTH_SECRET", runtime.authSecret, 16);
  }

  validateFileStorage(
    warnings,
    errors,
    target,
    runtime.fileStorageRoot,
    runtime.fileStoragePath,
  );

  validateDiscord(warnings, errors, target, runtime);

  if (target === "production" && runtime.enableDevLogin) {
    errors.push({
      message:
        "ENABLE_DEV_LOGIN must be false for production deployments.",
      variable: "ENABLE_DEV_LOGIN",
    });
  }

  if (runtime.enableDevLogin) {
    addRequiredSecret(
      errors,
      "DEV_LOGIN_SECRET",
      runtime.devLoginSecret,
      24,
    );

    warnings.push({
      message:
        "Developer bootstrap login is enabled. Disable it after access is restored.",
      variable: "ENABLE_DEV_LOGIN",
    });
  }

  if (options.checkFileSystem) {
    try {
      await checkFileStorageWritable();
    } catch {
      errors.push({
        message:
          "FILE_STORAGE_ROOT is not writable by the current process.",
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
