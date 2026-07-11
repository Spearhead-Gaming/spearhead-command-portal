import { prisma } from "@/server/database/client";
import { requirePermission } from "@/server/permissions/access";
import type { CommunicationCenterData } from "@/server/communications/types";

function summarizeDeliveries(deliveries: Array<{ status: string }>) {
  if (deliveries.length === 0) {
    return "No deliveries";
  }

  const failed = deliveries.filter((delivery) => delivery.status === "failed").length;
  const delivered = deliveries.filter((delivery) => delivery.status === "delivered").length;
  const pending = deliveries.filter((delivery) => delivery.status === "pending" || delivery.status === "processing").length;

  return `${delivered} delivered / ${failed} failed / ${pending} pending`;
}

export async function getCommunicationCenterData(): Promise<CommunicationCenterData> {
  await requirePermission("communications.view");

  const [communications, deliveries, templates, preferences, announcements] = await Promise.all([
    prisma.communication.findMany({
      include: {
        deliveries: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
    }),
    prisma.communicationDelivery.findMany({
      include: {
        communication: {
          select: {
            relatedEntityId: true,
            relatedEntityType: true,
            title: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    }),
    prisma.communicationTemplate.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
      take: 50,
    }),
    prisma.communicationPreference.findMany({
      orderBy: [{ category: "asc" }],
      take: 20,
    }),
    prisma.announcement.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 20,
    }),
  ]);
  const delivered = deliveries.filter((delivery) => delivery.status === "delivered").length;
  const failed = deliveries.filter((delivery) => delivery.status === "failed").length;
  const pending = deliveries.filter((delivery) => ["pending", "processing", "retrying"].includes(delivery.status)).length;
  const deliveredWithTimes = deliveries.filter((delivery) => delivery.deliveredAt);
  const averageDeliverySeconds =
    deliveredWithTimes.length > 0
      ? Math.round(
          deliveredWithTimes.reduce((total, delivery) => {
            const deliveredAt = delivery.deliveredAt?.getTime() ?? delivery.updatedAt.getTime();

            return total + Math.max(deliveredAt - delivery.createdAt.getTime(), 0) / 1000;
          }, 0) / deliveredWithTimes.length,
        )
      : null;

  return {
    announcements: announcements.map((announcement) => ({
      createdAt: announcement.createdAt,
      id: announcement.id,
      status: announcement.status,
      title: announcement.title,
      type: announcement.type,
    })),
    communications: communications.map((communication) => ({
      category: communication.category,
      createdAt: communication.createdAt,
      deliverySummary: summarizeDeliveries(communication.deliveries),
      id: communication.id,
      relatedEntityId: communication.relatedEntityId,
      relatedEntityType: communication.relatedEntityType,
      sourceModule: communication.sourceModule,
      status: communication.status,
      title: communication.title,
      type: communication.type,
    })),
    deliveries: deliveries.map((delivery) => ({
      attemptCount: delivery.attemptCount,
      channelType: delivery.channelType,
      communicationTitle: delivery.communication.title,
      createdAt: delivery.createdAt,
      destinationKey: delivery.destinationKey,
      errorMessage: delivery.errorMessage,
      id: delivery.id,
      providerId: delivery.providerId,
      providerMessageId: delivery.providerMessageId,
      relatedEntityId: delivery.communication.relatedEntityId,
      relatedEntityType: delivery.communication.relatedEntityType,
      sanitizedPayload: delivery.sanitizedPayload,
      status: delivery.status,
      updatedAt: delivery.updatedAt,
    })),
    metrics: {
      averageDeliverySeconds,
      failedDeliveries: failed,
      pendingDeliveries: pending,
      retries: deliveries.reduce((total, delivery) => total + delivery.attemptCount, 0) - deliveries.length,
      successRate: deliveries.length > 0 ? Math.round((delivered / deliveries.length) * 100) : null,
      totalCommunications: communications.length,
      totalDeliveries: deliveries.length,
    },
    preferences: preferences.map((preference) => ({
      category: preference.category,
      criticalOnly: preference.criticalOnly,
      discordChannelEnabled: preference.discordChannelEnabled,
      portalEnabled: preference.portalEnabled,
    })),
    templates: templates.map((template) => ({
      category: template.category,
      id: template.id,
      isActive: template.isActive,
      key: template.key,
      title: template.title,
      version: template.version,
    })),
    scheduledCommunications: communications
      .filter((communication) => communication.status === "scheduled")
      .map((communication) => ({
        id: communication.id,
        scheduledFor: communication.scheduledFor,
        title: communication.title,
        type: communication.type,
      })),
  };
}
