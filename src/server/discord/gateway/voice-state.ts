import { prisma } from "@/server/database/client";
import { resolveDiscordCanonicalUser } from "@/server/discord/identity";
import { recordGatewayEvent } from "@/server/discord/gateway/state-store";
import type { DiscordGatewayEventEnvelope } from "@/server/discord/gateway/types";

type GatewayVoiceStatePayload = {
  channel_id?: string | null;
  guild_id?: string | null;
  member?: {
    user?: {
      bot?: boolean;
      id?: string;
    };
  };
  user_id?: string;
};

export async function handleGatewayVoiceStateUpdate(event: DiscordGatewayEventEnvelope<GatewayVoiceStatePayload>) {
  const payload = event.payload;
  const discordUserId = payload.user_id ?? payload.member?.user?.id;
  const guildId = payload.guild_id ?? event.guildId;

  if (!discordUserId || !guildId || payload.member?.user?.bot) {
    return;
  }

  const server = await prisma.discordServer.findUnique({
    where: {
      guildId,
    },
  });

  if (!server?.voiceAwarenessEnabled) {
    await recordGatewayEvent({
      event,
      handlerId: "discord.gateway.voice-state",
      idempotencyKey: `voice-disabled:${guildId}:${discordUserId}:${event.sequence ?? event.receivedAt.getTime()}`,
      status: "skipped",
      summary: "Voice state event skipped because voice awareness is disabled for the guild.",
    });
    return;
  }

  const canonicalUser = await resolveDiscordCanonicalUser({
    discordUserId,
  });

  if (payload.channel_id) {
    await prisma.discordVoiceSession.create({
      data: {
        channelId: payload.channel_id,
        discordServerId: server.id,
        discordUserId,
        guildId,
        memberProfileId: canonicalUser?.memberProfile?.id ?? null,
        userId: canonicalUser?.id ?? null,
      },
    });

    return;
  }

  await prisma.discordVoiceSession.updateMany({
    where: {
      discordUserId,
      guildId,
      leftAt: null,
      status: "active",
    },
    data: {
      leftAt: event.receivedAt,
      status: "left",
    },
  });
}
