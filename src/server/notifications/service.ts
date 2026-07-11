import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import {
  type NotificationDeliveryStatus,
  getNotificationTypeDefinition,
} from "@/server/notifications/constants";
import type {
  CreateNotificationDeliveryInput,
  CreateNotificationInput,
} from "@/server/notifications/types";

function normalizeRequiredString(value: string, fieldLabel: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function revalidateNotificationSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/administration");
}

export function buildPortalNotificationDelivery(userId: string): CreateNotificationDeliveryInput {
  const now = new Date();

  return {
    channelType: "portal",
    deliveredAt: now,
    destinationKey: userId,
    lastAttemptAt: now,
    recipientUserId: userId,
    status: "sent",
  };
}

export async function createNotification(input: CreateNotificationInput) {
  const typeDefinition = getNotificationTypeDefinition(input.type);

  if (!typeDefinition) {
    throw new Error("Select a valid notification type.");
  }

  const notification = await prisma.notification.create({
    data: {
      actionUrl: normalizeOptionalString(input.actionUrl),
      createdByUserId: input.createdByUserId ?? null,
      message: normalizeRequiredString(input.message, "Notification message"),
      metadata: input.metadata ?? undefined,
      targetUnitId: input.targetUnitId ?? null,
      title: normalizeRequiredString(input.title, "Notification title"),
      type: input.type,
      urgency: input.urgency ?? typeDefinition.defaultUrgency,
      deliveries: input.deliveries?.length
        ? {
            create: input.deliveries.map((delivery) => ({
              channelType: delivery.channelType,
              deliveredAt: delivery.deliveredAt ?? null,
              destinationKey: normalizeRequiredString(
                delivery.destinationKey,
                "Notification destination",
              ),
              discordChannelMappingId: delivery.discordChannelMappingId ?? null,
              errorMessage: normalizeOptionalString(delivery.errorMessage),
              lastAttemptAt: delivery.lastAttemptAt ?? delivery.deliveredAt ?? null,
              providerMessageId: normalizeOptionalString(delivery.providerMessageId),
              readAt: delivery.readAt ?? null,
              recipientUserId: delivery.recipientUserId ?? null,
              retryCount: delivery.retryCount ?? 0,
              status: delivery.status ?? "pending",
            })),
          }
        : undefined,
    },
    include: {
      deliveries: true,
    },
  });

  revalidateNotificationSurfaces();

  return notification;
}

export async function createNotificationDeliveryRecord(
  notificationId: string,
  input: CreateNotificationDeliveryInput,
) {
  const delivery = await prisma.notificationDelivery.create({
    data: {
      channelType: input.channelType,
      deliveredAt: input.deliveredAt ?? null,
      destinationKey: normalizeRequiredString(input.destinationKey, "Notification destination"),
      discordChannelMappingId: input.discordChannelMappingId ?? null,
      errorMessage: normalizeOptionalString(input.errorMessage),
      lastAttemptAt: input.lastAttemptAt ?? input.deliveredAt ?? null,
      notificationId,
      providerMessageId: normalizeOptionalString(input.providerMessageId),
      readAt: input.readAt ?? null,
      recipientUserId: input.recipientUserId ?? null,
      retryCount: input.retryCount ?? 0,
      status: input.status ?? "pending",
    },
  });

  revalidateNotificationSurfaces();

  return delivery;
}

export async function markNotificationAsRead(deliveryId: string, userId: string) {
  const existing = await prisma.notificationDelivery.findFirst({
    where: {
      channelType: "portal",
      id: deliveryId,
      recipientUserId: userId,
    },
    select: {
      id: true,
      readAt: true,
    },
  });

  if (!existing) {
    throw new Error("Notification not found.");
  }

  if (existing.readAt) {
    return existing;
  }

  const updated = await prisma.notificationDelivery.update({
    where: {
      id: existing.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();

  return updated;
}

export async function markAllNotificationsAsRead(userId: string) {
  const updated = await prisma.notificationDelivery.updateMany({
    where: {
      channelType: "portal",
      clearedAt: null,
      readAt: null,
      recipientUserId: userId,
      status: {
        not: "cancelled",
      },
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();

  return updated;
}

export async function clearNotification(deliveryId: string, userId: string) {
  const existing = await prisma.notificationDelivery.findFirst({
    where: {
      channelType: "portal",
      id: deliveryId,
      recipientUserId: userId,
    },
    select: {
      clearedAt: true,
      id: true,
    },
  });

  if (!existing) {
    throw new Error("Notification not found.");
  }

  if (existing.clearedAt) {
    return existing;
  }

  const updated = await prisma.notificationDelivery.update({
    where: {
      id: existing.id,
    },
    data: {
      clearedAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();

  return updated;
}

export async function pinNotification(deliveryId: string, userId: string) {
  const existing = await prisma.notificationDelivery.findFirst({
    where: {
      channelType: "portal",
      id: deliveryId,
      recipientUserId: userId,
    },
    select: {
      id: true,
      pinnedAt: true,
    },
  });

  if (!existing) {
    throw new Error("Notification not found.");
  }

  const updated = await prisma.notificationDelivery.update({
    where: {
      id: existing.id,
    },
    data: {
      pinnedAt: existing.pinnedAt ? null : new Date(),
    },
  });

  revalidateNotificationSurfaces();

  return updated;
}

export async function clearReadNotifications(userId: string) {
  const updated = await prisma.notificationDelivery.updateMany({
    where: {
      channelType: "portal",
      clearedAt: null,
      readAt: {
        not: null,
      },
      recipientUserId: userId,
      status: {
        not: "cancelled",
      },
    },
    data: {
      clearedAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();

  return updated;
}

export async function clearAllNotifications(userId: string) {
  const updated = await prisma.notificationDelivery.updateMany({
    where: {
      channelType: "portal",
      clearedAt: null,
      recipientUserId: userId,
      status: {
        not: "cancelled",
      },
    },
    data: {
      clearedAt: new Date(),
    },
  });

  revalidateNotificationSurfaces();

  return updated;
}

type UpdateNotificationDeliveryStatusInput = {
  deliveryId: string;
  status: NotificationDeliveryStatus;
  actorUserId?: string | null;
  errorMessage?: string | null;
  providerMessageId?: string | null;
  incrementRetryCount?: boolean;
};

export async function updateNotificationDeliveryStatus(
  input: UpdateNotificationDeliveryStatusInput,
) {
  const existing = await prisma.notificationDelivery.findUnique({
    where: {
      id: input.deliveryId,
    },
    include: {
      notification: true,
      recipientUser: true,
    },
  });

  if (!existing) {
    throw new Error("Notification delivery not found.");
  }

  const now = new Date();
  const nextRetryCount = input.incrementRetryCount
    ? existing.retryCount + 1
    : existing.retryCount;
  const updated = await prisma.notificationDelivery.update({
    where: {
      id: existing.id,
    },
    data: {
      deliveredAt: input.status === "sent" ? now : existing.deliveredAt,
      errorMessage:
        input.errorMessage !== undefined
          ? normalizeOptionalString(input.errorMessage)
          : existing.errorMessage,
      lastAttemptAt: now,
      providerMessageId:
        input.providerMessageId !== undefined
          ? normalizeOptionalString(input.providerMessageId)
          : existing.providerMessageId,
      retryCount: nextRetryCount,
      status: input.status,
    },
  });

  if (existing.status !== "failed" && updated.status === "failed") {
    await recordAuditEvent({
      action: "notification.delivery.failed",
      actorUserId: input.actorUserId ?? null,
      entityId: updated.id,
      entityType: "NotificationDelivery",
      metadata: {
        channelType: updated.channelType,
        destinationKey: updated.destinationKey,
        notificationId: updated.notificationId,
        recipientUserId: updated.recipientUserId,
        retryCount: updated.retryCount,
      },
      reason: normalizeOptionalString(updated.errorMessage),
      summary: `${existing.notification.title} delivery reached a failed state.`,
    });
  }

  revalidateNotificationSurfaces();

  return updated;
}

export async function listFailedNotificationDeliveries() {
  return prisma.notificationDelivery.findMany({
    where: {
      status: "failed",
    },
    include: {
      notification: true,
      recipientUser: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function recordNotificationSettingsChangedPlaceholder(input: {
  actorUserId: string;
  summary: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  reason?: string | null;
}) {
  await recordAuditEvent({
    action: "notification.settings.changed_placeholder",
    actorUserId: input.actorUserId,
    entityType: "NotificationSettings",
    summary: input.summary,
    oldValue: input.oldValue ?? undefined,
    newValue: input.newValue ?? undefined,
    reason: normalizeOptionalString(input.reason),
  });
}

export async function createSamplePortalNotification(type: CreateNotificationInput["type"]) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const notificationDefinition = getNotificationTypeDefinition(type);

  if (!notificationDefinition) {
    throw new Error("Select a valid notification type.");
  }

  const notification = await createNotification({
    createdByUserId: actor.id,
    deliveries: [buildPortalNotificationDelivery(actor.id)],
    message:
      "This sample portal notification was created from the administration workspace to verify unread counts, read state, and delivery tracking foundations.",
    title: `${notificationDefinition.label} sample notification`,
    type,
    urgency: notificationDefinition.defaultUrgency,
  });

  await recordAuditEvent({
    action: "notification.manual_sent",
    actorUserId: actor.id,
    entityId: notification.id,
    entityType: "Notification",
    metadata: {
      deliveryCount: notification.deliveries.length,
      type,
    },
    summary: `${notification.title} was sent manually as a portal notification sample.`,
  });

  return notification;
}
