import { discordRestRequest, DiscordRestError } from "@/server/discord/client/rest";

export type DiscordMemberRoleState = {
  errorMessage: string | null;
  ok: boolean;
  roleIds: string[];
  statusCode: number | null;
};

function normalizeDiscordError(error: unknown, fallback: string) {
  if (error instanceof DiscordRestError) {
    if (error.status === 403) {
      return "The Discord bot does not have permission to manage or inspect this role/member.";
    }

    if (error.status === 404) {
      return "The Discord role, guild, or member could not be found.";
    }

    if (error.status === 429) {
      return "Discord rate-limited this role action.";
    }

    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

export async function getDiscordGuildMemberRoleState(input: {
  discordUserId: string;
  guildId: string;
}): Promise<DiscordMemberRoleState> {
  try {
    const body = await discordRestRequest<{ roles?: string[] }>(
      `/guilds/${input.guildId}/members/${input.discordUserId}`,
      {
        method: "GET",
      },
    );

    return {
      errorMessage: null,
      ok: true,
      roleIds: Array.isArray(body.roles) ? body.roles : [],
      statusCode: 200,
    };
  } catch (error) {
    return {
      errorMessage: normalizeDiscordError(error, "Discord member role lookup failed."),
      ok: false,
      roleIds: [],
      statusCode: error instanceof DiscordRestError ? error.status : null,
    };
  }
}

export async function addDiscordGuildRole(input: {
  discordRoleId: string;
  discordUserId: string;
  guildId: string;
}) {
  try {
    await discordRestRequest<null>(
      `/guilds/${input.guildId}/members/${input.discordUserId}/roles/${input.discordRoleId}`,
      {
        method: "PUT",
      },
    );

    return null;
  } catch (error) {
    return normalizeDiscordError(error, "The Discord API could not be reached while adding a role.");
  }
}

export async function removeDiscordGuildRole(input: {
  discordRoleId: string;
  discordUserId: string;
  guildId: string;
}) {
  try {
    await discordRestRequest<null>(
      `/guilds/${input.guildId}/members/${input.discordUserId}/roles/${input.discordRoleId}`,
      {
        method: "DELETE",
      },
    );

    return null;
  } catch (error) {
    return normalizeDiscordError(error, "The Discord API could not be reached while removing a role.");
  }
}
