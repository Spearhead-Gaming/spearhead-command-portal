import { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/client";
import { getDiscordGatewaySafeDiagnostics } from "@/server/discord/config";
import { getDiscordGatewayRecommendations } from "@/server/discord/gateway/recommendations";
import { getDiscordGatewayEventRegistry } from "@/server/discord/gateway/registry";
import { evaluateDiscordGatewayHealthRules } from "@/server/discord/gateway/rules";
import type { DiscordGatewayHealthSummary, DiscordGatewayStatus } from "@/server/discord/gateway/types";

function formatTimestamp(value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function parseIntents(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function isGatewayStorageUnavailable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

async function gatewayTablesExist() {
  const rows = await prisma.$queryRaw<Array<{ table_count: bigint | number }>>`
    SELECT COUNT(*) AS table_count
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND LOWER(table_name) IN ('discordgatewaystate', 'discordgatewayeventlog')
  `;

  return Number(rows[0]?.table_count ?? 0) >= 2;
}

export async function getDiscordGatewayHealthSummary(): Promise<DiscordGatewayHealthSummary> {
  const diagnostics = getDiscordGatewaySafeDiagnostics();
  let storageUnavailable = false;
  let state: Awaited<ReturnType<typeof prisma.discordGatewayState.findUnique>> = null;
  let recentEvents: Awaited<ReturnType<typeof prisma.discordGatewayEventLog.findMany>> = [];

  try {
    if (await gatewayTablesExist()) {
      [state, recentEvents] = await Promise.all([
        prisma.discordGatewayState.findUnique({
          where: {
            id: "singleton",
          },
        }),
        prisma.discordGatewayEventLog.findMany({
          orderBy: {
            occurredAt: "desc",
          },
          take: 8,
        }),
      ]);
    } else {
      storageUnavailable = true;
    }
  } catch (error) {
    if (!isGatewayStorageUnavailable(error)) {
      throw error;
    }

    storageUnavailable = true;
  }

  const storedIntents = parseIntents(state?.enabledIntents);
  const enabledIntents = storedIntents.length > 0 ? storedIntents : diagnostics.intents;
  const status = (state?.status ?? (diagnostics.enabled ? "disconnected" : "disabled")) as DiscordGatewayStatus;
  const rules = await evaluateDiscordGatewayHealthRules({
    enabled: state?.enabled ?? diagnostics.enabled,
    guildCount: state?.guildCount ?? 0,
    hasBotToken: diagnostics.botTokenPresent,
    hasGuildMembersIntent: enabledIntents.includes("GuildMembers"),
    lastErrorSummary: state?.lastErrorSummary ?? null,
    reconnectCount: state?.reconnectCount ?? 0,
    status,
  });

  return {
    botUsername: state?.botUsername ?? null,
    enabled: state?.enabled ?? diagnostics.enabled,
    enabledIntents,
    eventHandlers: getDiscordGatewayEventRegistry(enabledIntents).map((handler) => ({
      description: handler.description,
      enabled: handler.enabled,
      eventName: handler.eventName,
      handlerId: handler.handlerId,
      owningDomain: handler.owningDomain,
      requiredIntents: handler.requiredIntents,
    })),
    guildCount: state?.guildCount ?? 0,
    lastConnectedAtLabel: formatTimestamp(state?.lastConnectedAt),
    lastDisconnectedAtLabel: formatTimestamp(state?.lastDisconnectedAt),
    lastErrorSummary:
      state?.lastErrorSummary ??
      (storageUnavailable
        ? "Gateway database tables are not available yet. Run npx prisma db push or the project migration flow before starting the Gateway worker."
        : null),
    lastEventAtLabel: formatTimestamp(state?.lastEventAt),
    latencyMs: state?.latencyMs ?? null,
    recentEvents: recentEvents.map((event) => ({
      eventName: event.eventName,
      id: event.id,
      occurredAtLabel: formatTimestamp(event.occurredAt) ?? "Unknown",
      status: event.status,
      summary: event.summary,
    })),
    recommendations: [
      ...(storageUnavailable
        ? [
            {
              action: "Apply the Prisma schema to the local MariaDB database before starting or diagnosing the Gateway worker.",
              id: "gateway.apply-schema",
              priority: "high" as const,
              title: "Gateway database tables are missing",
            },
          ]
        : []),
      ...getDiscordGatewayRecommendations({
        enabled: state?.enabled ?? diagnostics.enabled,
        hasBotToken: diagnostics.botTokenPresent,
        reconnectCount: state?.reconnectCount ?? 0,
        rules: rules.results,
        status,
      }),
    ],
    reconnectCount: state?.reconnectCount ?? 0,
    rules: rules.results,
    sessionId: state?.sessionId ?? null,
    status,
  };
}
