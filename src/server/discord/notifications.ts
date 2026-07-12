import { getPortalBaseUrl } from "@/server/discord/config";
import { processCommunicationRequest } from "@/server/communications/pipeline";
import type { CommunicationAudience, CommunicationChannelRequest } from "@/server/communications/types";
import {
  buildAttendanceSummaryDiscordMessage,
  buildCampaignUpdateDiscordMessage,
  buildFormApplicationAlertDiscordMessage,
  buildQualificationNoticeDiscordMessage,
} from "@/server/discord/messages/builders";
import type { DiscordChannelMappingKey } from "@/server/discord/constants";
import type { DiscordMessagePayload } from "@/server/discord/types";
import type { CreateNotificationInput } from "@/server/notifications/types";

type NotificationRoutingOptions = {
  actorUserId?: string | null;
  channelMappingKey?: DiscordChannelMappingKey | null;
  discordMessageFactory?: (notificationId: string) => DiscordMessagePayload | null;
  recipientUserIds?: string[];
  targetUnitIds?: Array<string | null | undefined>;
};

export async function createNotificationWithDiscordRouting(
  input: CreateNotificationInput,
  options?: NotificationRoutingOptions,
) {
  const userIds = Array.from(
    new Set((options?.recipientUserIds ?? []).filter((userId): userId is string => Boolean(userId))),
  );
  const audiences: CommunicationAudience[] = [];
  const channels: CommunicationChannelRequest[] = [];
  const mappingKey = options?.channelMappingKey ?? null;
  const previewMessage = options?.discordMessageFactory?.("preview") ?? null;

  if (userIds.length > 0) {
    audiences.push({ type: "users", userIds });
    channels.push({ type: "portal" });
  }

  if (mappingKey && previewMessage) {
    audiences.push({
      mappingKey,
      type: "discord_channel",
      unitIds: options?.targetUnitIds,
    });
    channels.push({
      mappingKey,
      type: "discord_channel",
      unitIds: options?.targetUnitIds,
    });
  }

  return processCommunicationRequest({
    body: previewMessage?.body ?? input.message,
    category: "system",
    idempotencyKey:
      typeof input.metadata === "object" && input.metadata && "idempotencyKey" in input.metadata
        ? String(input.metadata.idempotencyKey)
        : null,
    priority:
      input.urgency === "critical"
        ? "critical"
        : input.urgency === "warning" || input.urgency === "action_required"
          ? "high"
          : "normal",
    relatedEntityId:
      typeof input.metadata === "object" && input.metadata && "eventId" in input.metadata
        ? String(input.metadata.eventId)
        : null,
    relatedEntityType:
      typeof input.metadata === "object" && input.metadata && "eventId" in input.metadata
        ? "Event"
        : null,
    requestedByUserId: options?.actorUserId ?? input.createdByUserId ?? null,
    requestedChannels: channels.length > 0 ? channels : [{ type: "portal" }],
    sourceEvent: input.type,
    sourceModule: "notifications",
    targetAudience: audiences.length > 0 ? audiences : [{ type: "users", userIds }],
    title: previewMessage?.title ?? input.title,
    type: input.type,
  });
}

export function buildQualificationAwardDiscordMessage(input: {
  memberName: string;
  qualificationLabel: string;
}) {
  return buildQualificationNoticeDiscordMessage({
    actionUrl: `${getPortalBaseUrl()}/personnel/qualifications`,
    memberName: input.memberName,
    qualificationName: input.qualificationLabel,
  });
}

export function buildCampaignPublishedDiscordMessage(input: {
  campaignId?: string | null;
  campaignTitle: string;
  phaseLabel: string;
}) {
  return buildCampaignUpdateDiscordMessage({
    actionUrl: input.campaignId
      ? `${getPortalBaseUrl()}/operations/deployments/${input.campaignId}`
      : `${getPortalBaseUrl()}/operations/deployments`,
    campaignTitle: input.campaignTitle,
    phaseLabel: input.phaseLabel,
  });
}

export function buildAttendanceFinalizedDiscordMessage(input: {
  eventId?: string | null;
  eventTitle: string;
  summary: string;
}) {
  return buildAttendanceSummaryDiscordMessage({
    actionUrl: input.eventId
      ? `${getPortalBaseUrl()}/operations/events/${input.eventId}`
      : `${getPortalBaseUrl()}/operations/attendance`,
    eventTitle: input.eventTitle,
    summary: input.summary,
  });
}

export function buildFormWorkflowDiscordMessage(input: {
  actionLabel: string;
  description: string;
  submissionId?: string | null;
  title: string;
}) {
  return buildFormApplicationAlertDiscordMessage({
    actionUrl: input.submissionId
      ? `${getPortalBaseUrl()}/applications/${input.submissionId}`
      : `${getPortalBaseUrl()}/applications`,
    submissionId: input.submissionId ?? null,
    statusLabel: input.actionLabel,
    summary: input.description,
    title: input.title,
  });
}
