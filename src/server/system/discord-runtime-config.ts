function getTrimmedEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizePositiveInteger(value: string, defaultValue: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

export type DiscordRuntimeConfig = {
  interactionSessionTtlMinutes: number;
};

export const DEFAULT_DISCORD_INTERACTION_SESSION_TTL_MINUTES = 15;

export function getDiscordRuntimeConfig(): DiscordRuntimeConfig {
  const rawTtl = getTrimmedEnvValue(
    process.env.DISCORD_INTERACTION_SESSION_TTL_MINUTES,
  );

  return {
    interactionSessionTtlMinutes: Math.min(
      Math.max(
        Math.round(
          normalizePositiveInteger(
            rawTtl,
            DEFAULT_DISCORD_INTERACTION_SESSION_TTL_MINUTES,
          ),
        ),
        1,
      ),
      24 * 60,
    ),
  };
}