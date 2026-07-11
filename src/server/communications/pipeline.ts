import { Prisma } from "@prisma/client";

import { resolveCommunicationAudience } from "@/server/communications/audience";
import { filterUsersByCommunicationPreferences } from "@/server/communications/preferences";
import { getDeliveryProvider, recordProviderUnavailableDelivery } from "@/server/communications/providers";
import { renderCommunicationTemplate } from "@/server/communications/templates";
import type { CommunicationRequestInput } from "@/server/communications/types";
import { prisma } from "@/server/database/client";
import { getNotificationTypeDefinition } from "@/server/notifications/constants";
import { createNotification } from "@/server/notifications/service";
import { recordAuditEvent } from "@/server/services/audit-log-service";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validateRequest(input: CommunicationRequestInput) {
  if (!input.title.trim()) {
    throw new Error("Communication title is required.");
  }

  if (!input.body.trim()) {
    throw new Error("Communication body is required.");
  }

  if (input.requestedChannels.length === 0) {
    throw new Error("Select at least one communication channel.");
  }

  if (input.targetAudience.length === 0) {
    throw new Error("Select at least one target audience.");
  }
}

export async function processCommunicationRequest(input: CommunicationRequestInput) {
  validateRequest(input);

  if (input.idempotencyKey) {
    const existing = await prisma.communication.findUnique({
      where: {
        idempotencyKey: input.idempotencyKey,
      },
      include: {
        deliveries: true,
      },
    });

    if (existing) {
      return existing;
    }
  }

  const rendered = await renderCommunicationTemplate({
    body: input.body,
    templateKey: input.templateKey,
    templateVariables: input.templateVariables,
    title: input.title,
  });
  const audience = await resolveCommunicationAudience(input.targetAudience);
  const communication = await prisma.communication.create({
    data: {
      body: rendered.body,
      category: input.category,
      idempotencyKey: input.idempotencyKey ?? null,
      priority: input.priority ?? "normal",
      relatedEntityId: input.relatedEntityId ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      requestedByUserId: input.requestedByUserId ?? null,
      requestedChannels: toJson(input.requestedChannels),
      scheduledFor: input.scheduledFor ?? null,
      sourceEvent: input.sourceEvent,
      sourceModule: input.sourceModule,
      status: input.scheduledFor ? "scheduled" : "requested",
      targetAudience: toJson(input.targetAudience),
      templateKey: input.templateKey ?? null,
      templateVariables: input.templateVariables ?? undefined,
      title: rendered.title,
      type: input.type,
    },
  });
  const notification = await createNotification({
    actionUrl:
      input.relatedEntityType && input.relatedEntityId
        ? `/communications?entity=${encodeURIComponent(input.relatedEntityType)}:${encodeURIComponent(input.relatedEntityId)}`
        : "/communications",
    createdByUserId: input.requestedByUserId ?? null,
    message: rendered.body,
    metadata: {
      communicationId: communication.id,
      sourceEvent: input.sourceEvent,
      sourceModule: input.sourceModule,
      templateVersion: rendered.templateVersion,
    },
    title: rendered.title,
    type: (getNotificationTypeDefinition(input.type) ? input.type : "system.alert") as never,
    urgency: input.priority === "critical" ? "critical" : input.priority === "high" ? "warning" : "info",
  });

  await recordAuditEvent({
    action: "communication.requested",
    actorUserId: input.requestedByUserId ?? null,
    entityId: communication.id,
    entityType: "Communication",
    metadata: {
      category: input.category,
      channels: input.requestedChannels.map((channel) => channel.type),
      sourceEvent: input.sourceEvent,
      sourceModule: input.sourceModule,
    },
    summary: `Communication requested: ${rendered.title}.`,
  });

  if (input.scheduledFor) {
    return prisma.communication.update({
      where: {
        id: communication.id,
      },
      data: {
        status: "scheduled",
      },
      include: {
        deliveries: true,
      },
    });
  }

  for (const channel of input.requestedChannels) {
    const provider = getDeliveryProvider(channel.type);

    if (!provider) {
      await recordProviderUnavailableDelivery({
        channelType: channel.type,
        communicationId: communication.id,
        destinationKey: channel.type,
        errorMessage: `No delivery provider is registered for ${channel.type}.`,
        providerId: `${channel.type}-unavailable`,
        sanitizedPayload: {
          title: rendered.title,
        },
      });
      continue;
    }

    try {
      if (channel.type === "portal") {
        const filteredUserIds = await filterUsersByCommunicationPreferences({
          category: input.category,
          priority: input.priority ?? "normal",
          requestedChannel: channel,
          userIds: audience.userIds,
        });

        for (const userId of filteredUserIds) {
          await provider.send({
            communicationId: communication.id,
            notificationId: notification.id,
            payload: {
              body: rendered.body,
              title: rendered.title,
            },
            recipientUserId: userId,
            requestedByUserId: input.requestedByUserId ?? null,
          });
        }
      } else if (channel.type === "discord_channel") {
        const mappings =
          channel.mappingKey
            ? [{ mappingKey: channel.mappingKey, unitIds: channel.unitIds }]
            : audience.discordChannelMappings;

        for (const mapping of mappings) {
          await provider.send({
            communicationId: communication.id,
            mappingKey: mapping.mappingKey,
            notificationId: notification.id,
            payload: {
              body: rendered.body,
              title: rendered.title,
            },
            requestedByUserId: input.requestedByUserId ?? null,
            unitIds: mapping.unitIds,
          });
        }
      }
    } catch (error) {
      await recordAuditEvent({
        action: "communication.delivery.failed",
        actorUserId: input.requestedByUserId ?? null,
        entityId: communication.id,
        entityType: "Communication",
        reason: provider.normalizeError(error),
        summary: `${provider.id} delivery failed for ${rendered.title}.`,
      });
    }
  }

  return prisma.communication.update({
    where: {
      id: communication.id,
    },
    data: {
      status: "sent",
    },
    include: {
      deliveries: true,
    },
  });
}
