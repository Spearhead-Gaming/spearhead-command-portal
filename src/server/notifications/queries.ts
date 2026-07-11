import { prisma } from "@/server/database/client";
import { can } from "@/server/permissions/access";
import type { PortalUser } from "@/features/auth/types";
import {
  isNotificationChannelType,
  isNotificationDeliveryStatus,
  isNotificationTypeKey,
  isNotificationUrgency,
} from "@/server/notifications/constants";
import type {
  NotificationCenterData,
  NotificationDeliveryAdminItem,
  NotificationDeliveryOverview,
} from "@/server/notifications/types";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function mapDeliveryStatusOverview(input: {
  channelType: string;
  createdAt: Date;
  deliveredAt: Date | null;
  destinationKey: string;
  errorMessage: string | null;
  id: string;
  notification: {
    title: string;
    type: string;
  };
  recipientUser: {
    displayName: string | null;
    email: string | null;
    name: string | null;
  } | null;
  retryCount: number;
  status: string;
  updatedAt: Date;
}): NotificationDeliveryAdminItem {
  return {
    channelType: isNotificationChannelType(input.channelType)
      ? input.channelType
      : "portal",
    createdAtLabel: formatTimestamp(input.createdAt),
    deliveredAtLabel: input.deliveredAt ? formatTimestamp(input.deliveredAt) : null,
    destinationKey: input.destinationKey,
    errorMessage: input.errorMessage,
    id: input.id,
    notificationTitle: input.notification.title,
    notificationType: isNotificationTypeKey(input.notification.type)
      ? input.notification.type
      : "event.reminder",
    recipientLabel:
      input.recipientUser?.displayName ??
      input.recipientUser?.name ??
      input.recipientUser?.email ??
      null,
    retryCount: input.retryCount,
    status: isNotificationDeliveryStatus(input.status) ? input.status : "pending",
    updatedAtLabel: formatTimestamp(input.updatedAt),
  };
}

export async function getNotificationCenterDataForUser(
  user: Pick<PortalUser, "id" | "permissions">,
): Promise<NotificationCenterData> {
  const enabled =
    user.permissions.includes("notifications.view") ||
    user.permissions.includes("core.notifications.view");

  if (!enabled) {
    return {
      enabled: false,
      items: [],
      unreadCount: 0,
    };
  }

  const [deliveries, unreadCount] = await Promise.all([
    prisma.notificationDelivery.findMany({
      where: {
        channelType: "portal",
        clearedAt: null,
        recipientUserId: user.id,
        status: {
          not: "cancelled",
        },
      },
      include: {
        notification: {
          include: {
            createdBy: {
              select: {
                displayName: true,
                email: true,
                name: true,
              },
            },
            targetUnit: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          pinnedAt: "desc",
        },
        {
          readAt: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 8,
    }),
    prisma.notificationDelivery.count({
      where: {
        channelType: "portal",
        clearedAt: null,
        readAt: null,
        recipientUserId: user.id,
        status: {
          not: "cancelled",
        },
      },
    }),
  ]);

  return {
    enabled,
    items: deliveries.map((delivery) => ({
      actionUrl: delivery.notification.actionUrl,
      createdAtLabel: formatTimestamp(delivery.notification.createdAt),
      createdByLabel:
        delivery.notification.createdBy?.displayName ??
        delivery.notification.createdBy?.name ??
        delivery.notification.createdBy?.email ??
        null,
      deliveryId: delivery.id,
      deliveryStatus: isNotificationDeliveryStatus(delivery.status)
        ? delivery.status
        : "pending",
      id: delivery.notification.id,
      isRead: Boolean(delivery.readAt),
      isPinned: Boolean(delivery.pinnedAt),
      message: delivery.notification.message,
      targetUnitName: delivery.notification.targetUnit?.name ?? null,
      title: delivery.notification.title,
      type: isNotificationTypeKey(delivery.notification.type)
        ? delivery.notification.type
        : "event.reminder",
      urgency: isNotificationUrgency(delivery.notification.urgency)
        ? delivery.notification.urgency
        : "info",
    })),
    unreadCount,
  };
}

export async function getNotificationDeliveryOverviewForUser(
  user: Pick<PortalUser, "id" | "permissions" | "permissionGrants">,
): Promise<NotificationDeliveryOverview> {
  if (!can(user, "notifications.delivery.view")) {
    return {
      enabled: false,
      failedDeliveries: [],
      recentDeliveries: [],
      summary: {
        failed: 0,
        pending: 0,
        retrying: 0,
        sent: 0,
      },
    };
  }

  const [deliveries, summaryCounts] = await Promise.all([
    prisma.notificationDelivery.findMany({
      include: {
        notification: {
          select: {
            title: true,
            type: true,
          },
        },
        recipientUser: {
          select: {
            displayName: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 50,
    }),
    prisma.notificationDelivery.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    }),
  ]);

  const recentDeliveries = deliveries.map(mapDeliveryStatusOverview);
  const failedDeliveries = recentDeliveries.filter((delivery) => delivery.status === "failed");
  const summary = summaryCounts.reduce(
    (accumulator, entry) => {
      if (
        entry.status === "failed" ||
        entry.status === "pending" ||
        entry.status === "retrying" ||
        entry.status === "sent"
      ) {
        accumulator[entry.status] = entry._count.id;
      }

      return accumulator;
    },
    {
      failed: 0,
      pending: 0,
      retrying: 0,
      sent: 0,
    },
  );

  return {
    enabled: true,
    failedDeliveries: failedDeliveries.slice(0, 6),
    recentDeliveries,
    summary,
  };
}
