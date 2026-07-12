import { getDiscordIntegrationConfig } from "@/server/discord/config";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const MAX_RETRY_ATTEMPTS = 2;

export type DiscordRestRateLimitInfo = {
  retryAfterMs: number | null;
  route: string;
  status: number;
};

export class DiscordRestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rateLimitInfo?: DiscordRestRateLimitInfo,
  ) {
    super(message);
    this.name = "DiscordRestError";
  }
}

function getRetryAfterMs(response: Response, parsed: unknown) {
  const header = response.headers.get("retry-after");
  const headerSeconds = header ? Number(header) : null;

  if (Number.isFinite(headerSeconds) && headerSeconds !== null) {
    return Math.ceil(headerSeconds * 1000);
  }

  if (parsed && typeof parsed === "object" && "retry_after" in parsed) {
    const retryAfter = Number((parsed as { retry_after?: unknown }).retry_after);

    if (Number.isFinite(retryAfter)) {
      return Math.ceil(retryAfter * 1000);
    }
  }

  return null;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discordRestRequest<T>(
  pathOrUrl: string,
  init: RequestInit = {},
): Promise<T> {
  const config = getDiscordIntegrationConfig();

  if (!config.botToken) {
    throw new Error("DISCORD_BOT_TOKEN is required for Discord REST requests.");
  }

  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `${DISCORD_API_BASE_URL}${pathOrUrl}`;
  let lastRateLimitInfo: DiscordRestRateLimitInfo | undefined;

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
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

    if (response.ok) {
      return parsed;
    }

    const discordMessage =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message?: unknown }).message)
        : response.statusText;

    if (response.status === 429) {
      const retryAfterMs = getRetryAfterMs(response, parsed);
      lastRateLimitInfo = {
        retryAfterMs,
        route: pathOrUrl,
        status: response.status,
      };

      if (retryAfterMs !== null && attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(Math.min(retryAfterMs, 5000));
        continue;
      }
    }

    throw new DiscordRestError(`Discord API ${response.status}: ${discordMessage}`, response.status, lastRateLimitInfo);
  }

  throw new DiscordRestError("Discord REST retry budget exhausted.", 429, lastRateLimitInfo);
}

export type DiscordScheduledEventEntityType = "external" | "voice" | "stage";

export type DiscordScheduledEventInput = {
  channelId?: string | null;
  description?: string | null;
  entityType: DiscordScheduledEventEntityType;
  externalLocation?: string | null;
  image?: string | null;
  name: string;
  scheduledEndAt?: Date | null;
  scheduledStartAt: Date;
  status?: "scheduled" | "active" | "completed" | "cancelled";
};

export type DiscordScheduledEventResponse = {
  channel_id?: string | null;
  description?: string | null;
  entity_type: number;
  guild_id: string;
  id: string;
  name: string;
  scheduled_end_time?: string | null;
  scheduled_start_time: string;
  status: number;
};

function mapScheduledEventEntityType(entityType: DiscordScheduledEventEntityType) {
  switch (entityType) {
    case "stage":
      return 1;
    case "voice":
      return 2;
    default:
      return 3;
  }
}

function mapScheduledEventStatus(status?: DiscordScheduledEventInput["status"]) {
  switch (status) {
    case "active":
      return 2;
    case "completed":
      return 3;
    case "cancelled":
      return 4;
    default:
      return 1;
  }
}

function buildScheduledEventBody(input: DiscordScheduledEventInput) {
  const entityType = mapScheduledEventEntityType(input.entityType);

  return {
    channel_id: input.entityType === "external" ? null : input.channelId ?? null,
    description: input.description ?? undefined,
    entity_metadata:
      input.entityType === "external"
        ? {
            location: input.externalLocation ?? "Arma 3",
          }
        : undefined,
    entity_type: entityType,
    image: input.image ?? undefined,
    name: input.name,
    privacy_level: 2,
    scheduled_end_time: input.scheduledEndAt?.toISOString() ?? undefined,
    scheduled_start_time: input.scheduledStartAt.toISOString(),
    status: input.status ? mapScheduledEventStatus(input.status) : undefined,
  };
}

export async function createDiscordScheduledEvent(input: {
  guildId: string;
  event: DiscordScheduledEventInput;
}) {
  return discordRestRequest<DiscordScheduledEventResponse>(
    `/guilds/${input.guildId}/scheduled-events`,
    {
      body: JSON.stringify(buildScheduledEventBody(input.event)),
      method: "POST",
    },
  );
}

export async function updateDiscordScheduledEvent(input: {
  discordScheduledEventId: string;
  event: DiscordScheduledEventInput;
  guildId: string;
}) {
  return discordRestRequest<DiscordScheduledEventResponse>(
    `/guilds/${input.guildId}/scheduled-events/${input.discordScheduledEventId}`,
    {
      body: JSON.stringify(buildScheduledEventBody(input.event)),
      method: "PATCH",
    },
  );
}

export async function cancelDiscordScheduledEvent(input: {
  discordScheduledEventId: string;
  guildId: string;
}) {
  return discordRestRequest<DiscordScheduledEventResponse>(
    `/guilds/${input.guildId}/scheduled-events/${input.discordScheduledEventId}`,
    {
      body: JSON.stringify({
        status: 4,
      }),
      method: "PATCH",
    },
  );
}

export async function timeoutDiscordGuildMember(input: {
  durationSeconds: number;
  guildId: string;
  reason: string;
  targetDiscordUserId: string;
}) {
  const until = new Date(Date.now() + input.durationSeconds * 1000);

  return discordRestRequest<unknown>(
    `/guilds/${input.guildId}/members/${input.targetDiscordUserId}`,
    {
      body: JSON.stringify({
        communication_disabled_until: until.toISOString(),
      }),
      headers: {
        "X-Audit-Log-Reason": encodeURIComponent(input.reason),
      },
      method: "PATCH",
    },
  );
}

export async function removeDiscordGuildMemberTimeout(input: {
  guildId: string;
  reason: string;
  targetDiscordUserId: string;
}) {
  return discordRestRequest<unknown>(
    `/guilds/${input.guildId}/members/${input.targetDiscordUserId}`,
    {
      body: JSON.stringify({
        communication_disabled_until: null,
      }),
      headers: {
        "X-Audit-Log-Reason": encodeURIComponent(input.reason),
      },
      method: "PATCH",
    },
  );
}

export async function kickDiscordGuildMemberViaRest(input: {
  guildId: string;
  reason: string;
  targetDiscordUserId: string;
}) {
  return discordRestRequest<unknown>(
    `/guilds/${input.guildId}/members/${input.targetDiscordUserId}`,
    {
      headers: {
        "X-Audit-Log-Reason": encodeURIComponent(input.reason),
      },
      method: "DELETE",
    },
  );
}

export async function banDiscordGuildMember(input: {
  deleteMessageSeconds?: number;
  guildId: string;
  reason: string;
  targetDiscordUserId: string;
}) {
  return discordRestRequest<unknown>(
    `/guilds/${input.guildId}/bans/${input.targetDiscordUserId}`,
    {
      body: JSON.stringify({
        delete_message_seconds: input.deleteMessageSeconds ?? 0,
      }),
      headers: {
        "X-Audit-Log-Reason": encodeURIComponent(input.reason),
      },
      method: "PUT",
    },
  );
}

export async function unbanDiscordGuildMember(input: {
  guildId: string;
  reason: string;
  targetDiscordUserId: string;
}) {
  return discordRestRequest<unknown>(
    `/guilds/${input.guildId}/bans/${input.targetDiscordUserId}`,
    {
      headers: {
        "X-Audit-Log-Reason": encodeURIComponent(input.reason),
      },
      method: "DELETE",
    },
  );
}
