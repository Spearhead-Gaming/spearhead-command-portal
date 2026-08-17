import { getDiscordRuntimeConfig } from "@/server/system/discord-runtime-config";

export const discordInteractionSessionStatuses = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
] as const;

export type DiscordInteractionSessionStatus =
  (typeof discordInteractionSessionStatuses)[number];

export const discordInteractionWorkflowTypes = [
  "PATROL_CREATE",
  "PATROL_AAR",
  "AAR_SCREENSHOT_UPLOAD",
  "DEPLOYMENT_PUBLISH",
  "RESOURCE_UPLOAD",
  "APPROVAL_FLOW",
  "APPLICATION_START",
  "APPLICATION_REVIEW",
  "APPLICATION_INFORMATION_REQUEST",
] as const;

export type DiscordInteractionWorkflowType =
  (typeof discordInteractionWorkflowTypes)[number];

export const DEFAULT_DISCORD_INTERACTION_SESSION_TTL_MINUTES = 15;

export function getDiscordInteractionSessionTtlMinutes() {
  return getDiscordRuntimeConfig().interactionSessionTtlMinutes;
}

export function getDiscordInteractionSessionExpiration(ttlMinutes?: number) {
  const minutes = ttlMinutes ?? getDiscordInteractionSessionTtlMinutes();

  return new Date(Date.now() + minutes * 60 * 1000);
}

export function isDiscordInteractionSessionStatus(
  value: string,
): value is DiscordInteractionSessionStatus {
  return discordInteractionSessionStatuses.includes(
    value as DiscordInteractionSessionStatus,
  );
}

export function isDiscordInteractionWorkflowType(
  value: string,
): value is DiscordInteractionWorkflowType {
  return discordInteractionWorkflowTypes.includes(
    value as DiscordInteractionWorkflowType,
  );
}