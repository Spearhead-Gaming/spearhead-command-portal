import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { sendEventAnnouncementToDiscord } from "@/server/discord/events";
import { queueEventPublishedNotificationPlaceholder } from "@/server/notifications/hooks";
import { can, requirePermission } from "@/server/permissions/access";
import { requireAnyScopedPermission } from "@/server/s3/utils";
import {
  isEventType,
  normalizeFilterValue,
} from "@/server/events/utils";

type CreateEventInput = {
  title: string;
  description?: string | null;
  eventType: string;
  hostUnitId?: string | null;
  campaignId?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  reason?: string | null;
};

type UpdateEventInput = CreateEventInput & {
  eventId: string;
};

function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function assertValidDateRange(startsAt: Date, endsAt?: Date | null) {
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("A valid start date is required.");
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error("The end date is invalid.");
  }

  if (endsAt && endsAt < startsAt) {
    throw new Error("Event end time cannot be before the start time.");
  }
}

async function assertScopedEventPermission(
  permissionKey: string,
  hostUnitId?: string | null,
) {
  if (hostUnitId) {
    const actor = await getCurrentUser();

    if (!actor) {
      throw new Error("An authenticated user is required.");
    }

    if (!can(actor, permissionKey, { unitId: hostUnitId }) && !can(actor, permissionKey)) {
      throw new Error("You do not have permission to manage events for that unit.");
    }

    return actor;
  }

  return requirePermission(permissionKey);
}

function revalidateEventRoutes(input?: {
  eventId?: string | null;
  hostUnitKey?: string | null;
}) {
  revalidatePath("/operations/events");
  revalidatePath("/operations/attendance");

  if (input?.eventId) {
    revalidatePath(`/operations/events/${input.eventId}`);
  }

  if (input?.hostUnitKey) {
    revalidatePath(`/units/${input.hostUnitKey}`);
  }
}

function canSendDiscordAnnouncementForEvent(
  actor: Awaited<ReturnType<typeof getCurrentUser>>,
  hostUnitId?: string | null,
) {
  if (!actor) {
    return false;
  }

  const eventScope = hostUnitId ? { unitId: hostUnitId } : undefined;

  return (
    can(actor, "discord.notifications.send", eventScope) ||
    can(actor, "discord.notifications.send")
  );
}

async function sendPublishedEventAnnouncementSafely(input: {
  eventId: string;
  eventTitle: string;
}) {
  try {
    await sendEventAnnouncementToDiscord(input.eventId);
  } catch (error) {
    console.error(
      `Event ${input.eventTitle} was published, but the Discord announcement could not be sent.`,
      error,
    );
  }
}

async function getManagedEvent(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hostUnit: true,
      campaign: true,
    },
  });
}

export async function createEvent(input: CreateEventInput) {
  const title = normalizeRequiredString(input.title, "Event title");
  const eventType = normalizeRequiredString(input.eventType, "Event type");

  if (!isEventType(eventType)) {
    throw new Error("Select a valid event type.");
  }

  assertValidDateRange(input.startsAt, input.endsAt);
  const actor =
    eventType === "patrol"
      ? await requireAnyScopedPermission(["patrols.create", "events.create"], [input.hostUnitId])
      : await assertScopedEventPermission("events.create", input.hostUnitId);

  const event = await prisma.event.create({
    data: {
      title,
      description: normalizeOptionalString(input.description),
      eventType,
      status: "draft",
      patrolLeaderUserId: eventType === "patrol" ? actor.id : null,
      aarRequired: eventType === "patrol",
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      hostUnitId: normalizeFilterValue(input.hostUnitId) ?? null,
      campaignId: normalizeFilterValue(input.campaignId) ?? null,
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "event.created",
    entityType: "Event",
    entityId: event.id,
    summary: `${event.title} event created.`,
    newValue: {
      title: event.title,
      eventType: event.eventType,
      status: event.status,
      hostUnitId: event.hostUnitId,
      campaignId: event.campaignId,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(input.reason),
  });

  if (event.eventType === "patrol") {
    await createAuditLogEntry({
      actorUserId: actor.id,
      action: "patrol.created",
      entityType: "Event",
      entityId: event.id,
      summary: `${event.title} patrol created.`,
      newValue: {
        aarRequired: event.aarRequired,
        patrolLeaderUserId: event.patrolLeaderUserId,
      },
      reason: normalizeOptionalString(input.reason),
    });
  }

  revalidateEventRoutes({
    eventId: event.id,
    hostUnitKey: event.hostUnit?.key ?? null,
  });
}

export async function editEvent(input: UpdateEventInput) {
  const existing = await getManagedEvent(input.eventId);

  if (!existing) {
    throw new Error("Event not found.");
  }

  const title = normalizeRequiredString(input.title, "Event title");
  const eventType = normalizeRequiredString(input.eventType, "Event type");

  if (!isEventType(eventType)) {
    throw new Error("Select a valid event type.");
  }

  assertValidDateRange(input.startsAt, input.endsAt);
  const actor = await assertScopedEventPermission(
    "events.edit",
    normalizeFilterValue(input.hostUnitId) ?? existing.hostUnitId,
  );

  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      title,
      description: normalizeOptionalString(input.description),
      eventType,
      aarRequired: eventType === "patrol",
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      hostUnitId: normalizeFilterValue(input.hostUnitId) ?? null,
      campaignId: normalizeFilterValue(input.campaignId) ?? null,
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "event.edited",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} event updated.`,
    oldValue: {
      title: existing.title,
      eventType: existing.eventType,
      hostUnitId: existing.hostUnitId,
      campaignId: existing.campaignId,
      startsAt: existing.startsAt.toISOString(),
      endsAt: existing.endsAt?.toISOString() ?? null,
    },
    newValue: {
      title: updated.title,
      eventType: updated.eventType,
      hostUnitId: updated.hostUnitId,
      campaignId: updated.campaignId,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(input.reason),
  });

  revalidateEventRoutes({
    eventId: updated.id,
    hostUnitKey: updated.hostUnit?.key ?? existing.hostUnit?.key ?? null,
  });
}

export async function publishEvent(eventId: string, reason?: string | null) {
  const existing = await getManagedEvent(eventId);

  if (!existing) {
    throw new Error("Event not found.");
  }

  const actor = await assertScopedEventPermission("events.publish", existing.hostUnitId);
  const publishedAt = existing.publishedAt ?? new Date();
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      status: "published",
      missionStatus: "published",
      publishedAt,
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "event.published",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} event published.`,
    oldValue: {
      status: existing.status,
      publishedAt: existing.publishedAt?.toISOString() ?? null,
    },
    newValue: {
      status: updated.status,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(reason),
  });

  const taskingPublish = await prisma.weeklyTasking.updateMany({
    where: {
      eventId: updated.id,
    },
    data: {
      publishStatus: "published",
      sentAt: publishedAt,
    },
  });

  if (taskingPublish.count > 0) {
    await createAuditLogEntry({
      actorUserId: actor.id,
      action: "weekly_tasking.published",
      entityType: "Event",
      entityId: updated.id,
      summary: `${updated.title} weekly tasking published with the operation event.`,
      newValue: {
        eventId: updated.id,
        publishStatus: "published",
        sentAt: publishedAt.toISOString(),
      },
      reason: normalizeOptionalString(reason),
    });
  }

  await queueEventPublishedNotificationPlaceholder({
    actorUserId: actor.id,
    eventId: updated.id,
    eventTitle: updated.title,
    targetUnitId: updated.hostUnitId,
  });

  if (canSendDiscordAnnouncementForEvent(actor, updated.hostUnitId)) {
    await sendPublishedEventAnnouncementSafely({
      eventId: updated.id,
      eventTitle: updated.title,
    });
  }

  revalidateEventRoutes({
    eventId: updated.id,
    hostUnitKey: updated.hostUnit?.key ?? existing.hostUnit?.key ?? null,
  });
}

export async function cancelEvent(eventId: string, reason?: string | null) {
  const existing = await getManagedEvent(eventId);

  if (!existing) {
    throw new Error("Event not found.");
  }

  const actor = await assertScopedEventPermission("events.cancel", existing.hostUnitId);
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      status: "cancelled",
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "event.cancelled",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} event cancelled.`,
    oldValue: {
      status: existing.status,
    },
    newValue: {
      status: updated.status,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateEventRoutes({
    eventId: updated.id,
    hostUnitKey: updated.hostUnit?.key ?? existing.hostUnit?.key ?? null,
  });
}

export async function archiveEvent(eventId: string, reason?: string | null) {
  const existing = await getManagedEvent(eventId);

  if (!existing) {
    throw new Error("Event not found.");
  }

  const actor = await assertScopedEventPermission("events.archive", existing.hostUnitId);
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      status: "archived",
      missionStatus: "archived",
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "event.archived",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} event archived.`,
    oldValue: {
      status: existing.status,
    },
    newValue: {
      status: updated.status,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateEventRoutes({
    eventId: updated.id,
    hostUnitKey: updated.hostUnit?.key ?? existing.hostUnit?.key ?? null,
  });
}
