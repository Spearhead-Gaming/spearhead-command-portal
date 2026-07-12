export type DiscordModerationPlatformAction =
  | "warning"
  | "internal_note"
  | "timeout"
  | "remove_timeout"
  | "kick"
  | "ban"
  | "unban";

export type DiscordModerationPreview = {
  action: DiscordModerationPlatformAction;
  approvalMode: string;
  blockingIssues: string[];
  caseId: string | null;
  crossGuildPolicy: string;
  discordServerId: string;
  durationSeconds: number | null;
  expectedResult: string;
  guildId: string;
  policyId: string;
  reason: string;
  targetDiscordUserId: string;
  warnings: string[];
};
