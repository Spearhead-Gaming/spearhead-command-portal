import { Prisma } from "@prisma/client";

import { processCommunicationRequest } from "@/server/communications/pipeline";
import type {
  CommunicationAudience,
  CommunicationChannelRequest,
  CommunicationPriority,
  CommunicationRequestInput,
} from "@/server/communications/types";
import {
  getCommunicationDomainDefinition,
  getCommunicationDomainDefinitions,
  type CommunicationDomain,
} from "@/server/communications/domains";
import { prisma } from "@/server/database/client";
import type { DiscordChannelMappingKey } from "@/server/discord/constants";
import { recordAuditEvent } from "@/server/services/audit-log-service";

export type CommunicationGuildRoutingTarget =
  | { type: "primary_community" }
  | { type: "all_guilds" }
  | { type: "unit_guild"; unitIds: string[] }
  | { type: "specific_guilds"; discordServerIds: string[] };

export type CommunicationEventInput = {
  actionUrl?: string | null;
  attachments?: Array<{ label: string; url: string }> | null;
  body: string;
  domain: CommunicationDomain | string;
  guildRouting?: CommunicationGuildRoutingTarget[];
  idempotencyKey?: string | null;
  priority?: CommunicationPriority;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  requestedByUserId?: string | null;
  scheduledFor?: Date | null;
  sourceEvent: string;
  sourceModule: string;
  targetAudience?: CommunicationAudience[];
  templateKey?: string | null;
  templateVariables?: Prisma.InputJsonValue | null;
  title: string;
  type: string;
};

export type CommunicationResolvedRoute = {
  channelId: string;
  discordServerId: string;
  guildId: string;
  guildName: string;
  mappingId: string;
  mappingKey: DiscordChannelMappingKey | string;
  unitId: string | null;
};

export type CommunicationRouteWarning = {
  domain: string;
  guildName?: string | null;
  message: string;
  recommendedAction: string;
  severity: "info" | "warning" | "danger";
  type: "missing_domain" | "missing_guild" | "missing_mapping" | "inactive_mapping";
};

export type CommunicationRoutePreview = {
  channels: CommunicationChannelRequest[];
  domain: string;
  routes: CommunicationResolvedRoute[];
  templateKey: string | null;
  warnings: CommunicationRouteWarning[];
};

type CommunicationConfig = {
  domainMappings?: Record<string, string>;
};

type DiscordServerForRouting = Prisma.DiscordServerGetPayload<{
  include: {
    channelMappings: true;
    configuration: true;
  };
}>;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseCommunicationConfig(value: Prisma.JsonValue | null | undefined): CommunicationConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const domainMappings = "domainMappings" in value && typeof value.domainMappings === "object" && value.domainMappings
    ? Object.fromEntries(
        Object.entries(value.domainMappings).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      )
    : undefined;

  return {
    domainMappings,
  };
}

function getConfiguredMappingKey(server: DiscordServerForRouting, domain: string, fallback: string) {
  const config = parseCommunicationConfig(server.configuration?.communicationConfig);

  return config.domainMappings?.[domain] ?? fallback;
}

function dedupeServers(servers: DiscordServerForRouting[]) {
  const byId = new Map<string, DiscordServerForRouting>();

  for (const server of servers) {
    byId.set(server.id, server);
  }

  return Array.from(byId.values());
}

function getDefaultGuildRouting(domain: string): CommunicationGuildRoutingTarget[] {
  switch (domain) {
    case "moderation":
    case "administration":
    case "developer":
    case "health":
    case "diagnostics":
    case "applications":
      return [{ type: "primary_community" }];
    case "patrols":
    case "training":
    case "personnel":
    case "qualifications":
    case "attendance":
      return [{ type: "primary_community" }];
    case "operational_releases":
    case "weekend_operations":
      return [{ type: "primary_community" }, { type: "all_guilds" }];
    default:
      return [{ type: "primary_community" }];
  }
}

function selectServersForTarget(servers: DiscordServerForRouting[], target: CommunicationGuildRoutingTarget) {
  switch (target.type) {
    case "all_guilds":
      return servers;
    case "primary_community":
      return servers.filter((server) => server.isPrimary || server.guildType === "community").slice(0, 1);
    case "specific_guilds":
      return servers.filter((server) => target.discordServerIds.includes(server.id));
    case "unit_guild":
      return servers.filter((server) => server.unitId && target.unitIds.includes(server.unitId));
    default:
      return [];
  }
}

export async function previewCommunicationEventRoutes(input: CommunicationEventInput): Promise<CommunicationRoutePreview> {
  const domainDefinition = getCommunicationDomainDefinition(input.domain);
  const mappingKey = domainDefinition?.defaultMappingKey ?? "staff-alerts";
  const warnings: CommunicationRouteWarning[] = [];

  if (!domainDefinition) {
    warnings.push({
      domain: input.domain,
      message: `Communication domain ${input.domain} is not registered. Falling back to staff alerts.`,
      recommendedAction: "Register the domain and review routing before using it in production workflows.",
      severity: "warning",
      type: "missing_domain",
    });
  }

  const activeServers = await prisma.discordServer.findMany({
    where: {
      archivedAt: null,
      isActive: true,
    },
    include: {
      channelMappings: true,
      configuration: true,
    },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
  const routingTargets = input.guildRouting?.length ? input.guildRouting : getDefaultGuildRouting(input.domain);
  const selectedServers = dedupeServers(
    routingTargets.flatMap((target) => selectServersForTarget(activeServers, target)),
  );

  if (selectedServers.length === 0) {
    warnings.push({
      domain: input.domain,
      message: "No active Discord guild matched the communication routing target.",
      recommendedAction: "Review guild configuration or choose a specific active guild.",
      severity: "danger",
      type: "missing_guild",
    });
  }

  const routes: CommunicationResolvedRoute[] = [];

  for (const server of selectedServers) {
    const serverMappingKey = getConfiguredMappingKey(server, input.domain, mappingKey);
    const mapping = server.channelMappings.find(
      (candidate) => candidate.key === serverMappingKey && candidate.isActive,
    );

    if (!mapping) {
      warnings.push({
        domain: input.domain,
        guildName: server.name,
        message: `${server.name} has no active ${serverMappingKey} channel mapping for ${input.domain}.`,
        recommendedAction: "Map the communication domain to an active Discord channel.",
        severity: "warning",
        type: "missing_mapping",
      });
      continue;
    }

    routes.push({
      channelId: mapping.channelId,
      discordServerId: server.id,
      guildId: server.guildId,
      guildName: server.name,
      mappingId: mapping.id,
      mappingKey: mapping.key,
      unitId: server.unitId,
    });
  }

  return {
    channels: routes.map((route) => ({
      mappingId: route.mappingId,
      mappingKey: route.mappingKey,
      type: "discord_channel",
      unitIds: route.unitId ? [route.unitId] : undefined,
    })),
    domain: input.domain,
    routes,
    templateKey: input.templateKey ?? `${input.domain}.${input.type}`,
    warnings,
  };
}

export async function publishCommunicationEvent(input: CommunicationEventInput) {
  const preview = await previewCommunicationEventRoutes(input);
  const domainDefinition = getCommunicationDomainDefinition(input.domain);
  const requestedChannels: CommunicationChannelRequest[] = [
    { type: "portal" },
    ...preview.channels,
  ];
  const communication = await processCommunicationRequest({
    body: input.body,
    category: input.domain,
    idempotencyKey: input.idempotencyKey ?? null,
    priority: input.priority ?? "normal",
    relatedEntityId: input.relatedEntityId ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    requestedByUserId: input.requestedByUserId ?? null,
    requestedChannels,
    scheduledFor: input.scheduledFor ?? null,
    sourceEvent: input.sourceEvent,
    sourceModule: input.sourceModule,
    targetAudience: input.targetAudience ?? [{ type: "all_active_members" }],
    templateKey: input.templateKey ?? `${input.domain}.${input.type}`,
    templateVariables: input.templateVariables ?? toJson({
      attachments: input.attachments ?? [],
      body: input.body,
      title: input.title,
    }),
    title: input.title,
    type: input.type,
  } satisfies CommunicationRequestInput);

  if (preview.warnings.length > 0) {
    await recordAuditEvent({
      action: "communication.routing.warning",
      actorUserId: input.requestedByUserId ?? null,
      entityId: communication.id,
      entityType: "Communication",
      metadata: {
        domain: input.domain,
        warnings: preview.warnings,
      },
      summary: `Communication routing produced ${preview.warnings.length} warning${preview.warnings.length === 1 ? "" : "s"}.`,
    });
  }

  await recordAuditEvent({
    action: "communication.routed",
    actorUserId: input.requestedByUserId ?? null,
    entityId: communication.id,
    entityType: "Communication",
    metadata: {
      domain: input.domain,
      routeCount: preview.routes.length,
      routes: preview.routes.map((route) => ({
        channelId: route.channelId,
        guildId: route.guildId,
        mappingKey: route.mappingKey,
      })),
      visibility: domainDefinition?.visibility ?? "staff",
    },
    summary: `Communication routed for ${input.domain}: ${input.title}.`,
  });

  return {
    communication,
    preview,
  };
}

export function listCommunicationDomains() {
  return getCommunicationDomainDefinitions();
}

