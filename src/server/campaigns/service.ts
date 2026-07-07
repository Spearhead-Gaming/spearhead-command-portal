import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { campaignStatusCatalog } from "@/server/database/catalogs";
import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { queueCampaignPublishedNotificationPlaceholder } from "@/server/notifications/hooks";
import { requirePermission } from "@/server/permissions/access";
import { requireAnyScopedPermission } from "@/server/s3/utils";

type CreateCampaignInput = {
  key: string;
  title: string;
  summary?: string | null;
  phase?: string | null;
  deploymentDurationWeeks?: number | null;
  zeusAssignmentType?: string | null;
  zeusUserId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  reason?: string | null;
};

type UpdateCampaignInput = CreateCampaignInput & {
  campaignId: string;
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

function normalizeDeploymentDurationWeeks(value?: number | null) {
  if (!value || Number.isNaN(value)) {
    return null;
  }

  return Math.max(1, Math.min(Math.round(value), 52));
}

function normalizeZeusAssignmentType(value?: string | null) {
  const normalized = normalizeOptionalString(value);

  if (normalized === "creator" || normalized === "assigned" || normalized === "unassigned") {
    return normalized;
  }

  return "unassigned";
}

function isCampaignStatus(value: string): value is (typeof campaignStatusCatalog)[number] {
  return campaignStatusCatalog.includes(value as (typeof campaignStatusCatalog)[number]);
}

function assertDateRange(startsAt?: Date | null, endsAt?: Date | null) {
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    throw new Error("Campaign start date is invalid.");
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error("Campaign end date is invalid.");
  }

  if (startsAt && endsAt && endsAt < startsAt) {
    throw new Error("Campaign end date cannot be before the start date.");
  }
}

function revalidateCampaignRoutes(input?: {
  campaignId?: string | null;
  eventIds?: string[];
  unitKeys?: string[];
}) {
  revalidatePath("/operations/campaigns");
  revalidatePath("/operations/events");
  revalidatePath("/dashboard");

  if (input?.campaignId) {
    revalidatePath(`/operations/campaigns/${input.campaignId}`);
  }

  for (const eventId of input?.eventIds ?? []) {
    revalidatePath(`/operations/events/${eventId}`);
  }

  for (const unitKey of input?.unitKeys ?? []) {
    revalidatePath(`/units/${unitKey}`);
  }
}

async function getCampaignRecord(campaignId: string) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      events: {
        include: {
          hostUnit: true,
        },
      },
    },
  });
}

async function ensureDeploymentWeeks(
  tx: Prisma.TransactionClient,
  campaignId: string,
  durationWeeks: number | null,
) {
  const weekCount = durationWeeks ?? 5;

  for (let weekNumber = 1; weekNumber <= weekCount; weekNumber += 1) {
    await tx.deploymentWeek.upsert({
      create: {
        campaignId,
        label: `Week ${weekNumber}`,
        weekNumber,
      },
      update: {
        label: `Week ${weekNumber}`,
      },
      where: {
        campaignId_weekNumber: {
          campaignId,
          weekNumber,
        },
      },
    });
  }
}

async function recordZeusAssignmentHistory(
  tx: Prisma.TransactionClient,
  input: {
    actorUserId: string;
    campaignId: string;
    nextType: string;
    nextUserId: string | null;
    previousType?: string | null;
    previousUserId?: string | null;
    reason?: string | null;
  },
) {
  if (
    input.previousType === input.nextType &&
    (input.previousUserId ?? null) === input.nextUserId
  ) {
    return;
  }

  await tx.deploymentZeusAssignment.create({
    data: {
      assignedToUserId: input.nextUserId,
      assignmentType: input.nextType,
      campaignId: input.campaignId,
      changedByUserId: input.actorUserId,
      previousType: input.previousType ?? null,
      previousUserId: input.previousUserId ?? null,
      reason: normalizeOptionalString(input.reason),
    },
  });
}

export async function createCampaign(input: CreateCampaignInput) {
  const actor = await requireAnyScopedPermission(["deployments.create", "campaigns.create"], []);
  assertDateRange(input.startsAt, input.endsAt);
  const zeusAssignmentType = normalizeZeusAssignmentType(input.zeusAssignmentType);
  const durationWeeks = normalizeDeploymentDurationWeeks(input.deploymentDurationWeeks);
  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        key: normalizeRequiredString(input.key, "Deployment key"),
        title: normalizeRequiredString(input.title, "Deployment title"),
        summary: normalizeOptionalString(input.summary),
        phase: normalizeOptionalString(input.phase),
        status: "planning",
        createdByUserId: actor.id,
        deploymentDurationWeeks: durationWeeks,
        zeusAssignmentType,
        zeusUserId: zeusAssignmentType === "assigned" ? normalizeOptionalString(input.zeusUserId) : null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
    });

    await ensureDeploymentWeeks(tx, created.id, durationWeeks);
    await recordZeusAssignmentHistory(tx, {
      actorUserId: actor.id,
      campaignId: created.id,
      nextType: created.zeusAssignmentType,
      nextUserId: created.zeusUserId,
      reason: input.reason,
    });

    return created;
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "deployment.created",
    entityType: "Campaign",
    entityId: campaign.id,
    summary: `${campaign.title} deployment created.`,
    newValue: {
      key: campaign.key,
      title: campaign.title,
      status: campaign.status,
      phase: campaign.phase,
      deploymentDurationWeeks: campaign.deploymentDurationWeeks ?? 5,
      zeusAssignmentType: campaign.zeusAssignmentType,
      zeusUserId: campaign.zeusUserId,
      startsAt: campaign.startsAt?.toISOString() ?? null,
      endsAt: campaign.endsAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(input.reason),
  });

  revalidateCampaignRoutes({
    campaignId: campaign.id,
  });
}

export async function editCampaign(input: UpdateCampaignInput) {
  const actor = await requireAnyScopedPermission(["deployments.edit", "campaigns.edit"], []);
  const existing = await getCampaignRecord(input.campaignId);

  if (!existing) {
    throw new Error("Deployment not found.");
  }

  assertDateRange(input.startsAt, input.endsAt);
  const zeusAssignmentType = normalizeZeusAssignmentType(input.zeusAssignmentType);
  const durationWeeks = normalizeDeploymentDurationWeeks(input.deploymentDurationWeeks);
  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.campaign.update({
      where: { id: existing.id },
      data: {
        key: normalizeRequiredString(input.key, "Deployment key"),
        title: normalizeRequiredString(input.title, "Deployment title"),
        summary: normalizeOptionalString(input.summary),
        phase: normalizeOptionalString(input.phase),
        deploymentDurationWeeks: durationWeeks,
        zeusAssignmentType,
        zeusUserId: zeusAssignmentType === "assigned" ? normalizeOptionalString(input.zeusUserId) : null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
    });

    await ensureDeploymentWeeks(tx, record.id, durationWeeks);
    await recordZeusAssignmentHistory(tx, {
      actorUserId: actor.id,
      campaignId: record.id,
      nextType: record.zeusAssignmentType,
      nextUserId: record.zeusUserId,
      previousType: existing.zeusAssignmentType,
      previousUserId: existing.zeusUserId,
      reason: input.reason,
    });

    return record;
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "deployment.edited",
    entityType: "Campaign",
    entityId: updated.id,
    summary: `${updated.title} deployment updated.`,
    oldValue: {
      key: existing.key,
      title: existing.title,
      summary: existing.summary,
      phase: existing.phase,
      deploymentDurationWeeks: existing.deploymentDurationWeeks,
      zeusAssignmentType: existing.zeusAssignmentType,
      zeusUserId: existing.zeusUserId,
      startsAt: existing.startsAt?.toISOString() ?? null,
      endsAt: existing.endsAt?.toISOString() ?? null,
    },
    newValue: {
      key: updated.key,
      title: updated.title,
      summary: updated.summary,
      phase: updated.phase,
      deploymentDurationWeeks: updated.deploymentDurationWeeks,
      zeusAssignmentType: updated.zeusAssignmentType,
      zeusUserId: updated.zeusUserId,
      startsAt: updated.startsAt?.toISOString() ?? null,
      endsAt: updated.endsAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(input.reason),
  });

  if (
    existing.zeusAssignmentType !== updated.zeusAssignmentType ||
    existing.zeusUserId !== updated.zeusUserId
  ) {
    await createAuditLogEntry({
      actorUserId: actor.id,
      action: "deployment.zeus_assigned",
      entityType: "Campaign",
      entityId: updated.id,
      summary: `${updated.title} Zeus assignment changed.`,
      oldValue: {
        zeusAssignmentType: existing.zeusAssignmentType,
        zeusUserId: existing.zeusUserId,
      },
      newValue: {
        zeusAssignmentType: updated.zeusAssignmentType,
        zeusUserId: updated.zeusUserId,
      },
      reason: normalizeOptionalString(input.reason),
    });
  }

  revalidateCampaignRoutes({
    campaignId: updated.id,
    eventIds: existing.events.map((event) => event.id),
    unitKeys: existing.events
      .map((event) => event.hostUnit?.key ?? null)
      .filter((value): value is string => Boolean(value)),
  });
}

export async function publishCampaign(campaignId: string, reason?: string | null) {
  const actor = await requireAnyScopedPermission(["deployments.publish", "campaigns.publish"], []);
  const existing = await getCampaignRecord(campaignId);

  if (!existing) {
    throw new Error("Deployment not found.");
  }

  const updated = await prisma.campaign.update({
    where: { id: existing.id },
    data: {
      publishedAt: existing.publishedAt ?? new Date(),
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "deployment.published",
    entityType: "Campaign",
    entityId: updated.id,
    summary: `${updated.title} deployment published.`,
    oldValue: {
      publishedAt: existing.publishedAt?.toISOString() ?? null,
    },
    newValue: {
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(reason),
  });

  await queueCampaignPublishedNotificationPlaceholder({
    actorUserId: actor.id,
    campaignId: updated.id,
    campaignTitle: updated.title,
    phaseLabel: updated.phase ?? updated.status,
    targetUnitIds: existing.events.map((event) => event.hostUnitId),
  });

  revalidateCampaignRoutes({
    campaignId: updated.id,
    eventIds: existing.events.map((event) => event.id),
    unitKeys: existing.events
      .map((event) => event.hostUnit?.key ?? null)
      .filter((value): value is string => Boolean(value)),
  });
}

export async function archiveCampaign(campaignId: string, reason?: string | null) {
  const actor = await requirePermission("campaigns.archive");
  const existing = await getCampaignRecord(campaignId);

  if (!existing) {
    throw new Error("Deployment not found.");
  }

  const updated = await prisma.campaign.update({
    where: { id: existing.id },
    data: {
      status: "archived",
      archivedAt: existing.archivedAt ?? new Date(),
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "deployment.archived",
    entityType: "Campaign",
    entityId: updated.id,
    summary: `${updated.title} deployment archived.`,
    oldValue: {
      status: existing.status,
      archivedAt: existing.archivedAt?.toISOString() ?? null,
    },
    newValue: {
      status: updated.status,
      archivedAt: updated.archivedAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateCampaignRoutes({
    campaignId: updated.id,
    eventIds: existing.events.map((event) => event.id),
    unitKeys: existing.events
      .map((event) => event.hostUnit?.key ?? null)
      .filter((value): value is string => Boolean(value)),
  });
}

export async function updateCampaignStatus(
  campaignId: string,
  status: string,
  reason?: string | null,
) {
  const actor = await requirePermission("campaigns.edit");
  const existing = await getCampaignRecord(campaignId);

  if (!existing) {
    throw new Error("Deployment not found.");
  }

  if (!isCampaignStatus(status)) {
    throw new Error("Select a valid campaign status.");
  }

  if (status === "archived") {
    throw new Error("Use the archive action to archive a campaign.");
  }

  const updated = await prisma.campaign.update({
    where: { id: existing.id },
    data: {
      status,
      archivedAt: status === "completed" ? existing.archivedAt : null,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "deployment.status_changed",
    entityType: "Campaign",
    entityId: updated.id,
    summary: `${updated.title} deployment status changed.`,
    oldValue: {
      status: existing.status,
    },
    newValue: {
      status: updated.status,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateCampaignRoutes({
    campaignId: updated.id,
    eventIds: existing.events.map((event) => event.id),
    unitKeys: existing.events
      .map((event) => event.hostUnit?.key ?? null)
      .filter((value): value is string => Boolean(value)),
  });
}

export async function updateCampaignPhase(
  campaignId: string,
  phase: string | null,
  reason?: string | null,
) {
  const actor = await requirePermission("campaigns.edit");
  const existing = await getCampaignRecord(campaignId);

  if (!existing) {
    throw new Error("Deployment not found.");
  }

  const updated = await prisma.campaign.update({
    where: { id: existing.id },
    data: {
      phase: normalizeOptionalString(phase),
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "deployment.phase_changed",
    entityType: "Campaign",
    entityId: updated.id,
    summary: `${updated.title} deployment phase changed.`,
    oldValue: {
      phase: existing.phase,
    },
    newValue: {
      phase: updated.phase,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateCampaignRoutes({
    campaignId: updated.id,
    eventIds: existing.events.map((event) => event.id),
    unitKeys: existing.events
      .map((event) => event.hostUnit?.key ?? null)
      .filter((value): value is string => Boolean(value)),
  });
}

export async function linkEventToCampaign(
  campaignId: string,
  eventId: string,
  reason?: string | null,
) {
  const actor = await requirePermission("campaigns.timeline.manage");
  const [campaign, event] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      include: {
        hostUnit: true,
        campaign: true,
      },
    }),
  ]);

  if (!campaign) {
    throw new Error("Deployment not found.");
  }

  if (!event) {
    throw new Error("Event not found.");
  }

  await prisma.event.update({
    where: { id: event.id },
    data: {
      campaignId: campaign.id,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "deployment.event_linked",
    entityType: "Campaign",
    entityId: campaign.id,
    summary: `${event.title} linked to ${campaign.title}.`,
    oldValue: {
      previousCampaignId: event.campaignId,
      previousCampaignTitle: event.campaign?.title ?? null,
    },
    newValue: {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      eventId: event.id,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateCampaignRoutes({
    campaignId: campaign.id,
    eventIds: [event.id],
    unitKeys: event.hostUnit?.key ? [event.hostUnit.key] : [],
  });
}

export async function unlinkEventFromCampaign(
  eventId: string,
  reason?: string | null,
) {
  const actor = await requirePermission("campaigns.timeline.manage");
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hostUnit: true,
      campaign: true,
    },
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  if (!event.campaignId) {
    throw new Error("This event is not currently linked to a deployment.");
  }

  await prisma.event.update({
    where: { id: event.id },
    data: {
      campaignId: null,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "deployment.event_unlinked",
    entityType: "Campaign",
    entityId: event.campaignId,
    summary: `${event.title} unlinked from ${event.campaign?.title ?? "deployment"}.`,
    oldValue: {
      campaignId: event.campaignId,
      campaignTitle: event.campaign?.title ?? null,
    },
    newValue: {
      campaignId: null,
      eventId: event.id,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateCampaignRoutes({
    campaignId: event.campaignId,
    eventIds: [event.id],
    unitKeys: event.hostUnit?.key ? [event.hostUnit.key] : [],
  });
}
