import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { processCommunicationRequest } from "@/server/communications/pipeline";
import { getDeliveryProvider } from "@/server/communications/providers";
import type { CommunicationRequestInput } from "@/server/communications/types";
import { prisma } from "@/server/database/client";
import { requirePermission } from "@/server/permissions/access";
import { recordAuditEvent } from "@/server/services/audit-log-service";

function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getPayloadString(payload: Prisma.JsonValue | null, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = payload[key];

  return typeof value === "string" ? value : null;
}

export async function requestCommunication(input: CommunicationRequestInput) {
  const actor = await requirePermission("communications.send");

  const communication = await processCommunicationRequest({
    ...input,
    requestedByUserId: input.requestedByUserId ?? actor.id,
  });

  revalidatePath("/communications");

  return communication;
}

export async function createAnnouncement(input: {
  body: string;
  requestedChannels?: CommunicationRequestInput["requestedChannels"];
  targetAudience?: CommunicationRequestInput["targetAudience"];
  title: string;
  type: string;
}) {
  const actor = await requirePermission("announcements.manage");
  const announcement = await prisma.announcement.create({
    data: {
      audience: toInputJson(input.targetAudience ?? [{ type: "all_active_members" }]),
      body: normalizeRequiredString(input.body, "Announcement body"),
      createdByUserId: actor.id,
      requestedChannels: toInputJson(input.requestedChannels ?? [{ type: "portal" }]),
      status: "draft",
      title: normalizeRequiredString(input.title, "Announcement title"),
      type: normalizeRequiredString(input.type, "Announcement type"),
    },
  });

  await recordAuditEvent({
    action: "announcement.created",
    actorUserId: actor.id,
    entityId: announcement.id,
    entityType: "Announcement",
    summary: `Announcement created: ${announcement.title}.`,
  });
  revalidatePath("/communications");

  return announcement;
}

export async function sendAnnouncement(announcementId: string) {
  const actor = await requirePermission("announcements.send");
  const announcement = await prisma.announcement.findUnique({
    where: {
      id: announcementId,
    },
  });

  if (!announcement) {
    throw new Error("Announcement not found.");
  }

  if (announcement.status === "sent") {
    return announcement;
  }

  const communication = await processCommunicationRequest({
    body: announcement.body,
    category: announcement.type.includes("deployment") ? "deployments" : "community",
    idempotencyKey: `announcement:${announcement.id}`,
    priority: "normal",
    requestedByUserId: actor.id,
    requestedChannels: announcement.requestedChannels as CommunicationRequestInput["requestedChannels"],
    sourceEvent: "announcement.sent",
    sourceModule: "communications",
    targetAudience: announcement.audience as CommunicationRequestInput["targetAudience"],
    templateKey: "community.announcement",
    templateVariables: {
      body: announcement.body,
      title: announcement.title,
    },
    title: announcement.title,
    type: "community.announcement",
  });
  const updated = await prisma.announcement.update({
    where: {
      id: announcement.id,
    },
    data: {
      communicationId: communication.id,
      sentAt: new Date(),
      sentByUserId: actor.id,
      status: "sent",
    },
  });

  await recordAuditEvent({
    action: "announcement.sent",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "Announcement",
    metadata: {
      communicationId: communication.id,
    },
    summary: `Announcement sent: ${updated.title}.`,
  });
  revalidatePath("/communications");

  return updated;
}

export async function cancelScheduledCommunication(communicationId: string) {
  const actor = await requirePermission("communications.manage");
  const communication = await prisma.communication.update({
    where: {
      id: communicationId,
    },
    data: {
      status: "cancelled",
    },
  });

  await recordAuditEvent({
    action: "communication.scheduled_cancelled",
    actorUserId: actor.id,
    entityId: communication.id,
    entityType: "Communication",
    summary: `Scheduled communication cancelled: ${communication.title}.`,
  });
  revalidatePath("/communications");

  return communication;
}

export async function retryCommunicationDelivery(deliveryId: string) {
  const actor = await requirePermission("communications.retry");
  const delivery = await prisma.communicationDelivery.findUnique({
    where: {
      id: deliveryId,
    },
    include: {
      communication: true,
      notificationDelivery: true,
    },
  });

  if (!delivery) {
    throw new Error("Communication delivery not found.");
  }

  const provider = getDeliveryProvider(delivery.channelType);

  if (!provider) {
    throw new Error(`No delivery provider is registered for ${delivery.channelType}.`);
  }

  if (!delivery.notificationDelivery?.notificationId) {
    throw new Error("This delivery cannot be retried because it has no backing notification record.");
  }

  const result = await provider.retry({
    communicationId: delivery.communicationId,
    mappingKey: getPayloadString(delivery.sanitizedPayload, "mappingKey"),
    notificationId: delivery.notificationDelivery.notificationId,
    payload: {
      body: delivery.communication.body,
      title: delivery.communication.title,
    },
    recipientUserId: delivery.recipientUserId,
    requestedByUserId: actor.id,
  });

  await recordAuditEvent({
    action: result.status === "delivered" ? "communication.delivery.retry_completed" : "communication.delivery.retry_failed",
    actorUserId: actor.id,
    entityId: delivery.id,
    entityType: "CommunicationDelivery",
    metadata: {
      newDeliveryStatus: result.status,
      providerMessageId: result.providerMessageId,
    },
    reason: result.errorMessage,
    summary: `Communication delivery retry ${result.status}: ${delivery.communication.title}.`,
  });
  revalidatePath("/communications");

  return result;
}

export async function retryAllFailedCommunicationDeliveries() {
  const actor = await requirePermission("communications.retry");
  const deliveries = await prisma.communicationDelivery.findMany({
    where: {
      status: "failed",
    },
    select: {
      id: true,
    },
    take: 25,
  });
  const results = [];

  for (const delivery of deliveries) {
    try {
      results.push(await retryCommunicationDelivery(delivery.id));
    } catch (error) {
      await recordAuditEvent({
        action: "communication.delivery.retry_failed",
        actorUserId: actor.id,
        entityId: delivery.id,
        entityType: "CommunicationDelivery",
        reason: error instanceof Error ? error.message : "Unknown retry failure.",
        summary: "Communication delivery retry failed.",
      });
    }
  }

  revalidatePath("/communications");

  return results;
}
