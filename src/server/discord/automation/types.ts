import type { Prisma } from "@prisma/client";

import type {
  DiscordAutomationActionType,
  DiscordAutomationExecutionMode,
  DiscordAutomationTriggerType,
  DiscordAutomationValidationStatus,
} from "@/server/discord/automation/constants";

export type DiscordAutomationCondition =
  | {
      field: string;
      operator:
        | "equals"
        | "not_equals"
        | "contains"
        | "in"
        | "not_in"
        | "exists"
        | "missing"
        | "before"
        | "after"
        | "greater_than"
        | "less_than";
      value?: Prisma.JsonValue;
    }
  | {
      type:
        | "member_has_linked_discord_identity"
        | "member_belongs_to_unit"
        | "member_holds_position"
        | "member_status_equals"
        | "qualification_active"
        | "qualification_not_expired"
        | "guild_enabled"
        | "guild_associated_with_member_unit"
        | "target_role_exists"
        | "target_role_manageable"
        | "member_present_in_guild"
        | "mapping_enabled"
        | "manual_approval_granted";
      value?: Prisma.JsonValue;
    };

export type DiscordAutomationActionDefinition = {
  actionType: DiscordAutomationActionType;
  discordRoleId?: string | null;
  discordRoleName?: string | null;
  discordServerId?: string | null;
  reason?: string | null;
  removeRoleId?: string | null;
  targetRoleId?: string | null;
};

export type DiscordAutomationPlannedAction = {
  actionType: DiscordAutomationActionType;
  definitionId: string | null;
  discordRoleId: string | null;
  discordRoleName: string | null;
  discordServerId: string;
  discordUserId: string;
  guildId: string;
  idempotencyKey: string;
  memberProfileId: string;
  reason: string;
  sourceDomain: string;
  sourceEntityId: string;
  sourceEntityType: string;
  targetRoleId: string | null;
};

export type DiscordAutomationValidationMessage = {
  message: string;
  recommendedAction: string;
  status: DiscordAutomationValidationStatus;
  title: string;
};

export type DiscordAutomationValidationResult = {
  messages: DiscordAutomationValidationMessage[];
  retryable: boolean;
  status: DiscordAutomationValidationStatus;
};

export type DiscordAutomationSourceEvent = {
  actorUserId?: string | null;
  memberProfileId: string;
  sourceDomain: string;
  sourceEntityId: string;
  sourceEntityType: string;
  triggerType: DiscordAutomationTriggerType;
};

export type DiscordAutomationPreview = {
  actionCount: number;
  executionId: string;
  executionMode: DiscordAutomationExecutionMode;
  status: string;
  warnings: DiscordAutomationValidationMessage[];
};
