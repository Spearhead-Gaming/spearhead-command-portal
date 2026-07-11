import {
  recordDiscordGuildMemberJoin,
  recordDiscordGuildMemberLeave,
  recordDiscordGuildMemberUpdate,
} from "@/server/discord/guild-members";

type GatewayMemberPayload = {
  avatar?: string | null;
  guild_id?: string | null;
  joined_at?: string | null;
  nick?: string | null;
  user?: {
    avatar?: string | null;
    bot?: boolean;
    global_name?: string | null;
    id?: string;
    username?: string | null;
  };
};

type GatewayMemberRemovePayload = {
  guild_id?: string | null;
  user?: {
    id?: string;
  };
};

function getAvatarUrl(input: {
  avatarHash?: string | null;
  discordUserId: string;
}) {
  if (!input.avatarHash) {
    return null;
  }

  const extension = input.avatarHash.startsWith("a_") ? "gif" : "png";

  return `https://cdn.discordapp.com/avatars/${input.discordUserId}/${input.avatarHash}.${extension}`;
}

function mapMemberPayload(payload: GatewayMemberPayload) {
  const discordUserId = payload.user?.id;

  if (!discordUserId) {
    throw new Error("Gateway member payload did not include a Discord user ID.");
  }

  return {
    avatarUrl: getAvatarUrl({
      avatarHash: payload.avatar ?? payload.user?.avatar ?? null,
      discordUserId,
    }),
    discordUserId,
    displayName: payload.nick ?? payload.user?.global_name ?? payload.user?.username ?? null,
    globalName: payload.user?.global_name ?? null,
    guildId: payload.guild_id ?? null,
    isBot: Boolean(payload.user?.bot),
    joinedAt: payload.joined_at ?? null,
    username: payload.user?.username ?? null,
  };
}

export async function handleGatewayGuildMemberAdd(payload: GatewayMemberPayload) {
  return recordDiscordGuildMemberJoin({
    member: mapMemberPayload(payload),
  });
}

export async function handleGatewayGuildMemberUpdate(payload: GatewayMemberPayload) {
  return recordDiscordGuildMemberUpdate({
    member: mapMemberPayload(payload),
  });
}

export async function handleGatewayGuildMemberRemove(payload: GatewayMemberRemovePayload) {
  if (!payload.user?.id) {
    throw new Error("Gateway member remove payload did not include a Discord user ID.");
  }

  return recordDiscordGuildMemberLeave({
    discordUserId: payload.user.id,
    guildId: payload.guild_id ?? null,
  });
}
