import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createCommunityCaseRecord } from "@/server/community-management/service";
import { addCaseTimelineEntry } from "@/server/community-management/timeline";
import { processCommunicationRequest } from "@/server/communications/pipeline";
import { prisma } from "@/server/database/client";
import {
  banDiscordGuildMember,
  kickDiscordGuildMemberViaRest,
  removeDiscordGuildMemberTimeout,
  timeoutDiscordGuildMember,
  unbanDiscordGuildMember,
} from "@/server/discord/client/rest";
import { getModerationApprovalMode, getOrCreateDiscordModerationPolicy } from "@/server/discord/moderation/policy";
import type { DiscordModerationPlatformAction, DiscordModerationPreview } from "@/server/discord/moderation/types";
import { can, requirePermission } from "@/server/permissions/access";
import { recordAuditEvent } from "@/server/services/audit-log-service";

function normalizeRequiredString(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getPermissionForAction(action: DiscordModerationPlatformAction) {
  switch (action) {
    case "warning":
      return "discord.moderation.warn";
    case "internal_note":
      return "discord.moderation.case.manage";
    case "timeout":
    case "remove_timeout":
      return "discord.moderation.timeout";
    case "kick":
      return "discord.moderation.kick";
    case "ban":
    case "unban":
      return "discord.moderation.ban";
    default:
      return "discord.moderation.view";
  }
}

function isRestAction(action: DiscordModerationPlatformAction) {
  return ["timeout", "remove_timeout", "kick", "ban", "unban"].includes(action);
}

function isEnabledByPolicy(input: {
  action: DiscordModerationPlatformAction;
  policy: Awaited<ReturnType<typeof getOrCreateDiscordModerationPolicy>>;
}) {
  switch (input.action) {
    case "warning":
      return input.policy.warningsEnabled;
    case "internal_note":
      return input.policy.notesEnabled;
    case "timeout":
    case "remove_timeout":
      return input.policy.timeoutEnabled;
    case "kick":
      return input.policy.kickEnabled;
    case "ban":
    case "unban":
      return input.policy.banEnabled;
    default:
      return false;
  }
}

async function resolveOrCreateCase(input: {
  actorUserId: string;
  caseId?: string | null;
  reason: string;
  targetDiscordUserId: string;
  action: DiscordModerationPlatformAction;
}) {
  if (input.caseId) {
    const existing = await prisma.communityCase.findUnique({
      where: {
        id: input.caseId,
      },
    });

    if (!existing) {
      throw new Error("Moderation case not found.");
    }

    return existing;
  }

  return createCommunityCaseRecord({
    actorUserId: input.actorUserId,
    caseType: "INCIDENT",
    confidentiality: "restricted",
    description: input.reason,
    priority: input.action === "ban" ? "high" : "medium",
    relatedDiscordUserId: input.targetDiscordUserId,
    summary: input.reason.slice(0, 255),
    title: `Discord moderation: ${input.action}`,
  });
}

export async function previewDiscordModerationAction(input: {
  action: DiscordModerationPlatformAction;
  caseId?: string | null;
  discordServerId: string;
  durationSeconds?: number | null;
  reason: string;
  targetDiscordUserId: string;
}): Promise<DiscordModerationPreview> {
  const actor = await requirePermission(getPermissionForAction(input.action));
  const reason = normalizeRequiredString(input.reason, "Moderation reason");
  const targetDiscordUserId = normalizeRequiredString(input.targetDiscordUserId, "Target Discord user");
  const server = await prisma.discordServer.findUnique({
    where: {
      id: normalizeRequiredString(input.discordServerId, "Discord server"),
    },
  });

  if (!server || !server.isActive) {
    throw new Error("Select an active Discord server before moderating a member.");
  }

  const policy = await getOrCreateDiscordModerationPolicy({
    discordServerId: server.id,
    guildId: server.guildId,
  });
  const approvalMode = getModerationApprovalMode({
    action: input.action,
    policy,
  });
  const warnings: string[] = [];
  const blockingIssues: string[] = [];

  if (!isEnabledByPolicy({ action: input.action, policy })) {
    blockingIssues.push("This moderation action is disabled by guild policy.");
  }

  if (policy.reasonRequired && !reason) {
    blockingIssues.push("A moderation reason is required by policy.");
  }

  if (input.action === "timeout") {
    const durationSeconds = input.durationSeconds ?? 0;

    if (durationSeconds <= 0) {
      blockingIssues.push("Timeout duration is required.");
    }

    if (durationSeconds > policy.timeoutMaxSeconds) {
      blockingIssues.push(`Timeout exceeds guild policy maximum of ${policy.timeoutMaxSeconds} seconds.`);
    }
  }

  if (!can(actor, getPermissionForAction(input.action))) {
    blockingIssues.push("You do not have the required Portal permission.");
  }

  if (approvalMode !== "none" && approvalMode !== "not_required") {
    warnings.push(`Policy requires ${approvalMode.replaceAll("_", " ")} before execution.`);
  }

  if (policy.crossGuildPolicy !== "view_only") {
    warnings.push(`Cross-guild policy is ${policy.crossGuildPolicy}; review related guild recommendations.`);
  }

  return {
    action: input.action,
    approvalMode,
    blockingIssues,
    caseId: input.caseId ?? null,
    crossGuildPolicy: policy.crossGuildPolicy,
    discordServerId: server.id,
    durationSeconds: input.durationSeconds ?? null,
    expectedResult: isRestAction(input.action) ? "Discord REST execution after validation" : "Portal case history update",
    guildId: server.guildId,
    policyId: policy.id,
    reason,
    targetDiscordUserId,
    warnings,
  };
}

async function executeDiscordRestAction(input: {
  action: DiscordModerationPlatformAction;
  durationSeconds?: number | null;
  guildId: string;
  reason: string;
  targetDiscordUserId: string;
}) {
  switch (input.action) {
    case "timeout":
      await timeoutDiscordGuildMember({
        durationSeconds: input.durationSeconds ?? 0,
        guildId: input.guildId,
        reason: input.reason,
        targetDiscordUserId: input.targetDiscordUserId,
      });
      return;
    case "remove_timeout":
      await removeDiscordGuildMemberTimeout(input);
      return;
    case "kick":
      await kickDiscordGuildMemberViaRest(input);
      return;
    case "ban":
      await banDiscordGuildMember(input);
      return;
    case "unban":
      await unbanDiscordGuildMember(input);
      return;
    default:
      return;
  }
}

export async function executeCaseBackedDiscordModerationAction(input: {
  action: DiscordModerationPlatformAction;
  caseId?: string | null;
  discordServerId: string;
  durationSeconds?: number | null;
  reason: string;
  targetDiscordUserId: string;
}) {
  const actor = await requirePermission(getPermissionForAction(input.action));
  const preview = await previewDiscordModerationAction(input);

  if (preview.blockingIssues.length > 0) {
    throw new Error(preview.blockingIssues.join(" "));
  }

  const communityCase = await resolveOrCreateCase({
    action: input.action,
    actorUserId: actor.id,
    caseId: input.caseId,
    reason: preview.reason,
    targetDiscordUserId: preview.targetDiscordUserId,
  });
  const state = await prisma.discordGuildMemberState.findUnique({
    where: {
      discordServerId_discordUserId: {
        discordServerId: preview.discordServerId,
        discordUserId: preview.targetDiscordUserId,
      },
    },
  });
  const action = await prisma.discordModerationAction.create({
    data: {
      action: input.action,
      approvalStatus:
        preview.approvalMode === "none" || preview.approvalMode === "not_required"
          ? "not_required"
          : "requested",
      discordServerId: preview.discordServerId,
      durationSeconds: preview.durationSeconds,
      metadata: {
        crossGuildPolicy: preview.crossGuildPolicy,
      },
      moderatorUserId: actor.id,
      policySnapshot: toJson(preview),
      previewSnapshot: toJson(preview),
      reason: preview.reason,
      relatedCaseId: communityCase.id,
      result: preview.approvalMode === "none" || preview.approvalMode === "not_required" ? "requested" : "pending_approval",
      targetDiscordUserId: preview.targetDiscordUserId,
      targetMemberProfileId: state?.memberProfileId ?? communityCase.relatedMemberId,
      targetUserId: state?.userId ?? null,
    },
  });

  if (preview.approvalMode !== "none" && preview.approvalMode !== "not_required") {
    await prisma.discordModerationApproval.create({
      data: {
        approvalMode: preview.approvalMode,
        caseId: communityCase.id,
        moderationActionId: action.id,
        requestedByUserId: actor.id,
        status: "requested",
      },
    });
  }

  if (input.action === "warning") {
    await prisma.caseDecision.create({
      data: {
        appealAllowed: true,
        caseId: communityCase.id,
        decidedByUserId: actor.id,
        decisionType: "warning_issued",
        relatedModerationActionId: action.id,
        summary: preview.reason,
      },
    });
  }

  if (input.action === "internal_note") {
    await prisma.caseNote.create({
      data: {
        authorId: actor.id,
        body: preview.reason,
        caseId: communityCase.id,
        noteType: "moderator_discussion",
        visibility: "staff",
      },
    });
  }

  let result = action.result;
  let errorMessage: string | null = null;

  if (isRestAction(input.action) && action.approvalStatus === "not_required") {
    try {
      await executeDiscordRestAction({
        action: input.action,
        durationSeconds: input.durationSeconds,
        guildId: preview.guildId,
        reason: preview.reason,
        targetDiscordUserId: preview.targetDiscordUserId,
      });
      result = "succeeded";
    } catch (error) {
      result = "failed";
      errorMessage = error instanceof Error ? error.message : "Discord moderation REST execution failed.";
    }
  } else if (!isRestAction(input.action)) {
    result = "succeeded";
  }

  const updatedAction = await prisma.discordModerationAction.update({
    data: {
      errorMessage,
      executedAt: result === "succeeded" ? new Date() : null,
      result,
    },
    where: {
      id: action.id,
    },
  });

  await addCaseTimelineEntry({
    actorUserId: actor.id,
    body: preview.reason,
    caseId: communityCase.id,
    entryType: `moderation.${input.action}`,
    relatedEntityId: action.id,
    relatedEntityType: "DiscordModerationAction",
    title: `Discord moderation ${input.action}: ${result}`,
  });

  await recordAuditEvent({
    action: `discord.moderation.${input.action}.${result}`,
    actorUserId: actor.id,
    entityId: action.id,
    entityType: "DiscordModerationAction",
    metadata: {
      approvalMode: preview.approvalMode,
      caseId: communityCase.id,
      discordServerId: preview.discordServerId,
      guildId: preview.guildId,
    },
    reason: preview.reason,
    summary: `Discord moderation ${input.action} recorded for case ${communityCase.caseNumber}.`,
  });

  await processCommunicationRequest({
    body: `Moderation ${input.action} for case ${communityCase.caseNumber} is ${result}.`,
    category: "moderation",
    idempotencyKey: `moderation:${action.id}:${result}`,
    priority: result === "failed" ? "high" : "normal",
    relatedEntityId: communityCase.id,
    relatedEntityType: "CommunityCase",
    requestedByUserId: actor.id,
    requestedChannels: [{ type: "portal" }],
    sourceEvent: `moderation.${input.action}.${result}`,
    sourceModule: "discord-moderation",
    targetAudience: [{ type: "permission", permissionKey: "discord.moderation.view" }],
    title: `Moderation ${result}: ${communityCase.caseNumber}`,
    type: "moderation.case_updated",
  }).catch(() => null);

  revalidatePath("/community-management");
  revalidatePath("/administration/discord");

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return updatedAction;
}
