import { prisma } from "@/server/database/client";
import { sendDiscordNotificationToMappedUnits } from "@/server/discord/delivery/provider";
import type { DiscordMessagePayload } from "@/server/discord/types";
import { buildPortalNotificationDelivery, createNotificationDeliveryRecord } from "@/server/notifications/service";
import type {
  CommunicationDeliveryProvider,
  CommunicationDeliveryRequest,
  CommunicationDeliveryResult,
} from "@/server/communications/types";

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown communication provider error.";
}

async function recordAttempt(input: {
  communicationDeliveryId?: string | null;
  notificationDeliveryId?: string | null;
  providerId: string;
  providerMessageId?: string | null;
  sanitizedRequest?: object | null;
  sanitizedResponse?: object | null;
  status: string;
  errorMessage?: string | null;
}) {
  return prisma.communicationAttempt.create({
    data: {
      communicationDeliveryId: input.communicationDeliveryId ?? null,
      errorMessage: input.errorMessage ?? null,
      notificationDeliveryId: input.notificationDeliveryId ?? null,
      providerId: input.providerId,
      providerMessageId: input.providerMessageId ?? null,
      sanitizedRequest: input.sanitizedRequest ?? undefined,
      sanitizedResponse: input.sanitizedResponse ?? undefined,
      status: input.status,
    },
  });
}

async function createCommunicationDelivery(input: {
  communicationId: string;
  destinationKey: string;
  channelType: string;
  notificationDeliveryId?: string | null;
  providerId: string;
  recipientUserId?: string | null;
  status: CommunicationDeliveryResult["status"];
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sanitizedPayload?: object | null;
}) {
  return prisma.communicationDelivery.create({
    data: {
      attemptCount: 1,
      channelType: input.channelType,
      communicationId: input.communicationId,
      deliveredAt: input.status === "delivered" ? new Date() : null,
      destinationKey: input.destinationKey,
      errorMessage: input.errorMessage ?? null,
      notificationDeliveryId: input.notificationDeliveryId ?? null,
      providerId: input.providerId,
      providerMessageId: input.providerMessageId ?? null,
      recipientUserId: input.recipientUserId ?? null,
      sanitizedPayload: input.sanitizedPayload ?? undefined,
      status: input.status,
    },
  });
}

export async function recordProviderUnavailableDelivery(input: {
  channelType: string;
  communicationId: string;
  destinationKey: string;
  errorMessage: string;
  providerId: string;
  sanitizedPayload?: object | null;
}) {
  const delivery = await createCommunicationDelivery({
    channelType: input.channelType,
    communicationId: input.communicationId,
    destinationKey: input.destinationKey,
    errorMessage: input.errorMessage,
    providerId: input.providerId,
    sanitizedPayload: input.sanitizedPayload,
    status: "failed",
  });

  await recordAttempt({
    communicationDeliveryId: delivery.id,
    errorMessage: input.errorMessage,
    providerId: input.providerId,
    sanitizedRequest: {
      channelType: input.channelType,
    },
    status: "failed",
  });

  return delivery;
}

export const portalNotificationProvider: CommunicationDeliveryProvider = {
  channelType: "portal",
  id: "portal-notification",
  normalizeError,
  retry: (input) => portalNotificationProvider.send(input),
  send: async (input: CommunicationDeliveryRequest) => {
    if (!input.recipientUserId) {
      throw new Error("Portal notification delivery requires a recipient user.");
    }

    const delivery = await createNotificationDeliveryRecord(
      input.notificationId,
      buildPortalNotificationDelivery(input.recipientUserId),
    );
    const communicationDelivery = await createCommunicationDelivery({
      channelType: "portal",
      communicationId: input.communicationId,
      destinationKey: input.recipientUserId,
      notificationDeliveryId: delivery.id,
      providerId: portalNotificationProvider.id,
      providerMessageId: null,
      recipientUserId: input.recipientUserId,
      sanitizedPayload: {
        title: input.payload.title,
      },
      status: "delivered",
    });

    await recordAttempt({
      communicationDeliveryId: communicationDelivery.id,
      notificationDeliveryId: delivery.id,
      providerId: portalNotificationProvider.id,
      sanitizedRequest: {
        recipientUserId: input.recipientUserId,
      },
      status: "delivered",
    });

    return {
      destinationKey: input.recipientUserId,
      errorMessage: null,
      notificationDeliveryId: delivery.id,
      providerMessageId: null,
      status: "delivered",
    };
  },
  validateConfiguration: async () => ({ ok: true }),
};

function toDiscordPayload(input: CommunicationDeliveryRequest): DiscordMessagePayload {
  return {
    actionUrl: input.payload.actionUrl ?? undefined,
    body: input.payload.body,
    fields: input.payload.fields,
    title: input.payload.title,
    visibility: "staff",
  };
}

export const discordChannelProvider: CommunicationDeliveryProvider = {
  channelType: "discord_channel",
  id: "discord-channel",
  normalizeError,
  retry: (input) => discordChannelProvider.send(input),
  send: async (input: CommunicationDeliveryRequest) => {
    const deliveries = await sendDiscordNotificationToMappedUnits({
      actorUserId: input.requestedByUserId ?? null,
      mappingKey: input.mappingKey ?? "staff-alerts",
      notificationId: input.notificationId,
      payload: toDiscordPayload(input),
      unitIds: input.unitIds,
    });
    const firstDelivery = deliveries[0] ?? null;
    const status = firstDelivery?.status === "sent" ? "delivered" : "failed";
    const communicationDelivery = await createCommunicationDelivery({
      channelType: "discord_channel",
      communicationId: input.communicationId,
      destinationKey: firstDelivery?.channelId ?? input.mappingKey ?? "unmapped",
      notificationDeliveryId: firstDelivery?.deliveryId ?? null,
      providerId: discordChannelProvider.id,
      providerMessageId: firstDelivery?.providerMessageId ?? null,
      sanitizedPayload: {
        title: input.payload.title,
        mappingKey: input.mappingKey,
      },
      status,
      errorMessage: firstDelivery?.errorMessage ?? null,
    });

    await recordAttempt({
      communicationDeliveryId: communicationDelivery.id,
      errorMessage: firstDelivery?.errorMessage ?? null,
      notificationDeliveryId: firstDelivery?.deliveryId ?? null,
      providerId: discordChannelProvider.id,
      providerMessageId: firstDelivery?.providerMessageId ?? null,
      sanitizedRequest: {
        mappingKey: input.mappingKey,
        title: input.payload.title,
      },
      status,
    });

    return {
      destinationKey: firstDelivery?.channelId ?? input.mappingKey ?? "unmapped",
      errorMessage: firstDelivery?.errorMessage ?? null,
      notificationDeliveryId: firstDelivery?.deliveryId ?? null,
      providerMessageId: firstDelivery?.providerMessageId ?? null,
      status,
    };
  },
  validateConfiguration: async () => ({ ok: true }),
};

const providers = new Map<string, CommunicationDeliveryProvider>();

export function registerDeliveryProvider(provider: CommunicationDeliveryProvider) {
  providers.set(provider.channelType, provider);
}

registerDeliveryProvider(portalNotificationProvider);
registerDeliveryProvider(discordChannelProvider);

export function getDeliveryProvider(channelType: string) {
  return providers.get(channelType);
}

export function listDeliveryProviders() {
  return Array.from(providers.values());
}
