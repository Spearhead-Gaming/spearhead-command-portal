import { getPortalBaseUrl } from "@/server/discord/config";
import { sendDiscordNotificationToMappedUnits } from "@/server/discord/delivery/provider";
import {
  buildAttendanceSummaryDiscordMessage,
  buildCampaignUpdateDiscordMessage,
  buildFormApplicationAlertDiscordMessage,
  buildQualificationNoticeDiscordMessage,
} from "@/server/discord/messages/builders";
import type { DiscordChannelMappingKey } from "@/server/discord/constants";
import type { DiscordMessagePayload } from "@/server/discord/types";
import type { CreateNotificationInput } from "@/server/notifications/types";
import { buildPortalNotificationDelivery, createNotification } from "@/server/notifications/service";

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
  const notification = await createNotification({
    ...input,
    deliveries: [
      ...(input.deliveries ?? []),
      ...Array.from(
        new Set((options?.recipientUserIds ?? []).filter((userId): userId is string => Boolean(userId))),
      ).map(buildPortalNotificationDelivery),
    ],
  });

  const mappingKey = options?.channelMappingKey ?? null;
  const message = options?.discordMessageFactory?.(notification.id) ?? null;

  if (mappingKey && message) {
    await sendDiscordNotificationToMappedUnits({
      actorUserId: options?.actorUserId ?? null,
      mappingKey,
      notificationId: notification.id,
      payload: message,
      unitIds: options?.targetUnitIds,
    });
  }

  return notification;
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
      ? `${getPortalBaseUrl()}/operations/campaigns/${input.campaignId}`
      : `${getPortalBaseUrl()}/operations/campaigns`,
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
    statusLabel: input.actionLabel,
    summary: input.description,
    title: input.title,
  });
}
