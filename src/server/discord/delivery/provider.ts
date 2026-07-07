import { getDiscordIntegrationConfig } from "@/server/discord/config";
import {
  createNotificationDeliveryRecord,
  updateNotificationDeliveryStatus,
} from "@/server/notifications/service";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import { prisma } from "@/server/database/client";
import type {
  DiscordDeliveryPlaceholderResult,
  DiscordMessageAction,
  DiscordMessagePayload,
} from "@/server/discord/types";

type SendDiscordNotificationInput = {
  actorUserId?: string | null;
  mappingId?: string;
  mappingKey?: string;
  notificationId: string;
  payload: DiscordMessagePayload;
  unitId?: string | null;
};

type DiscordMappingRecord = Awaited<ReturnType<typeof resolveDiscordChannelMapping>>;

function buildDiscordButtonStyle(style: DiscordMessageAction["style"]) {
  switch (style) {
    case "primary":
      return 1;
    case "secondary":
      return 2;
    case "danger":
      return 4;
    case "link":
      return 5;
    case "success":
      return 3;
    default:
      return 2;
  }
}

function buildDiscordApiBody(payload: DiscordMessagePayload) {
  return {
    components: payload.actions?.length
      ? [
          {
            components: payload.actions.map((action) =>
              action.style === "link"
                ? {
                    label: action.label,
                    style: buildDiscordButtonStyle(action.style),
                    type: 2,
                    url: action.url,
                  }
                : {
                    custom_id: action.customId,
                    label: action.label,
                    style: buildDiscordButtonStyle(action.style),
                    type: 2,
                  },
            ),
            type: 1,
          },
        ]
      : undefined,
    content: null,
    embeds: [
      {
        color: payload.visibility === "staff" ? 0xf0b35b : 0x6f98c9,
        description: payload.body,
        fields: payload.fields?.map((field) => ({
          inline: true,
          name: field.label,
          value: field.value,
        })),
        footer: payload.footer
          ? {
              text: payload.footer,
            }
          : undefined,
        title: payload.title,
        url: payload.actionUrl ?? undefined,
      },
    ],
  };
}

function getDiscordApiErrorMessage(status: number, bodyText: string) {
  if (status === 403) {
    return "The Discord bot does not have permission to post in the mapped channel.";
  }

  if (status === 404) {
    return "The mapped Discord channel could not be found.";
  }

  if (status === 401) {
    return "The Discord bot token is invalid or no longer authorized.";
  }

  return bodyText || `Discord API returned status ${status}.`;
}

async function auditDiscordFinalFailure(input: {
  actorUserId?: string | null;
  deliveryId: string;
  destinationKey: string;
  errorMessage: string | null;
  mappingId?: string | null;
  notificationId: string;
}) {
  await recordAuditEvent({
    action: "discord.delivery.failed_final",
    actorUserId: input.actorUserId ?? null,
    entityId: input.deliveryId,
    entityType: "NotificationDelivery",
    metadata: {
      destinationKey: input.destinationKey,
      discordChannelMappingId: input.mappingId ?? null,
      notificationId: input.notificationId,
    },
    reason: input.errorMessage,
    summary: `Discord delivery to ${input.destinationKey} reached a failed state.`,
  });
}

async function markDiscordDeliveryFailed(input: {
  actorUserId?: string | null;
  deliveryId: string;
  destinationKey: string;
  errorMessage: string;
  mappingId?: string | null;
  notificationId: string;
}) {
  const failedDelivery = await updateNotificationDeliveryStatus({
    actorUserId: input.actorUserId ?? null,
    deliveryId: input.deliveryId,
    errorMessage: input.errorMessage,
    status: "failed",
  });

  await auditDiscordFinalFailure({
    actorUserId: input.actorUserId ?? null,
    deliveryId: failedDelivery.id,
    destinationKey: input.destinationKey,
    errorMessage: failedDelivery.errorMessage,
    mappingId: input.mappingId ?? failedDelivery.discordChannelMappingId,
    notificationId: input.notificationId,
  });

  return {
    channelId: failedDelivery.destinationKey,
    deliveryId: failedDelivery.id,
    errorMessage: failedDelivery.errorMessage,
    providerMessageId: failedDelivery.providerMessageId,
    serverName: null,
    status: "failed" as const,
  };
}

export async function resolveDiscordChannelMapping(input: {
  mappingId?: string;
  mappingKey?: string;
  unitId?: string | null;
}) {
  if (input.mappingId) {
    return prisma.discordChannelMapping.findUnique({
      where: {
        id: input.mappingId,
      },
      include: {
        discordServer: true,
      },
    });
  }

  if (!input.mappingKey) {
    return null;
  }

  if (input.unitId) {
    const scopedMapping = await prisma.discordChannelMapping.findFirst({
      where: {
        discordServer: {
          isActive: true,
          unitId: input.unitId,
        },
        isActive: true,
        key: input.mappingKey,
      },
      include: {
        discordServer: true,
      },
      orderBy: [
        {
          discordServer: {
            isPrimary: "desc",
          },
        },
        {
          updatedAt: "desc",
        },
      ],
    });

    if (scopedMapping) {
      return scopedMapping;
    }
  }

  return prisma.discordChannelMapping.findFirst({
    where: {
      discordServer: {
        isActive: true,
        unitId: null,
      },
      isActive: true,
      key: input.mappingKey,
    },
    include: {
      discordServer: true,
    },
    orderBy: [
      {
        discordServer: {
          isPrimary: "desc",
        },
      },
      {
        updatedAt: "desc",
      },
    ],
  });
}

async function sendDiscordChannelMessage(input: {
  mapping: NonNullable<DiscordMappingRecord>;
  payload: DiscordMessagePayload;
}) {
  const config = getDiscordIntegrationConfig();

  if (!config.botToken) {
    return {
      errorMessage:
        "DISCORD_BOT_TOKEN is not configured. Delivery was recorded but could not be sent.",
      ok: false as const,
      providerMessageId: null,
    };
  }

  let response: Response;

  try {
    response = await fetch(
      `https://discord.com/api/v10/channels/${input.mapping.channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${config.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildDiscordApiBody(input.payload)),
      },
    );
  } catch {
    return {
      errorMessage: "The Discord API could not be reached.",
      ok: false as const,
      providerMessageId: null,
    };
  }

  if (!response.ok) {
    const bodyText = await response.text();

    return {
      errorMessage: getDiscordApiErrorMessage(response.status, bodyText),
      ok: false as const,
      providerMessageId: null,
    };
  }

  const body = (await response.json()) as {
    id?: string;
  };

  return {
    errorMessage: null,
    ok: true as const,
    providerMessageId: body.id ?? null,
  };
}

export async function sendDiscordNotification(
  input: SendDiscordNotificationInput,
): Promise<DiscordDeliveryPlaceholderResult> {
  const mapping = await resolveDiscordChannelMapping({
    mappingId: input.mappingId,
    mappingKey: input.mappingKey,
    unitId: input.unitId,
  });

  const destinationKey = mapping?.channelId ?? input.mappingKey ?? "unmapped";
  const delivery = await createNotificationDeliveryRecord(input.notificationId, {
    channelType: "discord_channel",
    destinationKey,
    discordChannelMappingId: mapping?.id ?? null,
    errorMessage: null,
    status: "pending",
  });

  if (!mapping || !mapping.isActive || !mapping.discordServer.isActive) {
    return markDiscordDeliveryFailed({
      actorUserId: input.actorUserId ?? null,
      deliveryId: delivery.id,
      destinationKey,
      errorMessage:
        "No active Discord channel mapping was found. Delivery was recorded as failed without blocking the originating workflow.",
      mappingId: mapping?.id ?? null,
      notificationId: input.notificationId,
    });
  }

  const sendResult = await sendDiscordChannelMessage({
    mapping,
    payload: input.payload,
  });

  if (!sendResult.ok) {
    return markDiscordDeliveryFailed({
      actorUserId: input.actorUserId ?? null,
      deliveryId: delivery.id,
      destinationKey,
      errorMessage: sendResult.errorMessage,
      mappingId: mapping.id,
      notificationId: input.notificationId,
    });
  }

  const sentDelivery = await updateNotificationDeliveryStatus({
    actorUserId: input.actorUserId ?? null,
    deliveryId: delivery.id,
    errorMessage: null,
    providerMessageId: sendResult.providerMessageId,
    status: "sent",
  });

  return {
    channelId: mapping.channelId,
    deliveryId: sentDelivery.id,
    errorMessage: sentDelivery.errorMessage,
    providerMessageId: sentDelivery.providerMessageId,
    serverName: mapping.discordServer.name,
    status: "sent",
  };
}

export async function sendDiscordNotificationPlaceholder(
  input: SendDiscordNotificationInput,
): Promise<DiscordDeliveryPlaceholderResult> {
  return sendDiscordNotification(input);
}

export async function sendDiscordNotificationToMappedUnits(input: {
  actorUserId?: string | null;
  mappingKey: string;
  notificationId: string;
  payload: DiscordMessagePayload;
  unitIds?: Array<string | null | undefined>;
}) {
  const unitIds = Array.from(
    new Set((input.unitIds ?? []).filter((unitId): unitId is string => Boolean(unitId))),
  );
  const attemptedMappings = new Set<string>();
  const deliveries: DiscordDeliveryPlaceholderResult[] = [];

  if (unitIds.length === 0) {
    deliveries.push(
      await sendDiscordNotification({
        actorUserId: input.actorUserId ?? null,
        mappingKey: input.mappingKey,
        notificationId: input.notificationId,
        payload: input.payload,
      }),
    );

    return deliveries;
  }

  for (const unitId of unitIds) {
    const mapping = await resolveDiscordChannelMapping({
      mappingKey: input.mappingKey,
      unitId,
    });
    const dedupeKey = mapping?.id ?? `unit:${unitId}`;

    if (attemptedMappings.has(dedupeKey)) {
      continue;
    }

    attemptedMappings.add(dedupeKey);
    deliveries.push(
      await sendDiscordNotification({
        actorUserId: input.actorUserId ?? null,
        mappingId: mapping?.id,
        mappingKey: input.mappingKey,
        notificationId: input.notificationId,
        payload: input.payload,
        unitId,
      }),
    );
  }

  return deliveries;
}
