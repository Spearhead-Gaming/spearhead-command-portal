import { prisma } from "@/server/database/client";
import { formatDiscordScheduledEventDescription, formatDiscordScheduledEventTitle } from "@/server/discord/event-management/formatters";
import { getDiscordEventPolicy } from "@/server/discord/event-management/policy";
import { resolveDiscordEventTargetGuilds } from "@/server/discord/event-management/routing";
import { validateDiscordEventTarget } from "@/server/discord/event-management/validator";
import type { DiscordEventPlanView } from "@/server/discord/event-management/types";
import { getEventTypeLabel } from "@/server/events/utils";

function createSourceVersion(input: {
  endsAt?: Date | null;
  startsAt: Date;
  status: string;
  title: string;
  updatedAt: Date;
}) {
  return [
    input.title,
    input.status,
    input.startsAt.toISOString(),
    input.endsAt?.toISOString() ?? "open",
    input.updatedAt.toISOString(),
  ].join("|");
}

export async function previewDiscordEventPlan(eventId: string): Promise<DiscordEventPlanView> {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    include: {
      campaign: true,
      hostUnit: true,
    },
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  const sourceVersion = createSourceVersion(event);
  const targets = await resolveDiscordEventTargetGuilds({
    eventType: event.eventType,
    hostUnitId: event.hostUnitId,
  });
  const links = await prisma.discordEventLink.findMany({
    where: {
      portalEventId: event.id,
      portalEventType: "event",
      archivedAt: null,
    },
  });
  const channels = await prisma.discordGuildChannel.findMany({
    where: {
      discordServerId: {
        in: targets.map((target) => target.id),
      },
    },
  });
  const eventTypeLabel = getEventTypeLabel(event.eventType);
  const description = formatDiscordScheduledEventDescription({
    campaignTitle: event.campaign?.title,
    description: event.description,
    eventId: event.id,
    eventTypeLabel,
    hostUnitName: event.hostUnit?.name,
  });

  return {
    eventId: event.id,
    eventTitle: event.title,
    eventType: event.eventType,
    planId: null,
    sourceVersion,
    targets: await Promise.all(
      targets.map(async (target) => {
        const policy = await getDiscordEventPolicy({
          discordServerId: target.id,
          eventType: event.eventType,
          guildId: target.guildId,
        });
        const validation = validateDiscordEventTarget({
          channels: channels.filter((channel) => channel.discordServerId === target.id),
          endsAt: event.endsAt,
          policy,
          startsAt: event.startsAt,
        });
        const link = links.find((candidate) => candidate.discordServerId === target.id);
        const plannedAction = validation.blockingIssues.length > 0
          ? "blocked"
          : policy.manualApprovalRequired || policy.previewRequired
            ? "manual_review"
            : link?.discordScheduledEventId
              ? link.lastPublishedVersion === sourceVersion
                ? "no_change"
                : "update"
              : "create";

        return {
          blockingIssues: validation.blockingIssues,
          channelId: policy.defaultChannelId,
          discordServerId: target.id,
          entityType: policy.defaultEntityType,
          externalLocation: policy.defaultExternalLocation,
          guildId: target.guildId,
          guildName: target.name,
          linkedDiscordEventId: link?.discordScheduledEventId ?? null,
          plannedAction,
          rsvpBehavior: policy.rsvpSourceBehavior,
          validationStatus: validation.validationStatus,
          warnings: [
            ...validation.warnings,
            ...(description.truncated ? ["Description was truncated to fit Discord Scheduled Event limits."] : []),
          ],
        };
      }),
    ),
  };
}

export async function createDiscordEventPlan(input: {
  actorUserId?: string | null;
  eventId: string;
}) {
  const preview = await previewDiscordEventPlan(input.eventId);
  const event = await prisma.event.findUniqueOrThrow({
    where: {
      id: input.eventId,
    },
  });
  const description = formatDiscordScheduledEventDescription({
    description: event.description,
    eventId: event.id,
    eventTypeLabel: getEventTypeLabel(event.eventType),
  });
  const plan = await prisma.discordEventPlan.create({
    data: {
      generatedByUserId: input.actorUserId ?? null,
      portalEventId: event.id,
      portalEventType: "event",
      sourceVersion: preview.sourceVersion,
      status: "preview",
      targets: {
        create: preview.targets.map((target) => ({
          blockingIssues: target.blockingIssues,
          channelId: target.channelId,
          description: description.description,
          discordServerId: target.discordServerId,
          endsAt: event.endsAt,
          entityType: target.entityType,
          externalLocation: target.externalLocation,
          guildId: target.guildId,
          linkedDiscordEventId: target.linkedDiscordEventId,
          plannedAction: target.plannedAction,
          predictedCommunication: {
            domain: "events",
            note: "Announcements are delivered separately through the communication pipeline.",
          },
          rsvpBehavior: target.rsvpBehavior,
          startsAt: event.startsAt,
          title: formatDiscordScheduledEventTitle({ title: event.title }),
          validationStatus: target.validationStatus,
          warnings: target.warnings,
        })),
      },
    },
    include: {
      targets: true,
    },
  });

  return plan;
}
