import type { Prisma } from "@prisma/client";

import type { NotificationChannelType } from "@/server/notifications/constants";

export type CommunicationCategory =
  | "operations"
  | "deployments"
  | "patrols"
  | "aar"
  | "applications"
  | "recruitment"
  | "training"
  | "personnel"
  | "qualifications"
  | "attendance"
  | "moderation"
  | "administration"
  | "announcements"
  | "alerts"
  | "developer"
  | "diagnostics"
  | "emergency"
  | "health"
  | "system"
  | "community"
  | string;

export type CommunicationPriority = "critical" | "high" | "normal" | "low" | "informational";

export type CommunicationAudience =
  | { type: "users"; userIds: string[] }
  | { type: "unit"; unitId: string }
  | { type: "permission"; permissionKey: string }
  | { type: "all_active_members" }
  | { type: "s3_staff" }
  | { type: "command_staff" }
  | { type: "discord_channel"; mappingKey: string; unitIds?: Array<string | null | undefined> };

export type CommunicationChannelRequest =
  | { type: "portal" }
  | {
      mappingId?: string | null;
      mappingKey?: string | null;
      type: "discord_channel";
      unitIds?: Array<string | null | undefined>;
    }
  | { type: "discord_dm" }
  | { type: "email" }
  | { type: "sms" };

export type CommunicationRequestInput = {
  body: string;
  category: CommunicationCategory;
  idempotencyKey?: string | null;
  priority?: CommunicationPriority;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  requestedByUserId?: string | null;
  requestedChannels: CommunicationChannelRequest[];
  scheduledFor?: Date | null;
  sourceEvent: string;
  sourceModule: string;
  targetAudience: CommunicationAudience[];
  templateKey?: string | null;
  templateVariables?: Prisma.InputJsonValue | null;
  title: string;
  type: string;
  providerPayload?: Partial<
    Pick<CommunicationProviderPayload, "actionUrl" | "actions" | "fields" | "footer" | "visibility">
  >;
};

export type ResolvedCommunicationAudience = {
  discordChannelMappings: Array<{
    mappingKey: string;
    unitIds?: Array<string | null | undefined>;
  }>;
  userIds: string[];
};

export type CommunicationProviderPayload = {
  actionUrl?: string | null;
  actions?: Array<{
    customId?: string;
    label: string;
    style: "primary" | "secondary" | "danger" | "link" | "success";
    url?: string | null;
  }>;
  body: string;
  fields?: Array<{ label: string; value: string }>;
  footer?: string | null;
  title: string;
  visibility?: "public" | "staff" | "ephemeral";
};

export type CommunicationDeliveryRequest = {
  communicationId: string;
  mappingId?: string | null;
  mappingKey?: string | null;
  notificationId: string;
  payload: CommunicationProviderPayload;
  recipientUserId?: string | null;
  requestedByUserId?: string | null;
  unitIds?: Array<string | null | undefined>;
};

export type CommunicationDeliveryResult = {
  destinationKey: string;
  errorMessage: string | null;
  notificationDeliveryId: string | null;
  providerMessageId: string | null;
  status: "pending" | "processing" | "delivered" | "failed" | "retrying" | "cancelled" | "superseded";
};

export type CommunicationDeliveryProvider = {
  channelType: NotificationChannelType;
  id: string;
  normalizeError: (error: unknown) => string;
  retry: (input: CommunicationDeliveryRequest) => Promise<CommunicationDeliveryResult>;
  send: (input: CommunicationDeliveryRequest) => Promise<CommunicationDeliveryResult>;
  validateConfiguration: () => Promise<{ ok: true } | { errorMessage: string; ok: false }>;
};

export type CommunicationCenterData = {
  announcements: Array<{
    createdAt: Date;
    id: string;
    status: string;
    title: string;
    type: string;
  }>;
  communications: Array<{
    category: string;
    createdAt: Date;
    deliverySummary: string;
    id: string;
    relatedEntityId: string | null;
    relatedEntityType: string | null;
    sourceModule: string;
    status: string;
    title: string;
    type: string;
  }>;
  deliveries: Array<{
    attemptCount: number;
    channelType: string;
    communicationTitle: string;
    createdAt: Date;
    destinationKey: string;
    errorMessage: string | null;
    id: string;
    providerId: string;
    providerMessageId: string | null;
    relatedEntityId: string | null;
    relatedEntityType: string | null;
    sanitizedPayload: Prisma.JsonValue | null;
    status: string;
    updatedAt: Date;
  }>;
  metrics: {
    averageDeliverySeconds: number | null;
    failedDeliveries: number;
    pendingDeliveries: number;
    retries: number;
    successRate: number | null;
    totalCommunications: number;
    totalDeliveries: number;
  };
  scheduledCommunications: Array<{
    id: string;
    scheduledFor: Date | null;
    title: string;
    type: string;
  }>;
  preferences: Array<{
    category: string;
    criticalOnly: boolean;
    discordChannelEnabled: boolean;
    portalEnabled: boolean;
  }>;
  templates: Array<{
    category: string;
    id: string;
    isActive: boolean;
    key: string;
    title: string;
    version: number;
  }>;
};
