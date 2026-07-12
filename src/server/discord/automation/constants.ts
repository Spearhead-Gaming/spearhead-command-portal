export const discordAutomationTriggerTypes = [
  "qualification.awarded",
  "qualification.renewed",
  "qualification.revoked",
  "qualification.expired",
  "qualification.reinstated",
  "personnel.unit_assigned",
  "personnel.unit_removed",
  "personnel.position_assigned",
  "personnel.position_removed",
  "personnel.position_changed",
  "personnel.status_changed",
  "personnel.member_activated",
  "personnel.member_deactivated",
  "personnel.member_separated",
  "discord.identity_linked",
  "discord.member_joined_guild",
  "discord.member_left_guild",
  "discord.member_rejoined_guild",
  "discord.manual_sync_requested",
  "admin.manual_automation_run",
  "admin.mapping_changed",
  "admin.reconciliation_requested",
] as const;

export const discordAutomationExecutionModes = [
  "preview_only",
  "manual_approval",
  "automatic",
  "disabled",
] as const;

export const discordAutomationActionTypes = [
  "add_role",
  "remove_role",
  "replace_role",
  "sync_managed_roles",
  "set_nickname",
  "clear_managed_nickname",
  "send_portal_notification",
  "send_discord_channel_notification",
  "create_recommendation",
  "create_reconciliation_item",
  "record_audit_entry",
] as const;

export const discordAutomationExecutionStatuses = [
  "planned",
  "validating",
  "awaiting_approval",
  "approved",
  "running",
  "succeeded",
  "partial_success",
  "no_change",
  "failed",
  "cancelled",
  "superseded",
  "reconciliation_required",
] as const;

export const discordAutomationValidationStatuses = [
  "pass",
  "warning",
  "blocked",
  "not_applicable",
  "no_change",
] as const;

export type DiscordAutomationTriggerType = (typeof discordAutomationTriggerTypes)[number];
export type DiscordAutomationExecutionMode = (typeof discordAutomationExecutionModes)[number];
export type DiscordAutomationActionType = (typeof discordAutomationActionTypes)[number];
export type DiscordAutomationExecutionStatus = (typeof discordAutomationExecutionStatuses)[number];
export type DiscordAutomationValidationStatus = (typeof discordAutomationValidationStatuses)[number];

export function isDiscordAutomationExecutionMode(
  value: string,
): value is DiscordAutomationExecutionMode {
  return discordAutomationExecutionModes.some((mode) => mode === value);
}

export function isDiscordAutomationTriggerType(
  value: string,
): value is DiscordAutomationTriggerType {
  return discordAutomationTriggerTypes.some((triggerType) => triggerType === value);
}
