import { revalidatePath } from "next/cache";

import type { PortalUser } from "@/features/auth/types";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { sendPatrolAnnouncementToDiscord } from "@/server/discord/patrols";
import {
  queuePatrolCompletedNotificationPlaceholder,
  queuePatrolRsvpNotificationPlaceholder,
  queuePatrolStartedNotificationPlaceholder,
} from "@/server/notifications/hooks";
import { can } from "@/server/permissions/access";

type StartPatrolInput = {
  campaignId?: string | null;
  deploymentWeek?: number | null;
  description?: string | null;
  estimatedDurationMinutes?: number | null;
  patrolName: string;
  patrolType?: string | null;
  reason?: string | null;
  source?: "discord" | "portal";
};

function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeEstimatedDuration(value?: number | null) {
  if (!value || Number.isNaN(value) || value < 1) {
    return null;
  }

  return Math.min(Math.round(value), 24 * 60);
}

function revalidatePatrolRoutes(eventId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/operations");
  revalidatePath("/operations/patrols");
  revalidatePath("/operations/s3");

  if (eventId) {
    revalidatePath(`/operations/events/${eventId}`);
  }
}

function canStartPatrol(actor: PortalUser, source: "discord" | "portal") {
  return (
    can(actor, "patrols.create") ||
    can(actor, "patrols.lead") ||
    (source === "discord" && can(actor, "discord.patrols.create"))
  );
}

function canManagePatrol(actor: PortalUser, patrol: { patrolLeaderUserId: string | null }, permissionKey: string) {
  return can(actor, permissionKey) || (patrol.patrolLeaderUserId === actor.id && can(actor, "patrols.lead"));
}

async function getActor() {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  return actor;
}

async function resolveDeploymentDefaults(input: StartPatrolInput) {
  const campaign =
    input.campaignId
      ? await prisma.campaign.findUnique({
          where: { id: input.campaignId },
          include: { deploymentWeeks: true },
        })
      : await prisma.campaign.findFirst({
          where: {
            deletedAt: null,
            status: {
              in: ["active", "preparing", "planning"],
            },
          },
          include: { deploymentWeeks: true },
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        });

  const now = new Date();
  const matchedWeek = campaign?.deploymentWeeks.find((week) =>
    week.startsAt && week.endsAt ? week.startsAt <= now && week.endsAt >= now : false,
  );
  const computedWeek =
    input.deploymentWeek ??
    matchedWeek?.weekNumber ??
    (campaign?.startsAt
      ? Math.max(1, Math.floor((now.getTime() - campaign.startsAt.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1)
      : 1);

  return {
    campaignId: campaign?.id ?? null,
    deploymentWeek: computedWeek,
  };
}

async function generatePatrolCallsign(campaignId: string | null, deploymentWeek: number) {
  const count = await prisma.event.count({
    where: {
      campaignId,
      deploymentWeek,
      eventType: "patrol",
    },
  });

  return `PTRL-W${deploymentWeek}-${String(count + 1).padStart(2, "0")}`;
}

async function startPatrolForActor(input: StartPatrolInput, actor: PortalUser) {
  const source = input.source ?? "portal";

  if (!canStartPatrol(actor, source)) {
    throw new Error("You do not have permission to start patrols.");
  }

  const patrolName = normalizeRequiredString(input.patrolName, "Patrol name");
  const defaults = await resolveDeploymentDefaults(input);
  const deploymentWeek = defaults.deploymentWeek;
  const patrol = await prisma.event.create({
    data: {
      aarRequired: true,
      campaignId: defaults.campaignId,
      deploymentWeek,
      description: normalizeOptionalString(input.description),
      estimatedDurationMinutes: normalizeEstimatedDuration(input.estimatedDurationMinutes),
      eventType: "patrol",
      missionStatus: "published",
      patrolCallsign: await generatePatrolCallsign(defaults.campaignId, deploymentWeek),
      patrolLeaderUserId: actor.id,
      patrolStatus: "running",
      patrolType: normalizeOptionalString(input.patrolType) ?? "other",
      startsAt: new Date(),
      status: "published",
      title: patrolName,
    },
  });

  await createAuditLogEntry({
    action: "patrol.started",
    actorUserId: actor.id,
    entityId: patrol.id,
    entityType: "Event",
    newValue: {
      campaignId: patrol.campaignId,
      deploymentWeek: patrol.deploymentWeek,
      patrolCallsign: patrol.patrolCallsign,
      patrolStatus: patrol.patrolStatus,
      patrolType: patrol.patrolType,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `${patrol.title} patrol started.`,
  });

  if (source === "discord") {
    await createAuditLogEntry({
      action: "discord.patrol.created",
      actorUserId: actor.id,
      entityId: patrol.id,
      entityType: "Event",
      metadata: {
        patrolCallsign: patrol.patrolCallsign,
        patrolStatus: patrol.patrolStatus,
        source,
      },
      summary: `${patrol.title} patrol was created from Discord.`,
    });
  }

  await queuePatrolStartedNotificationPlaceholder({
    actorUserId: actor.id,
    patrolId: patrol.id,
    patrolTitle: patrol.title,
    targetUnitId: patrol.hostUnitId,
  });

  try {
    await sendPatrolAnnouncementToDiscord({
      actorUserId: actor.id,
      eventId: patrol.id,
    });
  } catch (error) {
    console.error(`Patrol ${patrol.title} started, but Discord announcement failed.`, error);
  }

  revalidatePatrolRoutes(patrol.id);

  return patrol;
}

export async function startPatrol(input: StartPatrolInput) {
  const actor = await getActor();

  return startPatrolForActor(input, actor);
}

export async function startPatrolAsActor(input: StartPatrolInput, actor: PortalUser) {
  return startPatrolForActor({ ...input, source: input.source ?? "discord" }, actor);
}

export async function completePatrol(input: {
  patrolId: string;
  reason?: string | null;
  source?: "discord" | "portal";
}) {
  const actor = await getActor();
  const patrol = await prisma.event.findUnique({
    where: { id: input.patrolId },
  });

  if (!patrol || patrol.eventType !== "patrol") {
    throw new Error("Patrol not found.");
  }

  const source = input.source ?? "portal";

  if (
    !canManagePatrol(actor, patrol, "patrols.complete") &&
    !(source === "discord" && can(actor, "discord.patrols.manage"))
  ) {
    throw new Error("You do not have permission to complete this patrol.");
  }

  const updated = await prisma.event.update({
    where: { id: patrol.id },
    data: {
      endsAt: new Date(),
      missionStatus: "completed",
      patrolStatus: "awaiting-aar",
      status: "completed",
    },
  });

  await createAuditLogEntry({
    action: "patrol.completed",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "Event",
    newValue: {
      endsAt: updated.endsAt?.toISOString() ?? null,
      patrolStatus: updated.patrolStatus,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `${updated.title} patrol completed and is awaiting AAR.`,
  });

  await queuePatrolCompletedNotificationPlaceholder({
    actorUserId: actor.id,
    patrolId: updated.id,
    patrolTitle: updated.title,
    targetUnitId: updated.hostUnitId,
  });

  revalidatePatrolRoutes(updated.id);

  return updated;
}

export async function completePatrolAsActor(input: {
  patrolId: string;
  reason?: string | null;
  source?: "discord" | "portal";
}, actor: PortalUser) {
  const patrol = await prisma.event.findUnique({
    where: { id: input.patrolId },
  });

  if (!patrol || patrol.eventType !== "patrol") {
    throw new Error("Patrol not found.");
  }

  if (
    !canManagePatrol(actor, patrol, "patrols.complete") &&
    !(input.source === "discord" && can(actor, "discord.patrols.manage"))
  ) {
    throw new Error("You do not have permission to complete this patrol.");
  }

  const updated = await prisma.event.update({
    where: { id: patrol.id },
    data: {
      endsAt: new Date(),
      missionStatus: "completed",
      patrolStatus: "awaiting-aar",
      status: "completed",
    },
  });

  await createAuditLogEntry({
    action: "patrol.completed",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "Event",
    reason: normalizeOptionalString(input.reason),
    summary: `${updated.title} patrol completed from Discord and is awaiting AAR.`,
  });

  if (input.source === "discord") {
    await createAuditLogEntry({
      action: "discord.patrol.completed",
      actorUserId: actor.id,
      entityId: updated.id,
      entityType: "Event",
      metadata: {
        patrolCallsign: updated.patrolCallsign,
        patrolStatus: updated.patrolStatus,
        source: input.source,
      },
      summary: `${updated.title} patrol was completed from Discord.`,
    });
  }

  await queuePatrolCompletedNotificationPlaceholder({
    actorUserId: actor.id,
    patrolId: updated.id,
    patrolTitle: updated.title,
    targetUnitId: updated.hostUnitId,
  });

  revalidatePatrolRoutes(updated.id);

  return updated;
}

export async function addPatrolParticipant(input: {
  memberProfileId: string;
  notes?: string | null;
  patrolId: string;
  reason?: string | null;
}) {
  const actor = await getActor();
  const patrol = await prisma.event.findUnique({
    where: { id: input.patrolId },
  });

  if (!patrol || patrol.eventType !== "patrol") {
    throw new Error("Patrol not found.");
  }

  if (!canManagePatrol(actor, patrol, "patrols.participants.manage")) {
    throw new Error("You do not have permission to manage patrol participants.");
  }

  const participant = await prisma.patrolParticipant.upsert({
    create: {
      addedByUserId: actor.id,
      eventId: patrol.id,
      memberProfileId: input.memberProfileId,
      notes: normalizeOptionalString(input.notes),
    },
    update: {
      addedByUserId: actor.id,
      notes: normalizeOptionalString(input.notes),
    },
    where: {
      eventId_memberProfileId: {
        eventId: patrol.id,
        memberProfileId: input.memberProfileId,
      },
    },
  });

  await createAuditLogEntry({
    action: "patrol.participant_added",
    actorUserId: actor.id,
    entityId: participant.id,
    entityType: "PatrolParticipant",
    newValue: {
      memberProfileId: participant.memberProfileId,
      patrolId: patrol.id,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `Participant added to ${patrol.title}.`,
  });

  revalidatePatrolRoutes(patrol.id);
}

export async function removePatrolParticipant(input: {
  participantId: string;
  reason?: string | null;
}) {
  const actor = await getActor();
  const participant = await prisma.patrolParticipant.findUnique({
    where: { id: input.participantId },
    include: {
      event: true,
    },
  });

  if (!participant || participant.event.eventType !== "patrol") {
    throw new Error("Patrol participant not found.");
  }

  if (!canManagePatrol(actor, participant.event, "patrols.participants.manage")) {
    throw new Error("You do not have permission to manage patrol participants.");
  }

  await prisma.patrolParticipant.delete({
    where: { id: participant.id },
  });

  await createAuditLogEntry({
    action: "patrol.participant_removed",
    actorUserId: actor.id,
    entityId: participant.id,
    entityType: "PatrolParticipant",
    oldValue: {
      memberProfileId: participant.memberProfileId,
      patrolId: participant.eventId,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `Participant removed from ${participant.event.title}.`,
  });

  revalidatePatrolRoutes(participant.eventId);
}

export async function recordPatrolRsvpAsActor(input: {
  actor: PortalUser;
  discordUserId?: string | null;
  patrolId: string;
  source?: "discord" | "portal";
}) {
  if (!can(input.actor, "patrols.rsvp")) {
    throw new Error("You do not have permission to RSVP to patrols.");
  }

  const patrol = await prisma.event.findUnique({
    where: { id: input.patrolId },
  });

  if (!patrol || patrol.eventType !== "patrol") {
    throw new Error("Patrol not found.");
  }

  const existing = await prisma.patrolRsvp.findFirst({
    where: {
      eventId: patrol.id,
      OR: [
        { userId: input.actor.id },
        ...(input.actor.memberProfileId ? [{ memberProfileId: input.actor.memberProfileId }] : []),
        ...(input.discordUserId ? [{ discordUserId: input.discordUserId }] : []),
      ],
    },
  });

  const rsvp = existing
    ? await prisma.patrolRsvp.update({
        where: { id: existing.id },
        data: {
          discordUserId: input.discordUserId ?? existing.discordUserId,
          memberProfileId: input.actor.memberProfileId ?? existing.memberProfileId,
          respondedAt: new Date(),
          source: input.source ?? "portal",
          status: "interested",
          userId: input.actor.id,
        },
      })
    : await prisma.patrolRsvp.create({
        data: {
          discordUserId: input.discordUserId ?? input.actor.discordId,
          eventId: patrol.id,
          memberProfileId: input.actor.memberProfileId,
          source: input.source ?? "portal",
          status: "interested",
          userId: input.actor.id,
        },
      });

  await createAuditLogEntry({
    action: "patrol.rsvp_recorded",
    actorUserId: input.actor.id,
    entityId: rsvp.id,
    entityType: "PatrolRsvp",
    newValue: {
      patrolId: patrol.id,
      source: rsvp.source,
      status: rsvp.status,
    },
    summary: `Interest recorded for ${patrol.title}.`,
  });

  await queuePatrolRsvpNotificationPlaceholder({
    actorUserId: input.actor.id,
    patrolId: patrol.id,
    patrolTitle: patrol.title,
    targetUnitId: patrol.hostUnitId,
  });

  revalidatePatrolRoutes(patrol.id);

  return rsvp;
}

export async function togglePatrolInterestAsActor(input: {
  actor: PortalUser;
  discordUserId?: string | null;
  patrolId: string;
  source?: "discord" | "portal";
}) {
  if (!can(input.actor, "patrols.rsvp")) {
    throw new Error("You do not have permission to RSVP to patrols.");
  }

  const patrol = await prisma.event.findUnique({
    where: { id: input.patrolId },
  });

  if (!patrol || patrol.eventType !== "patrol") {
    throw new Error("Patrol not found.");
  }

  const existing = await prisma.patrolRsvp.findFirst({
    where: {
      eventId: patrol.id,
      OR: [
        { userId: input.actor.id },
        ...(input.actor.memberProfileId ? [{ memberProfileId: input.actor.memberProfileId }] : []),
        ...(input.discordUserId ? [{ discordUserId: input.discordUserId }] : []),
      ],
    },
  });

  if (existing) {
    await prisma.patrolRsvp.delete({
      where: {
        id: existing.id,
      },
    });

    await createAuditLogEntry({
      action: "discord.patrol_interest.removed",
      actorUserId: input.actor.id,
      entityId: patrol.id,
      entityType: "Event",
      oldValue: {
        patrolId: patrol.id,
        rsvpId: existing.id,
        status: existing.status,
      },
      summary: `Discord interest removed for ${patrol.title}.`,
    });

    revalidatePatrolRoutes(patrol.id);

    return {
      patrol,
      state: "removed" as const,
    };
  }

  const rsvp = await recordPatrolRsvpAsActor({
    actor: input.actor,
    discordUserId: input.discordUserId,
    patrolId: input.patrolId,
    source: input.source ?? "discord",
  });

  await createAuditLogEntry({
    action: "discord.patrol_interest.added",
    actorUserId: input.actor.id,
    entityId: patrol.id,
    entityType: "Event",
    newValue: {
      patrolId: patrol.id,
      rsvpId: rsvp.id,
      status: rsvp.status,
    },
    summary: `Discord interest added for ${patrol.title}.`,
  });

  return {
    patrol,
    state: "added" as const,
  };
}

export async function recordPatrolRsvp(input: {
  patrolId: string;
  source?: "discord" | "portal";
}) {
  const actor = await getActor();

  return recordPatrolRsvpAsActor({
    actor,
    discordUserId: actor.discordId,
    patrolId: input.patrolId,
    source: input.source ?? "portal",
  });
}
