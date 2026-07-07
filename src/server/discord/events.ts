import { can } from "@/server/permissions/access";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { getPortalBaseUrl } from "@/server/discord/config";
import { resolveDiscordChannelMapping, sendDiscordNotification } from "@/server/discord/delivery/provider";
import { buildEventAnnouncementDiscordMessage } from "@/server/discord/messages/builders";
import type { DiscordEventAnnouncementStatus } from "@/server/discord/types";
import { createNotification } from "@/server/notifications/service";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import { getEventTypeLabel } from "@/server/events/utils";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

async function getManagedEventForDiscord(eventId: string) {
  return prisma.event.findUnique({
    where: {
      id: eventId,
    },
    include: {
      hostUnit: true,
      campaign: true,
      attendanceRecords: {
        select: {
          id: true,
          rsvpStatus: true,
        },
      },
      weeklyTasking: {
        include: {
          unitTaskings: {
            include: {
              unit: true,
            },
            orderBy: {
              unit: {
                sortOrder: "asc",
              },
            },
          },
        },
      },
    },
  });
}

function assertDiscordEventPermission(input: {
  actor: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  hostUnitId?: string | null;
}) {
  const eventScope = input.hostUnitId ? { unitId: input.hostUnitId } : undefined;
  const canPublishEvent =
    can(input.actor, "events.publish", eventScope) || can(input.actor, "events.publish");
  const canSendDiscord =
    can(input.actor, "discord.notifications.send", eventScope) ||
    can(input.actor, "discord.notifications.send");

  if (!canPublishEvent || !canSendDiscord) {
    throw new Error("You do not have permission to post this event announcement to Discord.");
  }
}

async function getMemberVisibleDeploymentResourceLinks(input: {
  baseUrl: string;
  campaignId?: string | null;
  eventId: string;
}) {
  if (!input.campaignId) {
    return [];
  }

  const resources = await prisma.deploymentResource.findMany({
    where: {
      campaignId: input.campaignId,
      isArchived: false,
      visibility: "members",
      OR: [{ eventId: null }, { eventId: input.eventId }],
    },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
      },
    },
    orderBy: [{ displayOrder: "asc" }, { resourceType: "asc" }],
  });

  return resources
    .map((resource) => {
      const version = resource.versions[0];

      if (!version) {
        return null;
      }

      const url =
        version.sourceType === "file"
          ? `${input.baseUrl}/api/deployment-resources/${version.id}/download`
          : version.url;

      return url
        ? {
            label: resource.resourceType === "ARMA3_PRESET" ? "Current Mod Preset" : resource.displayName,
            url,
          }
        : null;
    })
    .filter((resource): resource is { label: string; url: string } => resource !== null);
}

export async function sendEventAnnouncementToDiscord(eventId: string) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const event = await getManagedEventForDiscord(eventId);

  if (!event) {
    throw new Error("Event not found.");
  }

  assertDiscordEventPermission({
    actor,
    hostUnitId: event.hostUnitId,
  });

  if (event.status !== "published" || !event.publishedAt) {
    throw new Error("Publish the event before sending a Discord announcement.");
  }

  const baseUrl = getPortalBaseUrl();
  const actionUrl = `${baseUrl}/operations/events/${event.id}`;
  const resources = await getMemberVisibleDeploymentResourceLinks({
    baseUrl,
    campaignId: event.campaignId,
    eventId: event.id,
  });
  const notification = await createNotification({
    actionUrl,
    createdByUserId: actor.id,
    message: `${event.title} is published and ready for RSVP tracking in Discord.`,
    metadata: {
      channelMappingKey: "events",
      deliveryKind: "discord-event-announcement",
      eventId: event.id,
    },
    targetUnitId: event.hostUnitId ?? null,
    title: `${event.title} Discord announcement`,
    type: "event.published",
  });

  await recordAuditEvent({
    action: "discord.event_announcement.requested",
    actorUserId: actor.id,
    entityId: event.id,
    entityType: "Event",
    metadata: {
      notificationId: notification.id,
      targetUnitId: event.hostUnitId,
    },
    summary: `Discord announcement requested for ${event.title}.`,
  });

  const delivery = await sendDiscordNotification({
    actorUserId: actor.id,
    mappingKey: "events",
    notificationId: notification.id,
    payload: buildEventAnnouncementDiscordMessage({
      actionUrl,
      campaignTitle: event.campaign?.title ?? null,
      endsAt: event.endsAt ?? null,
      eventId: event.id,
      eventTitle: event.title,
      eventTypeLabel: getEventTypeLabel(event.eventType),
      hostUnitName: event.hostUnit?.name ?? null,
      resources,
      startsAt: event.startsAt,
      tasking: event.weeklyTasking
        ? {
            commandersIntent: event.weeklyTasking.commandersIntent,
            operationalSummary: event.weeklyTasking.operationalSummary,
            timeline: event.weeklyTasking.timeline,
            unitTaskings: event.weeklyTasking.unitTaskings.map((tasking) => ({
              primaryObjective: tasking.primaryObjective,
              secondaryObjective: tasking.secondaryObjective,
              specialInstructions: tasking.specialInstructions,
              unitShortName: tasking.unit.shortName,
            })),
            weekNumber: event.weeklyTasking.weekNumber,
          }
        : null,
    }),
    unitId: event.hostUnitId,
  });

  if (delivery.status !== "sent") {
    await recordAuditEvent({
      action: "discord.event_announcement.failed",
      actorUserId: actor.id,
      entityId: event.id,
      entityType: "Event",
      metadata: {
        deliveryId: delivery.deliveryId,
        notificationId: notification.id,
      },
      reason: delivery.errorMessage,
      summary: `Discord announcement failed for ${event.title}.`,
    });

    throw new Error(
      delivery.errorMessage ?? "The Discord announcement could not be delivered.",
    );
  }

  await recordAuditEvent({
    action: "discord.event_announcement.sent",
    actorUserId: actor.id,
    entityId: event.id,
    entityType: "Event",
    metadata: {
      channelId: delivery.channelId ?? null,
      deliveryId: delivery.deliveryId,
      notificationId: notification.id,
      providerMessageId: delivery.providerMessageId,
      serverName: delivery.serverName ?? null,
    },
    summary: `Discord announcement sent for ${event.title}.`,
  });

  return delivery;
}

export async function getEventDiscordAnnouncementStatus(input: {
  eventId: string;
  hostUnitId?: string | null;
}): Promise<DiscordEventAnnouncementStatus> {
  const [mapping, latestDelivery] = await Promise.all([
    resolveDiscordChannelMapping({
      mappingKey: "events",
      unitId: input.hostUnitId,
    }),
    prisma.notificationDelivery.findFirst({
      where: {
        channelType: "discord_channel",
        notification: {
          metadata: {
            path: "$.eventId",
            equals: input.eventId,
          },
          type: "event.published",
        },
      },
      include: {
        discordChannelMapping: {
          include: {
            discordServer: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  if (!latestDelivery) {
    return {
      channelId: null,
      deliveryId: null,
      destinationKey: null,
      errorMessage: null,
      hasAnnouncement: false,
      mappedChannelId: mapping?.channelId ?? null,
      mappedChannelKey: "events",
      providerMessageId: null,
      serverName: mapping?.discordServer.name ?? null,
      status: "not-sent",
      updatedAtLabel: null,
    };
  }

  return {
    channelId: latestDelivery.discordChannelMapping?.channelId ?? null,
    deliveryId: latestDelivery.id,
    destinationKey: latestDelivery.destinationKey,
    errorMessage: latestDelivery.errorMessage,
    hasAnnouncement: true,
    mappedChannelId: mapping?.channelId ?? latestDelivery.discordChannelMapping?.channelId ?? null,
    mappedChannelKey: "events",
    providerMessageId: latestDelivery.providerMessageId,
    serverName:
      latestDelivery.discordChannelMapping?.discordServer.name ?? mapping?.discordServer.name ?? null,
    status:
      latestDelivery.status === "failed" ||
      latestDelivery.status === "pending" ||
      latestDelivery.status === "retrying" ||
      latestDelivery.status === "cancelled" ||
      latestDelivery.status === "sent"
        ? latestDelivery.status
        : "not-sent",
    updatedAtLabel: formatTimestamp(latestDelivery.updatedAt),
  };
}
