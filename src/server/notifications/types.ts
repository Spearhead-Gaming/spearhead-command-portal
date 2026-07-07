import type { Prisma } from "@prisma/client";

import type {
  NotificationChannelType,
  NotificationDeliveryStatus,
  NotificationTypeKey,
  NotificationUrgency,
} from "@/server/notifications/constants";

export type CreateNotificationDeliveryInput = {
  channelType: NotificationChannelType;
  destinationKey: string;
  status?: NotificationDeliveryStatus;
  recipientUserId?: string | null;
  discordChannelMappingId?: string | null;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  lastAttemptAt?: Date | null;
  retryCount?: number;
};

export type CreateNotificationInput = {
  createdByUserId?: string | null;
  targetUnitId?: string | null;
  type: NotificationTypeKey;
  urgency?: NotificationUrgency;
  title: string;
  message: string;
  actionUrl?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  deliveries?: CreateNotificationDeliveryInput[];
};

export type NotificationCenterItem = {
  actionUrl: string | null;
  createdAtLabel: string;
  createdByLabel: string | null;
  deliveryId: string;
  deliveryStatus: NotificationDeliveryStatus;
  id: string;
  isRead: boolean;
  message: string;
  targetUnitName: string | null;
  title: string;
  type: NotificationTypeKey;
  urgency: NotificationUrgency;
};

export type NotificationCenterData = {
  enabled: boolean;
  items: NotificationCenterItem[];
  unreadCount: number;
};

export type NotificationDeliveryAdminItem = {
  channelType: NotificationChannelType;
  createdAtLabel: string;
  deliveredAtLabel: string | null;
  destinationKey: string;
  errorMessage: string | null;
  id: string;
  notificationTitle: string;
  notificationType: NotificationTypeKey;
  recipientLabel: string | null;
  retryCount: number;
  status: NotificationDeliveryStatus;
  updatedAtLabel: string;
};

export type NotificationDeliveryOverview = {
  enabled: boolean;
  failedDeliveries: NotificationDeliveryAdminItem[];
  recentDeliveries: NotificationDeliveryAdminItem[];
  summary: {
    failed: number;
    pending: number;
    retrying: number;
    sent: number;
  };
};
