import type { CreateNotificationInput } from "@/server/notifications/types";
import { buildPortalNotificationDelivery, createNotification } from "@/server/notifications/service";
import {
  buildAttendanceFinalizedDiscordMessage,
  buildCampaignPublishedDiscordMessage,
  buildFormWorkflowDiscordMessage,
  buildQualificationAwardDiscordMessage,
  createNotificationWithDiscordRouting,
} from "@/server/discord/notifications";
import { getPortalBaseUrl } from "@/server/discord/config";
import { buildStaffAlertDiscordMessage } from "@/server/discord/messages/builders";

async function runNotificationHookSafely(
  label: string,
  buildInput: () => Promise<CreateNotificationInput | null>,
) {
  try {
    const input = await buildInput();

    if (!input) {
      return {
        error: null,
        label,
        ok: false,
      };
    }

    await createNotification(input);

    return {
      error: null,
      label,
      ok: true,
    };
  } catch (error) {
    console.error(`Notification hook placeholder failed for ${label}.`, error);

    return {
      error: error instanceof Error ? error.message : "Unknown notification hook error",
      label,
      ok: false,
    };
  }
}

async function runDiscordRoutedNotificationHookSafely(
  label: string,
  buildInput: () => Promise<{
    notification: CreateNotificationInput;
    routing?: Parameters<typeof createNotificationWithDiscordRouting>[1];
  } | null>,
) {
  try {
    const input = await buildInput();

    if (!input) {
      return {
        error: null,
        label,
        ok: false,
      };
    }

    await createNotificationWithDiscordRouting(input.notification, input.routing);

    return {
      error: null,
      label,
      ok: true,
    };
  } catch (error) {
    console.error(`Notification hook placeholder failed for ${label}.`, error);

    return {
      error: error instanceof Error ? error.message : "Unknown notification hook error",
      label,
      ok: false,
    };
  }
}

export async function queueRankChangedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  recipientUserIds?: string[];
  newRankLabel: string;
}) {
  return runNotificationHookSafely("personnel.rank_changed", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.memberName} was updated to ${input.newRankLabel}. Discord role sync remains deferred.`,
    title: `${input.memberName} rank updated`,
    type: "personnel.rank_changed",
  }));
}

export async function queueQualificationAwardedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  qualificationLabel: string;
  recipientUserIds?: string[];
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("qualification.awarded", async () => ({
    notification: {
      createdByUserId: input.actorUserId ?? null,
      message: `${input.memberName} was awarded ${input.qualificationLabel}. Additional delivery channels remain placeholders for now.`,
      targetUnitId: input.targetUnitId ?? null,
      title: `${input.qualificationLabel} awarded`,
      type: "qualification.awarded",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "qualification-alerts",
      discordMessageFactory: () =>
        buildQualificationAwardDiscordMessage({
          memberName: input.memberName,
          qualificationLabel: input.qualificationLabel,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueQualificationRevokedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  qualificationLabel: string;
  recipientUserIds?: string[];
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("qualification.revoked", async () => ({
    notification: {
      createdByUserId: input.actorUserId ?? null,
      message: `${input.memberName} had ${input.qualificationLabel} revoked. External delivery remains a placeholder and must never block the qualification workflow.`,
      targetUnitId: input.targetUnitId ?? null,
      title: `${input.qualificationLabel} revoked`,
      type: "qualification.revoked",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "qualification-alerts",
      discordMessageFactory: () =>
        buildQualificationAwardDiscordMessage({
          memberName: input.memberName,
          qualificationLabel: input.qualificationLabel,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueQualificationExpiringNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  qualificationLabel: string;
  expiresAtLabel: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("qualification.expiring", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.memberName} has ${input.qualificationLabel} expiring on ${input.expiresAtLabel}. Additional reminder channels remain deferred.`,
    title: `${input.qualificationLabel} expiring soon`,
    type: "qualification.expiring",
  }));
}

export async function queueQualificationSignoffRequiredNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  qualificationLabel: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("qualification.signoff_required", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.memberName} has ${input.qualificationLabel} pending sign-off. Instructor verification remains portal-driven even while external delivery stays placeholder-only.`,
    title: `${input.qualificationLabel} sign-off required`,
    type: "qualification.signoff_required",
  }));
}

export async function queueDocumentPublishedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  documentTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("document.published", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.documentTitle} was published to the portal knowledge base. Additional delivery channels remain deferred.`,
    title: `${input.documentTitle} published`,
    type: "document.published",
  }));
}

export async function queueDocumentReviewRequiredNotificationPlaceholder(input: {
  actorUserId?: string | null;
  documentTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("document.review_required", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.documentTitle} is ready for review attention. Review routing remains portal-first until future Discord delivery is connected.`,
    title: `${input.documentTitle} review required`,
    type: "document.review_required",
  }));
}

export async function queueDocumentReviewOverdueNotificationPlaceholder(input: {
  actorUserId?: string | null;
  documentTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("document.review_overdue", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.documentTitle} is overdue for review. Future delivery channels should complement, not replace, portal tracking.`,
    title: `${input.documentTitle} review overdue`,
    type: "document.review_overdue",
  }));
}

export async function queueDocumentArchivedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  documentTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("document.archived", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.documentTitle} was archived in the portal knowledge base. Historical access remains portal-governed.`,
    title: `${input.documentTitle} archived`,
    type: "document.archived",
  }));
}

export async function queueEventPublishedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  eventTitle: string;
  recipientUserIds?: string[];
  eventId?: string | null;
  targetUnitId?: string | null;
}) {
  return runNotificationHookSafely("event.published", async () => ({
      createdByUserId: input.actorUserId ?? null,
      message: `${input.eventTitle} is now published. Event announcements are routed through the dedicated Discord event channel sender when the publisher has permission.`,
      targetUnitId: input.targetUnitId ?? null,
      title: `${input.eventTitle} published`,
      type: "event.published",
      recipientUserIds: input.recipientUserIds ?? [],
  }));
}

export async function queueDiscordMemberJoinedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  recipientUserIds?: string[];
  serverName: string;
}) {
  return runNotificationHookSafely("discord.member_joined", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.memberName} joined ${input.serverName}. Discord identity was synced without changing portal-owned roster data.`,
    title: `${input.memberName} joined Discord`,
    type: "discord.member_joined",
  }));
}

export async function queueDiscordMemberLeftNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  recipientUserIds?: string[];
  serverName: string;
}) {
  return runNotificationHookSafely("discord.member_left", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.memberName} left ${input.serverName}. The portal profile was preserved for staff review.`,
    title: `${input.memberName} left Discord`,
    type: "discord.member_left",
  }));
}

export async function queueDiscordMemberSyncedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  recipientUserIds?: string[];
  serverName: string;
}) {
  return runNotificationHookSafely("discord.member_synced", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.memberName} Discord identity was refreshed from ${input.serverName}.`,
    title: `${input.memberName} Discord identity synced`,
    type: "discord.member_synced",
  }));
}

export async function queueDiscordModerationKickedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  memberName: string;
  recipientUserIds?: string[];
  serverName: string;
}) {
  return runNotificationHookSafely("discord.moderation.kicked", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.memberName} was kicked from ${input.serverName}. The action was audited in the portal.`,
    title: `${input.memberName} kicked from Discord`,
    type: "discord.moderation.kicked",
  }));
}

export async function queueDiscordModerationFailedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  errorMessage: string;
  memberName: string;
  recipientUserIds?: string[];
  serverName: string;
}) {
  return runNotificationHookSafely("discord.moderation.failed", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `Discord moderation for ${input.memberName} on ${input.serverName} failed: ${input.errorMessage}`,
    title: `${input.memberName} moderation failed`,
    type: "discord.moderation.failed",
    urgency: "warning",
  }));
}

export async function queueRecommendationGeneratedNotificationPlaceholder(input: {
  actionUrl?: string | null;
  actorUserId?: string | null;
  recommendationTitle: string;
  recommendationSummary: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("recommendation.generated", async () => ({
    actionUrl: input.actionUrl ?? null,
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: input.recommendationSummary,
    title: `Recommendation generated: ${input.recommendationTitle}`,
    type: "recommendation.generated",
  }));
}

export async function queueCriticalRecommendationNotificationPlaceholder(input: {
  actionUrl?: string | null;
  actorUserId?: string | null;
  recommendationTitle: string;
  recommendationSummary: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("recommendation.critical", async () => ({
    actionUrl: input.actionUrl ?? null,
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: input.recommendationSummary,
    title: `Critical recommendation: ${input.recommendationTitle}`,
    type: "recommendation.critical",
    urgency: "action_required",
  }));
}

export async function queueRecommendationResolvedNotificationPlaceholder(input: {
  actionUrl?: string | null;
  actorUserId?: string | null;
  recommendationTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("recommendation.resolved", async () => ({
    actionUrl: input.actionUrl ?? null,
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.recommendationTitle} was marked resolved. Recommendation history remains available for command review.`,
    title: `Recommendation resolved: ${input.recommendationTitle}`,
    type: "recommendation.resolved",
  }));
}

export async function queueRecommendationDismissedNotificationPlaceholder(input: {
  actionUrl?: string | null;
  actorUserId?: string | null;
  recommendationTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("recommendation.dismissed", async () => ({
    actionUrl: input.actionUrl ?? null,
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.recommendationTitle} was dismissed by command staff. Recommendation history remains available for review.`,
    title: `Recommendation dismissed: ${input.recommendationTitle}`,
    type: "recommendation.dismissed",
  }));
}

export async function queueFormSubmittedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
  submissionId?: string | null;
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("form.submitted", async () => ({
    notification: {
      createdByUserId: input.actorUserId ?? null,
      message: `${input.formTitle} was submitted through the portal workflow engine. External routing stays placeholder-only until downstream delivery rules are finalized.`,
      targetUnitId: input.targetUnitId ?? null,
      title: `${input.formTitle} submitted`,
      type: "form.submitted",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "staff-alerts",
      discordMessageFactory: () =>
        buildFormWorkflowDiscordMessage({
          actionLabel: "Submitted",
          description: `${input.formTitle} entered the review queue.`,
          submissionId: input.submissionId,
          title: `${input.formTitle} submitted`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueFormReviewRequestedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("form.review_requested", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.formTitle} needs review attention. Portal review remains authoritative while Discord and other channels stay intentionally deferred.`,
    title: `${input.formTitle} review requested`,
    type: "form.review_requested",
  }));
}

export async function queueFormApprovedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
  submissionId?: string | null;
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("form.approved", async () => ({
    notification: {
      createdByUserId: input.actorUserId ?? null,
      message: `${input.formTitle} was approved. Future downstream workflows should hook into this portal notification record instead of bypassing it.`,
      targetUnitId: input.targetUnitId ?? null,
      title: `${input.formTitle} approved`,
      type: "form.approved",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "staff-alerts",
      discordMessageFactory: () =>
        buildFormWorkflowDiscordMessage({
          actionLabel: "Approved",
          description: `${input.formTitle} was approved in the portal workflow.`,
          submissionId: input.submissionId,
          title: `${input.formTitle} approved`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueFormDeniedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
  submissionId?: string | null;
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("form.denied", async () => ({
    notification: {
      createdByUserId: input.actorUserId ?? null,
      message: `${input.formTitle} was denied. Portal notifications should preserve the decision history even while external delivery remains deferred.`,
      targetUnitId: input.targetUnitId ?? null,
      title: `${input.formTitle} denied`,
      type: "form.denied",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "staff-alerts",
      discordMessageFactory: () =>
        buildFormWorkflowDiscordMessage({
          actionLabel: "Denied",
          description: `${input.formTitle} was denied in the portal workflow.`,
          submissionId: input.submissionId,
          title: `${input.formTitle} denied`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueFormChangesRequestedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("form.changes_requested", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.formTitle} needs changes before it can continue through review. This portal-first reminder should not depend on Discord automation.`,
    title: `${input.formTitle} changes requested`,
    type: "form.changes_requested",
  }));
}

export async function queueFormCommentAddedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("form.comment_added", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `A new comment was added to ${input.formTitle}. Portal comment timelines remain the authoritative conversation thread for workflow review.`,
    title: `${input.formTitle} has a new comment`,
    type: "form.comment_added",
  }));
}

export async function queueTransferRequestedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("transfer.requested", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.formTitle} created a transfer workflow record. Roster reassignment remains deferred until the dedicated transfer workflow is finalized.`,
    title: `${input.formTitle} transfer requested`,
    type: "transfer.requested",
  }));
}

export async function queueLoaRequestedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("loa.requested", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.formTitle} created an LOA workflow record. Automated status updates remain intentionally deferred until the LOA workflow milestone lands.`,
    title: `${input.formTitle} LOA requested`,
    type: "loa.requested",
  }));
}

export async function queueRaspApplicationSubmittedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  formTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("rasp.application_submitted", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.formTitle} created a RASP placeholder workflow record. Specialized routing and evaluation remain a future milestone.`,
    title: `${input.formTitle} RASP placeholder submitted`,
    type: "rasp.application_submitted",
  }));
}

export async function queueAttendanceFinalizedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  eventTitle: string;
  recipientUserIds?: string[];
  eventId?: string | null;
  summary?: string | null;
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("attendance.finalized", async () => ({
    notification: {
      createdByUserId: input.actorUserId ?? null,
      message: `${input.eventTitle} attendance was finalized. Delivery failures must never roll back attendance records.`,
      targetUnitId: input.targetUnitId ?? null,
      title: `${input.eventTitle} attendance finalized`,
      type: "attendance.finalized",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "attendance",
      discordMessageFactory: () =>
        buildAttendanceFinalizedDiscordMessage({
          eventId: input.eventId,
          eventTitle: input.eventTitle,
          summary:
            input.summary ??
            `${input.eventTitle} attendance was finalized in the portal command workspace.`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueCampaignPublishedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  campaignTitle: string;
  recipientUserIds?: string[];
  campaignId?: string | null;
  phaseLabel?: string | null;
  targetUnitIds?: Array<string | null | undefined>;
}) {
  return runDiscordRoutedNotificationHookSafely("campaign.published", async () => ({
    notification: {
      createdByUserId: input.actorUserId ?? null,
      message: `${input.campaignTitle} is published and ready for related operation routing once Discord delivery is connected.`,
      title: `${input.campaignTitle} published`,
      type: "campaign.published",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "campaign-updates",
      discordMessageFactory: () =>
        buildCampaignPublishedDiscordMessage({
          campaignId: input.campaignId,
          campaignTitle: input.campaignTitle,
          phaseLabel: input.phaseLabel ?? "Published",
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: input.targetUnitIds ?? [],
    },
  }));
}

export async function queueMissionReviewRequestedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  missionTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("s3.mission_review_requested", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
      message: `${input.missionTitle} was submitted for S3 review. Portal review remains authoritative even while external delivery stays placeholder-only.`,
      title: `${input.missionTitle} operation needs review`,
    type: "s3.mission_review_requested",
  }));
}

export async function queueConopPublishedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  conopTitle: string;
  recipientUserIds?: string[];
  eventId?: string | null;
  targetUnitIds?: Array<string | null | undefined>;
}) {
  return runDiscordRoutedNotificationHookSafely("s3.conop_published", async () => ({
    notification: {
      createdByUserId: input.actorUserId ?? null,
      message: `${input.conopTitle} was published and is ready for operational reference. Future Discord delivery should complement this portal record.`,
      title: `${input.conopTitle} published`,
      type: "s3.conop_published",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "conops",
      discordMessageFactory: () =>
        buildStaffAlertDiscordMessage({
          actionUrl: input.eventId
            ? `${getPortalBaseUrl()}/operations/events/${input.eventId}`
            : undefined,
          alertTitle: `${input.conopTitle} published`,
          summary: `${input.conopTitle} is ready for operations staff review in the portal.`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: input.targetUnitIds ?? [],
    },
  }));
}

export async function queueMissingAarNotificationPlaceholder(input: {
  actorUserId?: string | null;
  missionTitle: string;
  recipientUserIds?: string[];
}) {
  return runNotificationHookSafely("s3.aar_missing", async () => ({
    createdByUserId: input.actorUserId ?? null,
    deliveries: (input.recipientUserIds ?? []).map(buildPortalNotificationDelivery),
    message: `${input.missionTitle} is completed and still needs an AAR submission. This reminder is portal-first and must never block operation closeout.`,
    title: `${input.missionTitle} needs AAR`,
    type: "s3.aar_missing",
  }));
}

export async function queuePatrolStartedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  patrolId: string;
  patrolTitle: string;
  targetUnitId?: string | null;
}) {
  return runNotificationHookSafely("patrol.started", async () => ({
    actionUrl: `${getPortalBaseUrl()}/operations/patrols?inspect=${input.patrolId}`,
    createdByUserId: input.actorUserId ?? null,
    message: `${input.patrolTitle} has started. RSVP interest is not final attendance.`,
    targetUnitId: input.targetUnitId ?? null,
    title: "Patrol started",
    type: "patrol.started",
  }));
}

export async function queuePatrolCompletedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  patrolId: string;
  patrolTitle: string;
  targetUnitId?: string | null;
}) {
  return runNotificationHookSafely("patrol.completed", async () => ({
    actionUrl: `${getPortalBaseUrl()}/operations/patrols?inspect=${input.patrolId}`,
    createdByUserId: input.actorUserId ?? null,
    message: `${input.patrolTitle} has ended and now requires a Patrol AAR with map screenshot.`,
    targetUnitId: input.targetUnitId ?? null,
    title: "Patrol awaiting AAR",
    type: "patrol.aar_required",
    urgency: "action_required",
  }));
}

export async function queuePatrolRsvpNotificationPlaceholder(input: {
  actorUserId?: string | null;
  patrolId: string;
  patrolTitle: string;
  targetUnitId?: string | null;
}) {
  return runNotificationHookSafely("patrol.rsvp_recorded", async () => ({
    actionUrl: `${getPortalBaseUrl()}/operations/patrols?inspect=${input.patrolId}`,
    createdByUserId: input.actorUserId ?? null,
    message: `Interest was recorded for ${input.patrolTitle}. This does not count as final attendance.`,
    targetUnitId: input.targetUnitId ?? null,
    title: "Patrol interest recorded",
    type: "patrol.rsvp_recorded",
  }));
}

export async function queueAarSubmittedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  aarId?: string | null;
  eventTitle?: string | null;
  patrolLeaderName?: string | null;
  recipientUserIds?: string[];
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("s3.aar_submitted", async () => ({
    notification: {
      actionUrl: input.aarId ? `${getPortalBaseUrl()}/operations/aar-queue?aarId=${input.aarId}` : undefined,
      createdByUserId: input.actorUserId ?? null,
      message: `${input.patrolLeaderName ?? "A patrol leader"} submitted an AAR${input.eventTitle ? ` for ${input.eventTitle}` : ""}. S3 review remains portal-authoritative.`,
      targetUnitId: input.targetUnitId ?? null,
      title: "Patrol AAR submitted",
      type: "s3.aar_submitted",
      urgency: "action_required",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "staff-alerts",
      discordMessageFactory: () =>
        buildStaffAlertDiscordMessage({
          actionUrl: input.aarId ? `${getPortalBaseUrl()}/operations/aar-queue?aarId=${input.aarId}` : undefined,
          alertTitle: "Patrol AAR submitted",
          summary: `${input.patrolLeaderName ?? "A patrol leader"} submitted an AAR${input.eventTitle ? ` for ${input.eventTitle}` : ""}.`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueAarMissingScreenshotNotificationPlaceholder(input: {
  actorUserId?: string | null;
  aarId?: string | null;
  eventTitle?: string | null;
  patrolLeaderName?: string | null;
  recipientUserIds?: string[];
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("patrol.aar_missing_screenshot", async () => ({
    notification: {
      actionUrl: input.aarId ? `${getPortalBaseUrl()}/operations/aar-queue?aarId=${input.aarId}` : undefined,
      createdByUserId: input.actorUserId ?? null,
      message: `${input.patrolLeaderName ?? "A patrol leader"} submitted Patrol AAR text${input.eventTitle ? ` for ${input.eventTitle}` : ""}, but the required map screenshot is still missing.`,
      targetUnitId: input.targetUnitId ?? null,
      title: "Patrol AAR missing screenshot",
      type: "patrol.aar_missing_screenshot",
      urgency: "action_required",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "staff-alerts",
      discordMessageFactory: () =>
        buildStaffAlertDiscordMessage({
          actionUrl: input.aarId ? `${getPortalBaseUrl()}/operations/aar-queue?aarId=${input.aarId}` : undefined,
          alertTitle: "Patrol AAR missing screenshot",
          summary: `${input.patrolLeaderName ?? "A patrol leader"} still needs to attach the required map screenshot${input.eventTitle ? ` for ${input.eventTitle}` : ""}.`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueAarReviewedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  aarId?: string | null;
  eventTitle?: string | null;
  patrolLeaderName?: string | null;
  recipientUserIds?: string[];
  statusLabel?: string | null;
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("patrol.aar_reviewed", async () => ({
    notification: {
      actionUrl: input.aarId ? `${getPortalBaseUrl()}/operations/aar-queue?aarId=${input.aarId}` : undefined,
      createdByUserId: input.actorUserId ?? null,
      message: `S3 marked the Patrol AAR${input.eventTitle ? ` for ${input.eventTitle}` : ""} as ${input.statusLabel ?? "reviewed"}.`,
      targetUnitId: input.targetUnitId ?? null,
      title: "Patrol AAR reviewed",
      type: "patrol.aar_reviewed",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "staff-alerts",
      discordMessageFactory: () =>
        buildStaffAlertDiscordMessage({
          actionUrl: input.aarId ? `${getPortalBaseUrl()}/operations/aar-queue?aarId=${input.aarId}` : undefined,
          alertTitle: "Patrol AAR reviewed",
          summary: `${input.eventTitle ?? "A patrol AAR"} is now ${input.statusLabel ?? "reviewed"}.`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}

export async function queueDeploymentProgressionRecommendedNotificationPlaceholder(input: {
  actorUserId?: string | null;
  aarId?: string | null;
  eventTitle?: string | null;
  progressionDecision?: string | null;
  recipientUserIds?: string[];
  targetUnitId?: string | null;
}) {
  return runDiscordRoutedNotificationHookSafely("deployment.progression_recommended", async () => ({
    notification: {
      actionUrl: input.aarId ? `${getPortalBaseUrl()}/operations/aar-queue?aarId=${input.aarId}` : undefined,
      createdByUserId: input.actorUserId ?? null,
      message: `A Patrol AAR added deployment progression guidance${input.eventTitle ? ` from ${input.eventTitle}` : ""}: ${input.progressionDecision ?? "Review the portal for next-week planning notes."}`,
      targetUnitId: input.targetUnitId ?? null,
      title: "Deployment progression recommendation",
      type: "deployment.progression_recommended",
      urgency: "action_required",
    },
    routing: {
      actorUserId: input.actorUserId ?? null,
      channelMappingKey: "staff-alerts",
      discordMessageFactory: () =>
        buildStaffAlertDiscordMessage({
          actionUrl: input.aarId ? `${getPortalBaseUrl()}/operations/aar-queue?aarId=${input.aarId}` : undefined,
          alertTitle: "Deployment progression recommendation",
          summary: `${input.eventTitle ?? "A Patrol AAR"} added progression guidance: ${input.progressionDecision ?? "review portal notes"}.`,
        }),
      recipientUserIds: input.recipientUserIds ?? [],
      targetUnitIds: [input.targetUnitId],
    },
  }));
}
