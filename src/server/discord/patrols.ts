import { prisma } from "@/server/database/client";
import { patrolTypeCatalog } from "@/server/database/catalogs";
import { getPortalBaseUrl } from "@/server/discord/config";
import { sendDiscordNotification } from "@/server/discord/delivery/provider";
import { buildPatrolAnnouncementDiscordMessage } from "@/server/discord/messages/builders";
import { createNotification } from "@/server/notifications/service";
import { recordAuditEvent } from "@/server/services/audit-log-service";

function formatEstimatedDuration(minutes?: number | null) {
  if (!minutes) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getUserLabel(user?: { displayName: string | null; email: string | null; name: string | null } | null) {
  return user?.displayName ?? user?.name ?? user?.email ?? "Patrol leader";
}

function getPatrolTypeLabel(patrolType?: string | null) {
  return patrolTypeCatalog.find((entry) => entry.key === patrolType)?.label ?? "Patrol";
}

export async function sendPatrolAnnouncementToDiscord(input: {
  actorUserId?: string | null;
  eventId: string;
}) {
  const patrol = await prisma.event.findUnique({
    where: {
      id: input.eventId,
    },
    include: {
      campaign: true,
      patrolLeader: true,
    },
  });

  if (!patrol || patrol.eventType !== "patrol") {
    throw new Error("Patrol not found.");
  }

  const baseUrl = getPortalBaseUrl();
  const actionUrl = `${baseUrl}/operations/patrols?inspect=${patrol.id}`;
  const notification = await createNotification({
    actionUrl,
    createdByUserId: input.actorUserId ?? null,
    message: `${patrol.title} is starting. RSVP interest in Discord does not equal final attendance.`,
    metadata: {
      channelMappingKey: "patrols",
      deliveryKind: "discord-patrol-announcement",
      eventId: patrol.id,
    },
    targetUnitId: patrol.hostUnitId ?? null,
    title: `${patrol.title} patrol announcement`,
    type: "patrol.started",
  });

  const delivery = await sendDiscordNotification({
    actorUserId: input.actorUserId ?? null,
    mappingKey: "patrols",
    notificationId: notification.id,
    payload: buildPatrolAnnouncementDiscordMessage({
      actionUrl,
      deploymentTitle: patrol.campaign?.title ?? null,
      description: patrol.description,
      estimatedDurationLabel: formatEstimatedDuration(patrol.estimatedDurationMinutes),
      leaderName: getUserLabel(patrol.patrolLeader),
      patrolId: patrol.id,
      patrolName: patrol.title,
      patrolTypeLabel: getPatrolTypeLabel(patrol.patrolType),
      startsAt: patrol.startsAt,
      weekNumber: patrol.deploymentWeek,
    }),
    unitId: patrol.hostUnitId,
  });

  await recordAuditEvent({
    action: delivery.status === "sent" ? "discord.patrol_announcement.sent" : "discord.patrol_announcement.failed",
    actorUserId: input.actorUserId ?? null,
    entityId: patrol.id,
    entityType: "Event",
    metadata: {
      deliveryId: delivery.deliveryId,
      notificationId: notification.id,
      providerMessageId: delivery.providerMessageId,
      status: delivery.status,
    },
    reason: delivery.errorMessage,
    summary:
      delivery.status === "sent"
        ? `Discord patrol announcement sent for ${patrol.title}.`
        : `Discord patrol announcement failed for ${patrol.title}.`,
  });

  return delivery;
}
