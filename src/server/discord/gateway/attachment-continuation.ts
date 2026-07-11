import type { Prisma } from "@prisma/client";

import {
  completeInteractionSession,
  continueInteractionSession,
  requireActiveSession,
} from "@/server/discord/interactions/sessions/helpers";

type GatewayMessageCreatePayload = {
  attachments?: Array<{
    content_type?: string | null;
    filename?: string | null;
    id?: string;
    size?: number;
    url?: string;
  }>;
  author?: {
    bot?: boolean;
    id?: string;
  };
  channel_id?: string;
  guild_id?: string | null;
  id?: string;
};

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isAllowedAttachment(attachment: NonNullable<GatewayMessageCreatePayload["attachments"]>[number]) {
  const contentType = attachment.content_type ?? "";
  const filename = attachment.filename ?? "";
  const size = attachment.size ?? 0;
  const isImage =
    contentType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp)$/i.test(filename);

  return isImage && size <= 12 * 1024 * 1024;
}

export async function handleGatewayAttachmentContinuation(payload: GatewayMessageCreatePayload) {
  const discordUserId = payload.author?.id;

  if (!discordUserId || payload.author?.bot || !payload.attachments?.length) {
    return null;
  }

  const session = await requireActiveSession({
    discordUserId,
    workflowType: "AAR_SCREENSHOT_UPLOAD",
  }).catch(() => null);

  if (!session) {
    return null;
  }

  if (session.guildId && payload.guild_id && session.guildId !== payload.guild_id) {
    throw new Error("Attachment continuation was posted from the wrong guild.");
  }

  if (session.channelId && payload.channel_id && session.channelId !== payload.channel_id) {
    throw new Error("Attachment continuation was posted from the wrong channel.");
  }

  const attachment = payload.attachments.find(isAllowedAttachment);

  if (!attachment) {
    await continueInteractionSession({
      currentStep: "WAITING_FOR_VALID_ATTACHMENT",
      id: session.id,
    });
    throw new Error("Attachment continuation did not include an allowed image attachment.");
  }

  const nextPayload = toJson({
    attachment: {
      contentType: attachment.content_type ?? null,
      filename: attachment.filename ?? null,
      id: attachment.id ?? null,
      size: attachment.size ?? null,
      url: attachment.url ?? null,
    },
    gatewayMessageId: payload.id ?? null,
    receivedAt: new Date().toISOString(),
  });

  return completeInteractionSession({
    id: session.id,
    temporaryPayload: nextPayload,
  });
}
