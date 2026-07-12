import { randomUUID } from "node:crypto";

import { prisma } from "@/server/database/client";
import { createDiscordScheduledEvent, updateDiscordScheduledEvent, cancelDiscordScheduledEvent } from "@/server/discord/client/rest";
import type { DiscordScheduledEventEntityType } from "@/server/discord/client/rest";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";

export async function executeDiscordEventPlan(input: {
  actorUserId?: string | null;
  planId: string;
}) {
  const plan = await prisma.discordEventPlan.findUnique({
    where: {
      id: input.planId,
    },
    include: {
      targets: true,
    },
  });

  if (!plan) {
    throw new Error("Discord event plan not found.");
  }

  const idempotencyKey = `discord-event-plan:${plan.id}:${plan.sourceVersion}`;
  const existingExecution = await prisma.discordEventExecution.findUnique({
    where: {
      idempotencyKey,
    },
    include: {
      actions: true,
    },
  });

  if (existingExecution) {
    return {
      executionId: existingExecution.id,
      failed: existingExecution.actions.filter((action) => action.status === "failed").length,
      status: existingExecution.status,
      succeeded: existingExecution.actions.filter((action) => action.status === "succeeded").length,
    };
  }

  const execution = await prisma.discordEventExecution.create({
    data: {
      executionType: "publish_plan",
      idempotencyKey,
      planId: plan.id,
      portalEventId: plan.portalEventId,
      portalEventType: plan.portalEventType,
      requestedByUserId: input.actorUserId ?? null,
      startedAt: new Date(),
      status: "running",
    },
  });

  let failed = 0;
  let succeeded = 0;

  for (const target of plan.targets) {
    if (!["create", "update", "cancel"].includes(target.plannedAction)) {
      await prisma.discordEventActionExecution.create({
        data: {
          action: target.plannedAction,
          correlationId: randomUUID(),
          discordServerId: target.discordServerId,
          executionId: execution.id,
          guildId: target.guildId,
          retryable: target.plannedAction !== "blocked",
          status: target.plannedAction === "blocked" ? "blocked" : "skipped",
        },
      });
      continue;
    }

    try {
      const link = await prisma.discordEventLink.findFirst({
        where: {
          archivedAt: null,
          discordServerId: target.discordServerId,
          portalEventId: plan.portalEventId,
          portalEventType: plan.portalEventType,
        },
      });
      const response = target.plannedAction === "cancel" && link?.discordScheduledEventId
        ? await cancelDiscordScheduledEvent({
            discordScheduledEventId: link.discordScheduledEventId,
            guildId: target.guildId,
          })
        : target.plannedAction === "update" && link?.discordScheduledEventId
          ? await updateDiscordScheduledEvent({
              discordScheduledEventId: link.discordScheduledEventId,
              event: {
                channelId: target.channelId,
                description: target.description,
                entityType: target.entityType as DiscordScheduledEventEntityType,
                externalLocation: target.externalLocation,
                name: target.title,
                scheduledEndAt: target.endsAt,
                scheduledStartAt: target.startsAt,
              },
              guildId: target.guildId,
            })
          : await createDiscordScheduledEvent({
              event: {
                channelId: target.channelId,
                description: target.description,
                entityType: target.entityType as DiscordScheduledEventEntityType,
                externalLocation: target.externalLocation,
                name: target.title,
                scheduledEndAt: target.endsAt,
                scheduledStartAt: target.startsAt,
              },
              guildId: target.guildId,
            });

      const eventLink = await prisma.discordEventLink.upsert({
        create: {
          associatedChannelId: target.channelId,
          currentDiscordStatus: String(response.status),
          desiredPortalState: {
            description: target.description,
            endsAt: target.endsAt?.toISOString() ?? null,
            startsAt: target.startsAt.toISOString(),
            title: target.title,
          },
          discordScheduledEventId: response.id,
          discordServerId: target.discordServerId,
          entityType: target.entityType,
          guildId: target.guildId,
          lastPublishedVersion: plan.sourceVersion,
          lastSuccessfulAction: target.plannedAction,
          lastSynchronizedAt: new Date(),
          ownershipMode: "portal_managed",
          portalEventId: plan.portalEventId,
          portalEventType: plan.portalEventType,
          sourceVersion: plan.sourceVersion,
          synchronizationState: "synced",
          updatedByUserId: input.actorUserId ?? null,
          createdByUserId: input.actorUserId ?? null,
        },
        update: {
          associatedChannelId: target.channelId,
          currentDiscordStatus: String(response.status),
          desiredPortalState: {
            description: target.description,
            endsAt: target.endsAt?.toISOString() ?? null,
            startsAt: target.startsAt.toISOString(),
            title: target.title,
          },
          discordScheduledEventId: response.id,
          driftState: "none",
          lastPublishedVersion: plan.sourceVersion,
          lastSuccessfulAction: target.plannedAction,
          lastSynchronizedAt: new Date(),
          sourceVersion: plan.sourceVersion,
          synchronizationState: "synced",
          updatedByUserId: input.actorUserId ?? null,
        },
        where: {
          discordServerId_discordScheduledEventId: {
            discordScheduledEventId: response.id,
            discordServerId: target.discordServerId,
          },
        },
      });

      await prisma.discordEventActionExecution.create({
        data: {
          action: target.plannedAction,
          correlationId: randomUUID(),
          discordEventLinkId: eventLink.id,
          discordScheduledEventId: response.id,
          discordServerId: target.discordServerId,
          executionId: execution.id,
          guildId: target.guildId,
          status: "succeeded",
        },
      });
      succeeded += 1;
    } catch (error) {
      failed += 1;
      await prisma.discordEventActionExecution.create({
        data: {
          action: target.plannedAction,
          correlationId: randomUUID(),
          discordServerId: target.discordServerId,
          errorMessage: error instanceof Error ? error.message : "Discord Scheduled Event action failed.",
          executionId: execution.id,
          guildId: target.guildId,
          retryable: true,
          status: "failed",
        },
      });
    }
  }

  const status = failed > 0 && succeeded > 0 ? "partial_success" : failed > 0 ? "failed" : "succeeded";

  await prisma.discordEventExecution.update({
    data: {
      completedAt: new Date(),
      status,
    },
    where: {
      id: execution.id,
    },
  });

  await createAuditLogEntry({
    action: "discord.event_plan.executed",
    actorUserId: input.actorUserId ?? null,
    entityId: plan.portalEventId,
    entityType: "Event",
    summary: `Discord Scheduled Event plan finished with ${status}.`,
    newValue: {
      failed,
      planId: plan.id,
      succeeded,
    },
  });

  return {
    executionId: execution.id,
    failed,
    status,
    succeeded,
  };
}
