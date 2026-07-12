export type PortalDiscordEventType =
  | "weekend_operation"
  | "operational_week"
  | "deployment_kickoff"
  | "deployment_conclusion"
  | "special_operation"
  | "patrol"
  | "training"
  | "community"
  | "meeting"
  | "custom";

export type DiscordEventPlanAction = "create" | "update" | "cancel" | "no_change" | "blocked" | "manual_review";

export type DiscordEventPlanTargetView = {
  blockingIssues: string[];
  channelId: string | null;
  discordServerId: string;
  entityType: string;
  externalLocation: string | null;
  guildId: string;
  guildName: string;
  linkedDiscordEventId: string | null;
  plannedAction: DiscordEventPlanAction;
  rsvpBehavior: string;
  validationStatus: "valid" | "warning" | "blocked";
  warnings: string[];
};

export type DiscordEventPlanView = {
  eventId: string;
  eventTitle: string;
  eventType: string;
  planId: string | null;
  sourceVersion: string;
  targets: DiscordEventPlanTargetView[];
};
