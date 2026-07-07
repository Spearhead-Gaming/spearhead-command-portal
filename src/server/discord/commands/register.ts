import {
  buildDiscordSlashCommandRegistrationPayload,
  getDiscordCommandRegistrationPlan,
} from "@/server/discord/commands/catalog";
import {
  getDiscordIntegrationConfig,
  isDiscordCommandRegistrationConfigured,
} from "@/server/discord/config";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

export function getDiscordSlashCommandRegistrationPreview() {
  return {
    commands: buildDiscordSlashCommandRegistrationPayload(),
    configured: isDiscordCommandRegistrationConfigured(),
    plan: getDiscordCommandRegistrationPlan(),
  };
}

function assertCommandRegistrationConfig() {
  const config = getDiscordIntegrationConfig();

  if (!config.applicationId) {
    throw new Error("DISCORD_APPLICATION_ID or DISCORD_CLIENT_ID is required.");
  }

  if (!config.botToken) {
    throw new Error("DISCORD_BOT_TOKEN is required.");
  }

  if (config.registerMode === "guild" && !config.devGuildId) {
    throw new Error("DISCORD_DEV_GUILD_ID is required when DISCORD_REGISTER_MODE=guild.");
  }

  return config;
}

function getCommandRegistrationEndpoint(input: {
  applicationId: string;
  devGuildId: string;
  mode: "global" | "guild";
}) {
  if (input.mode === "global") {
    return `${DISCORD_API_BASE_URL}/applications/${input.applicationId}/commands`;
  }

  return `${DISCORD_API_BASE_URL}/applications/${input.applicationId}/guilds/${input.devGuildId}/commands`;
}

async function discordApiRequest<T>(
  pathOrUrl: string,
  init: RequestInit = {},
) {
  const config = assertCommandRegistrationConfig();
  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `${DISCORD_API_BASE_URL}${pathOrUrl}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bot ${config.botToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as T) : (null as T);

  if (!response.ok) {
    const discordMessage =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message?: unknown }).message)
        : response.statusText;

    throw new Error(`Discord API ${response.status}: ${discordMessage}`);
  }

  return parsed;
}

export async function registerDiscordSlashCommands() {
  const config = assertCommandRegistrationConfig();
  const endpoint = getCommandRegistrationEndpoint({
    applicationId: config.applicationId,
    devGuildId: config.devGuildId,
    mode: config.registerMode,
  });
  const payload = buildDiscordSlashCommandRegistrationPayload();
  const registeredCommands = await discordApiRequest<Array<{ id: string; name: string }>>(
    endpoint,
    {
      body: JSON.stringify(payload),
      method: "PUT",
    },
  );

  return {
    commands: registeredCommands,
    mode: config.registerMode,
    scopeId: config.registerMode === "guild" ? config.devGuildId : null,
  };
}

export async function listDiscordSlashCommands() {
  const config = assertCommandRegistrationConfig();
  const endpoint = getCommandRegistrationEndpoint({
    applicationId: config.applicationId,
    devGuildId: config.devGuildId,
    mode: config.registerMode,
  });
  const commands = await discordApiRequest<Array<{ id: string; name: string }>>(endpoint);

  return {
    commands,
    mode: config.registerMode,
    scopeId: config.registerMode === "guild" ? config.devGuildId : null,
  };
}

export async function clearGuildDiscordSlashCommands() {
  const config = assertCommandRegistrationConfig();

  if (!config.devGuildId) {
    throw new Error("DISCORD_DEV_GUILD_ID is required before guild commands can be cleared.");
  }

  const endpoint = getCommandRegistrationEndpoint({
    applicationId: config.applicationId,
    devGuildId: config.devGuildId,
    mode: "guild",
  });
  const commands = await discordApiRequest<Array<{ id: string; name: string }>>(
    endpoint,
    {
      body: "[]",
      method: "PUT",
    },
  );

  return {
    commands,
    mode: "guild" as const,
    scopeId: config.devGuildId,
  };
}

export async function getDiscordRegistrationHealth() {
  const config = getDiscordIntegrationConfig();
  const checks = {
    botUser: null as null | {
      id: string;
      username: string;
    },
    commands: [] as Array<{ id: string; name: string }>,
    devGuild: null as null | {
      id: string;
      name: string;
    },
  };

  assertCommandRegistrationConfig();
  try {
    checks.botUser = await discordApiRequest<{ id: string; username: string }>("/users/@me");
  } catch (error) {
    throw new Error(
      `Bot token validation failed: ${error instanceof Error ? error.message : "Discord API request failed."}`,
    );
  }

  if (config.devGuildId) {
    try {
      checks.devGuild = await discordApiRequest<{ id: string; name: string }>(
        `/guilds/${config.devGuildId}`,
      );
    } catch (error) {
      throw new Error(
        `Dev guild validation failed: ${error instanceof Error ? error.message : "Discord API request failed."}`,
      );
    }
  }

  try {
    checks.commands = (await listDiscordSlashCommands()).commands;
  } catch (error) {
    throw new Error(
      `Slash command endpoint validation failed: ${error instanceof Error ? error.message : "Discord API request failed."}`,
    );
  }

  return {
    checks,
    config: {
      devGuildConfigured: config.devGuildId.length > 0,
      interactionEndpoint: config.interactionsUrl,
      mode: config.registerMode,
    },
  };
}
