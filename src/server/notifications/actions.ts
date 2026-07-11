"use server";

import { getCurrentUser } from "@/server/auth/current-user";
import { requirePermission } from "@/server/permissions/access";
import {
  clearAllNotifications,
  clearNotification,
  clearReadNotifications,
  createSamplePortalNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  pinNotification,
  updateNotificationDeliveryStatus,
} from "@/server/notifications/service";
import { isNotificationTypeKey } from "@/server/notifications/constants";
import { recordAuditEvent } from "@/server/services/audit-log-service";

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

export async function markNotificationAsReadAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  const deliveryId = getRequiredString(formData, "deliveryId", "Notification delivery");

  await markNotificationAsRead(deliveryId, user.id);
}

export async function markAllNotificationsAsReadAction() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  await markAllNotificationsAsRead(user.id);
}

export async function clearNotificationAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  const deliveryId = getRequiredString(formData, "deliveryId", "Notification delivery");

  await clearNotification(deliveryId, user.id);
}

export async function toggleNotificationPinnedAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  const deliveryId = getRequiredString(formData, "deliveryId", "Notification delivery");

  await pinNotification(deliveryId, user.id);
}

export async function clearReadNotificationsAction() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  await clearReadNotifications(user.id);
}

export async function clearAllNotificationsAction() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  await clearAllNotifications(user.id);
}

export async function createSamplePortalNotificationAction(formData: FormData) {
  await requirePermission("notifications.send");

  const type = getRequiredString(formData, "type", "Notification type");

  if (!isNotificationTypeKey(type)) {
    throw new Error("Select a valid notification type.");
  }

  await createSamplePortalNotification(type);
}

export async function requestNotificationDeliveryRetryAction(formData: FormData) {
  const actor = await requirePermission("notifications.delivery.retry");
  const deliveryId = getRequiredString(formData, "deliveryId", "Notification delivery");

  const updated = await updateNotificationDeliveryStatus({
    actorUserId: actor.id,
    deliveryId,
    errorMessage: "Retry requested manually. Delivery execution remains a placeholder in Milestone 11.",
    incrementRetryCount: true,
    status: "retrying",
  });

  await recordAuditEvent({
    action: "notification.delivery.retry_requested",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "NotificationDelivery",
    metadata: {
      destinationKey: updated.destinationKey,
      retryCount: updated.retryCount,
      status: updated.status,
    },
    summary: `${updated.destinationKey} delivery was marked for retry.`,
  });
}
