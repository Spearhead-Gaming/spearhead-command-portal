import { revalidatePath } from "next/cache";

import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { isEventType, normalizeFilterValue } from "@/server/events/utils";
import type { PortalUser } from "@/features/auth/types";
import {
  queueAarMissingScreenshotNotificationPlaceholder,
  queueAarReviewedNotificationPlaceholder,
  queueAarSubmittedNotificationPlaceholder,
  queueConopPublishedNotificationPlaceholder,
  queueDeploymentProgressionRecommendedNotificationPlaceholder,
  queueMissionReviewRequestedNotificationPlaceholder,
} from "@/server/notifications/hooks";
import { can } from "@/server/permissions/access";
import { putAarAttachmentFile } from "@/server/storage/aar-attachment-storage";
import {
  canTransitionMissionStatus,
  isAarStatus,
  isMissionStatus,
  requireAnyScopedPermission,
  requireScopedS3Permission,
} from "@/server/s3/utils";

type CreateMissionInput = {
  title: string;
  description?: string | null;
  eventType: string;
  hostUnitId?: string | null;
  campaignId?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  missionMakerName?: string | null;
  zeusName?: string | null;
  missionCommanderName?: string | null;
  operationVersionLabel?: string | null;
  selectedOperationVersion?: string | null;
  reason?: string | null;
};

type EditMissionInput = CreateMissionInput & {
  missionId: string;
};

type CreateConopInput = {
  title: string;
  eventId?: string | null;
  campaignId?: string | null;
  situation?: string | null;
  mission?: string | null;
  execution?: string | null;
  sustainment?: string | null;
  commandSignal?: string | null;
  mapName?: string | null;
  modPreset?: string | null;
  participatingUnitsSummary?: string | null;
  missionMakerName?: string | null;
  zeusName?: string | null;
  missionCommanderName?: string | null;
  specialInstructions?: string | null;
  reason?: string | null;
};

type EditConopInput = CreateConopInput & {
  conopId: string;
};

type SubmitAarInput = {
  title: string;
  eventId?: string | null;
  campaignId?: string | null;
  patrolLeaderName?: string | null;
  summary?: string | null;
  wentWell?: string | null;
  needsImprovement?: string | null;
  friendlyCasualties?: string | null;
  enemyCasualties?: string | null;
  equipmentLosses?: string | null;
  actionItems?: string | null;
  additionalNotes?: string | null;
  dtg?: string | null;
  tasking?: string | null;
  callsigns?: string | null;
  fkia?: string | null;
  fwia?: string | null;
  fmia?: string | null;
  ekia?: string | null;
  report?: string | null;
  mapScreenshot?: {
    bytes: Buffer;
    name: string;
    type?: string | null;
  } | null;
  supportingMedia?: {
    bytes: Buffer;
    name: string;
    type?: string | null;
  } | null;
  aarProgressionRecommendation?: string | null;
  aarNextVersionRecommendation?: string | null;
  aarProgressionDecision?: string | null;
  aarProgressionNotes?: string | null;
  aarEnemyActivityNotes?: string | null;
  aarFriendlyActivityNotes?: string | null;
  aarUnitPerformanceNotes?: string | null;
  aarTaskingAdjustments?: string | null;
  aarPlanningNotesNextWeek?: string | null;
  aarLessonsLearned?: string | null;
  reason?: string | null;
};

type EditAarInput = SubmitAarInput & {
  aarId: string;
};

type ReviewAarInput = {
  reason?: string | null;
  aarProgressionRecommendation?: string | null;
  aarNextVersionRecommendation?: string | null;
  aarProgressionDecision?: string | null;
  aarProgressionNotes?: string | null;
  aarEnemyActivityNotes?: string | null;
  aarFriendlyActivityNotes?: string | null;
  aarUnitPerformanceNotes?: string | null;
  aarTaskingAdjustments?: string | null;
  aarPlanningNotesNextWeek?: string | null;
  aarLessonsLearned?: string | null;
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

function assertDateRange(startsAt: Date, endsAt?: Date | null) {
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("A valid mission start date is required.");
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error("Mission end date is invalid.");
  }

  if (endsAt && endsAt < startsAt) {
    throw new Error("Mission end date cannot be before the start date.");
  }
}

function assertLifecycleStatus(status: string) {
  if (!isMissionStatus(status)) {
    throw new Error("Select a valid mission lifecycle status.");
  }
}

function assertMissionLifecycleTransition(currentStatus: string, nextStatus: string) {
  assertLifecycleStatus(currentStatus);
  assertLifecycleStatus(nextStatus);

  if (!canTransitionMissionStatus(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid mission lifecycle transition from ${currentStatus} to ${nextStatus}.`,
    );
  }
}

function revalidateS3Routes(input?: {
  missionId?: string | null;
  campaignId?: string | null;
  eventId?: string | null;
  unitKeys?: string[];
}) {
  revalidatePath("/operations/s3");
  revalidatePath("/operations/conops");
  revalidatePath("/operations/aars");
  revalidatePath("/operations/aar-queue");
  revalidatePath("/operations/events");
  revalidatePath("/operations/campaigns");
  revalidatePath("/dashboard");

  if (input?.missionId) {
    revalidatePath(`/operations/events/${input.missionId}`);
  }

  if (input?.eventId && input.eventId !== input.missionId) {
    revalidatePath(`/operations/events/${input.eventId}`);
  }

  if (input?.campaignId) {
    revalidatePath(`/operations/campaigns/${input.campaignId}`);
  }

  for (const unitKey of input?.unitKeys ?? []) {
    revalidatePath(`/units/${unitKey}`);
  }
}

async function getCampaignScope(campaignId: string | null | undefined) {
  if (!campaignId) {
    return {
      hostUnitIds: [] as string[],
      unitKeys: [] as string[],
    };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      events: {
        include: {
          hostUnit: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  return {
    hostUnitIds: Array.from(
      new Set(
        campaign.events
          .map((event) => event.hostUnitId)
          .filter((hostUnitId): hostUnitId is string => Boolean(hostUnitId)),
      ),
    ),
    unitKeys: Array.from(
      new Set(
        campaign.events
          .map((event) => event.hostUnit?.key)
          .filter((unitKey): unitKey is string => Boolean(unitKey)),
      ),
    ),
  };
}

async function getMissionRecord(missionId: string) {
  return prisma.event.findUnique({
    where: { id: missionId },
    include: {
      hostUnit: true,
      campaign: true,
      conops: {
        where: {
          deletedAt: null,
        },
      },
      aars: {
        where: {
          deletedAt: null,
        },
      },
    },
  });
}

async function getConopRecord(conopId: string) {
  return prisma.conop.findUnique({
    where: { id: conopId },
    include: {
      event: {
        include: {
          hostUnit: true,
        },
      },
      campaign: {
        include: {
          events: {
            include: {
              hostUnit: true,
            },
          },
        },
      },
    },
  });
}

async function getAarRecord(aarId: string) {
  return prisma.aar.findUnique({
    where: { id: aarId },
    include: {
      event: {
        include: {
          hostUnit: true,
        },
      },
      campaign: {
        include: {
          events: {
            include: {
              hostUnit: true,
            },
          },
        },
      },
      reviewedBy: true,
      attachments: true,
    },
  });
}

function assertPatrolAarEvent(
  event: Awaited<ReturnType<typeof resolveEventAndCampaignScope>>["event"],
): asserts event is NonNullable<Awaited<ReturnType<typeof resolveEventAndCampaignScope>>["event"]> {
  if (!event) {
    throw new Error("A Patrol AAR must be linked to a patrol event.");
  }

  if (event.eventType !== "patrol") {
    throw new Error("AARs are only used for Patrol events. Weekend Operations do not use AARs.");
  }
}

function getPatrolAarStatus(input: SubmitAarInput) {
  return input.mapScreenshot ? "submitted" : "pending-map";
}

function assertAllowedAarScreenshot(fileName: string, mimeType?: string | null) {
  const extension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/octet-stream"]);

  if (!allowedExtensions.has(extension) || (mimeType && !allowedMimeTypes.has(mimeType))) {
    throw new Error("Patrol AAR map screenshots must be PNG, JPG, JPEG, or WEBP files.");
  }
}

function assertAarAttachmentSize(bytes: Buffer, label: string, maxMegabytes = 25) {
  const maxBytes = maxMegabytes * 1024 * 1024;

  if (bytes.byteLength > maxBytes) {
    throw new Error(`${label} must be ${maxMegabytes} MB or smaller.`);
  }
}

function assertAllowedAarSupportingMedia(fileName: string, mimeType?: string | null) {
  const extension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const allowedExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".pdf",
    ".txt",
    ".md",
    ".mp4",
    ".mov",
    ".webm",
  ]);
  const allowedMimeTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "application/octet-stream",
  ]);

  if (!allowedExtensions.has(extension) || (mimeType && !allowedMimeTypes.has(mimeType))) {
    throw new Error("AAR supporting media must be an image, PDF/text note, or common video file.");
  }
}

function assertRequiredPatrolAarReportFields(
  input: SubmitAarInput,
  options: {
    requireMapScreenshot: boolean;
  },
) {
  const requiredFields: Array<[keyof SubmitAarInput, string]> = [
    ["tasking", "Tasking"],
    ["callsigns", "Callsigns"],
    ["fkia", "FKIA"],
    ["fwia", "FWIA"],
    ["fmia", "FMIA"],
    ["ekia", "EKIA"],
    ["report", "Report"],
  ];
  const missingFields = requiredFields
    .filter(([key]) => !normalizeOptionalString(input[key] as string | null | undefined))
    .map(([, label]) => label);

  if (missingFields.length > 0) {
    throw new Error(`Patrol AAR is missing required field${missingFields.length === 1 ? "" : "s"}: ${missingFields.join(", ")}.`);
  }

  if (options.requireMapScreenshot && !input.mapScreenshot) {
    throw new Error("Portal Patrol AAR submission requires a map screenshot.");
  }
}

async function attachAarMapScreenshot(input: {
  actorUserId: string;
  aarId: string;
  campaignId: string | null;
  deploymentWeek: number | null;
  eventId: string | null;
  file: NonNullable<SubmitAarInput["mapScreenshot"]>;
}) {
  assertAllowedAarScreenshot(input.file.name, input.file.type);
  assertAarAttachmentSize(input.file.bytes, "Patrol AAR map screenshot", 10);
  const fileMetadata = await putAarAttachmentFile({
    aarId: input.aarId,
    bytes: input.file.bytes,
    originalFileName: input.file.name,
  });

  const attachment = await prisma.aarAttachment.create({
    data: {
      aarId: input.aarId,
      attachmentType: "map_screenshot",
      campaignId: input.campaignId,
      deploymentWeek: input.deploymentWeek,
      eventId: input.eventId,
      fileName: input.file.name,
      fileSizeBytes: fileMetadata.fileSizeBytes,
      label: "Map Screenshot",
      mimeType: input.file.type || "application/octet-stream",
      storageKey: fileMetadata.storageKey,
      uploadedByUserId: input.actorUserId,
    },
  });

  await createAuditLogEntry({
    action: "aar.map_screenshot_uploaded",
    actorUserId: input.actorUserId,
    entityId: attachment.id,
    entityType: "AarAttachment",
    newValue: {
      aarId: input.aarId,
      campaignId: input.campaignId,
      deploymentWeek: input.deploymentWeek,
      eventId: input.eventId,
      fileName: attachment.fileName,
      fileSizeBytes: attachment.fileSizeBytes,
      mimeType: attachment.mimeType,
    },
    summary: `${attachment.fileName} map screenshot uploaded for Patrol AAR.`,
  });

  return attachment;
}

async function attachAarSupportingMedia(input: {
  actorUserId: string;
  aarId: string;
  campaignId: string | null;
  deploymentWeek: number | null;
  eventId: string | null;
  file: NonNullable<SubmitAarInput["supportingMedia"]>;
}) {
  assertAllowedAarSupportingMedia(input.file.name, input.file.type);
  assertAarAttachmentSize(input.file.bytes, "AAR supporting media", 25);
  const fileMetadata = await putAarAttachmentFile({
    aarId: input.aarId,
    bytes: input.file.bytes,
    originalFileName: input.file.name,
  });

  const attachment = await prisma.aarAttachment.create({
    data: {
      aarId: input.aarId,
      attachmentType: "supporting_media",
      campaignId: input.campaignId,
      deploymentWeek: input.deploymentWeek,
      eventId: input.eventId,
      fileName: input.file.name,
      fileSizeBytes: fileMetadata.fileSizeBytes,
      label: "Supporting Media",
      mimeType: input.file.type || "application/octet-stream",
      storageKey: fileMetadata.storageKey,
      uploadedByUserId: input.actorUserId,
    },
  });

  await createAuditLogEntry({
    action: "aar.additional_media_uploaded",
    actorUserId: input.actorUserId,
    entityId: attachment.id,
    entityType: "AarAttachment",
    newValue: {
      aarId: input.aarId,
      campaignId: input.campaignId,
      deploymentWeek: input.deploymentWeek,
      eventId: input.eventId,
      fileName: attachment.fileName,
      fileSizeBytes: attachment.fileSizeBytes,
      mimeType: attachment.mimeType,
    },
    summary: `${attachment.fileName} supporting media uploaded for Patrol AAR.`,
  });

  return attachment;
}

async function resolveEventAndCampaignScope(input: {
  eventId?: string | null;
  campaignId?: string | null;
}) {
  const eventId = normalizeFilterValue(input.eventId);
  const campaignId = normalizeFilterValue(input.campaignId);
  const event = eventId
    ? await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          hostUnit: true,
        },
      })
    : null;

  if (eventId && !event) {
    throw new Error("Event not found.");
  }

  const campaignScope = await getCampaignScope(campaignId);

  return {
    event,
    hostUnitIds: Array.from(
      new Set([
        ...campaignScope.hostUnitIds,
        ...(event?.hostUnitId ? [event.hostUnitId] : []),
      ]),
    ),
    unitKeys: Array.from(
      new Set([
        ...campaignScope.unitKeys,
        ...(event?.hostUnit?.key ? [event.hostUnit.key] : []),
      ]),
    ),
  };
}

async function syncMissionLifecycleFromEventState(eventId: string) {
  const mission = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      aars: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  if (!mission) {
    return;
  }

  if (mission.status === "archived") {
    await prisma.event.update({
      where: { id: mission.id },
      data: {
        missionStatus: "archived",
      },
    });
    return;
  }

  if (mission.aars.some((aar) => ["submitted", "reviewed"].includes(aar.status))) {
    await prisma.event.update({
      where: { id: mission.id },
      data: {
        missionStatus: "aar-submitted",
      },
    });
    return;
  }

  if (mission.status === "completed") {
    await prisma.event.update({
      where: { id: mission.id },
      data: {
        missionStatus: "completed",
      },
    });
  }
}

export async function createMission(input: CreateMissionInput) {
  const actor = await requireScopedS3Permission("s3.missions.create", [
    input.hostUnitId,
  ]);
  const title = normalizeRequiredString(input.title, "Mission title");
  const eventType = normalizeRequiredString(input.eventType, "Mission type");

  if (!isEventType(eventType)) {
    throw new Error("Select a valid mission type.");
  }

  assertDateRange(input.startsAt, input.endsAt);
  const mission = await prisma.event.create({
    data: {
      title,
      description: normalizeOptionalString(input.description),
      eventType,
      status: "draft",
      missionStatus: "draft",
      hostUnitId: normalizeFilterValue(input.hostUnitId) ?? null,
      campaignId: normalizeFilterValue(input.campaignId) ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      missionMakerName: normalizeOptionalString(input.missionMakerName),
      zeusName: normalizeOptionalString(input.zeusName),
      missionCommanderName: normalizeOptionalString(input.missionCommanderName),
      operationVersionLabel: normalizeOptionalString(input.operationVersionLabel),
      selectedOperationVersion: normalizeOptionalString(input.selectedOperationVersion),
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "mission.created",
    entityType: "Event",
    entityId: mission.id,
    summary: `${mission.title} mission created.`,
    newValue: {
      title: mission.title,
      eventType: mission.eventType,
      missionStatus: mission.missionStatus,
      hostUnitId: mission.hostUnitId,
      campaignId: mission.campaignId,
      missionMakerName: mission.missionMakerName,
      zeusName: mission.zeusName,
      missionCommanderName: mission.missionCommanderName,
      operationVersionLabel: mission.operationVersionLabel,
      selectedOperationVersion: mission.selectedOperationVersion,
    },
    reason: normalizeOptionalString(input.reason),
  });

  revalidateS3Routes({
    missionId: mission.id,
    campaignId: mission.campaignId,
    unitKeys: mission.hostUnit?.key ? [mission.hostUnit.key] : [],
  });
}

export async function editMission(input: EditMissionInput) {
  const existing = await getMissionRecord(input.missionId);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  const actor = await requireScopedS3Permission("s3.missions.edit", [
    normalizeFilterValue(input.hostUnitId) ?? existing.hostUnitId,
  ]);
  const title = normalizeRequiredString(input.title, "Mission title");
  const eventType = normalizeRequiredString(input.eventType, "Mission type");

  if (!isEventType(eventType)) {
    throw new Error("Select a valid mission type.");
  }

  assertDateRange(input.startsAt, input.endsAt);
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      title,
      description: normalizeOptionalString(input.description),
      eventType,
      hostUnitId: normalizeFilterValue(input.hostUnitId) ?? null,
      campaignId: normalizeFilterValue(input.campaignId) ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      missionMakerName: normalizeOptionalString(input.missionMakerName),
      zeusName: normalizeOptionalString(input.zeusName),
      missionCommanderName: normalizeOptionalString(input.missionCommanderName),
      operationVersionLabel: normalizeOptionalString(input.operationVersionLabel),
      selectedOperationVersion: normalizeOptionalString(input.selectedOperationVersion),
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "mission.edited",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} mission updated.`,
    oldValue: {
      title: existing.title,
      eventType: existing.eventType,
      missionMakerName: existing.missionMakerName,
      zeusName: existing.zeusName,
      missionCommanderName: existing.missionCommanderName,
      operationVersionLabel: existing.operationVersionLabel,
      selectedOperationVersion: existing.selectedOperationVersion,
      hostUnitId: existing.hostUnitId,
      campaignId: existing.campaignId,
    },
    newValue: {
      title: updated.title,
      eventType: updated.eventType,
      missionMakerName: updated.missionMakerName,
      zeusName: updated.zeusName,
      missionCommanderName: updated.missionCommanderName,
      operationVersionLabel: updated.operationVersionLabel,
      selectedOperationVersion: updated.selectedOperationVersion,
      hostUnitId: updated.hostUnitId,
      campaignId: updated.campaignId,
    },
    reason: normalizeOptionalString(input.reason),
  });

  revalidateS3Routes({
    missionId: updated.id,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: Array.from(
      new Set(
        [updated.hostUnit?.key ?? null, existing.hostUnit?.key ?? null].filter(
          (unitKey): unitKey is string => Boolean(unitKey),
        ),
      ),
    ),
  });
}

export async function updateMissionStatus(
  missionId: string,
  status: string,
  reason?: string | null,
) {
  const existing = await getMissionRecord(missionId);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  const actor = await requireScopedS3Permission("s3.missions.edit", [
    existing.hostUnitId,
  ]);

  assertLifecycleStatus(status);
  assertMissionLifecycleTransition(existing.missionStatus, status);
  const nextEventStatus =
    status === "published"
      ? "published"
      : status === "completed" || status === "aar-submitted"
        ? "completed"
        : status === "archived"
          ? "archived"
          : existing.status === "archived" && status !== "archived"
            ? "draft"
            : existing.status === "completed" && status !== "completed" && status !== "aar-submitted"
              ? "draft"
              : existing.status;

  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      missionStatus: status,
      status: nextEventStatus,
      publishedAt:
        status === "published"
          ? existing.publishedAt ?? new Date()
          : existing.publishedAt,
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "mission.status_changed",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} mission lifecycle changed.`,
    oldValue: {
      missionStatus: existing.missionStatus,
      status: existing.status,
    },
    newValue: {
      missionStatus: updated.missionStatus,
      status: updated.status,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateS3Routes({
    missionId: updated.id,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: updated.hostUnit?.key ? [updated.hostUnit.key] : [],
  });
}

export async function submitMissionForReview(missionId: string, reason?: string | null) {
  const existing = await getMissionRecord(missionId);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  const actor = await requireScopedS3Permission("s3.missions.review", [
    existing.hostUnitId,
  ]);
  assertMissionLifecycleTransition(existing.missionStatus, "s3-review");
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      missionStatus: "s3-review",
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "mission.submitted_for_review",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} mission submitted for review.`,
    oldValue: {
      missionStatus: existing.missionStatus,
    },
    newValue: {
      missionStatus: updated.missionStatus,
    },
    reason: normalizeOptionalString(reason),
  });

  await queueMissionReviewRequestedNotificationPlaceholder({
    actorUserId: actor.id,
    missionTitle: updated.title,
  });

  revalidateS3Routes({
    missionId: updated.id,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: updated.hostUnit?.key ? [updated.hostUnit.key] : [],
  });
}

export async function approveMission(missionId: string, reason?: string | null) {
  const existing = await getMissionRecord(missionId);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  const actor = await requireScopedS3Permission("s3.missions.approve", [
    existing.hostUnitId,
  ]);
  assertMissionLifecycleTransition(existing.missionStatus, "approved");
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      missionStatus: "approved",
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "mission.approved",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} mission approved.`,
    oldValue: {
      missionStatus: existing.missionStatus,
    },
    newValue: {
      missionStatus: updated.missionStatus,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateS3Routes({
    missionId: updated.id,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: updated.hostUnit?.key ? [updated.hostUnit.key] : [],
  });
}

export async function rejectMission(missionId: string, reason?: string | null) {
  const existing = await getMissionRecord(missionId);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  const actor = await requireScopedS3Permission("s3.missions.reject", [
    existing.hostUnitId,
  ]);
  assertMissionLifecycleTransition(existing.missionStatus, "draft");
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      missionStatus: "draft",
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "mission.rejected",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} mission rejected and returned to draft.`,
    oldValue: {
      missionStatus: existing.missionStatus,
    },
    newValue: {
      missionStatus: updated.missionStatus,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateS3Routes({
    missionId: updated.id,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: updated.hostUnit?.key ? [updated.hostUnit.key] : [],
  });
}

export async function publishMission(missionId: string, reason?: string | null) {
  const existing = await getMissionRecord(missionId);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  const actor = await requireScopedS3Permission("s3.missions.publish", [
    existing.hostUnitId,
  ]);
  assertMissionLifecycleTransition(existing.missionStatus, "published");
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      missionStatus: "published",
      status: "published",
      publishedAt: existing.publishedAt ?? new Date(),
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "mission.published",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} mission published.`,
    oldValue: {
      missionStatus: existing.missionStatus,
      status: existing.status,
      publishedAt: existing.publishedAt?.toISOString() ?? null,
    },
    newValue: {
      missionStatus: updated.missionStatus,
      status: updated.status,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateS3Routes({
    missionId: updated.id,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: updated.hostUnit?.key ? [updated.hostUnit.key] : [],
  });
}

export async function archiveMission(missionId: string, reason?: string | null) {
  const existing = await getMissionRecord(missionId);

  if (!existing) {
    throw new Error("Mission not found.");
  }

  const actor = await requireScopedS3Permission("s3.missions.archive", [
    existing.hostUnitId,
  ]);
  assertMissionLifecycleTransition(existing.missionStatus, "archived");
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      missionStatus: "archived",
      status: "archived",
    },
    include: {
      hostUnit: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "mission.archived",
    entityType: "Event",
    entityId: updated.id,
    summary: `${updated.title} mission archived.`,
    oldValue: {
      missionStatus: existing.missionStatus,
      status: existing.status,
    },
    newValue: {
      missionStatus: updated.missionStatus,
      status: updated.status,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateS3Routes({
    missionId: updated.id,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: updated.hostUnit?.key ? [updated.hostUnit.key] : [],
  });
}

export async function createConop(input: CreateConopInput) {
  const scope = await resolveEventAndCampaignScope(input);
  const actor = await requireScopedS3Permission("s3.conops.create", scope.hostUnitIds);
  const conop = await prisma.conop.create({
    data: {
      title: normalizeRequiredString(input.title, "CONOP title"),
      eventId: normalizeFilterValue(input.eventId) ?? null,
      campaignId: normalizeFilterValue(input.campaignId) ?? null,
      status: "draft",
      situation: normalizeOptionalString(input.situation),
      mission: normalizeOptionalString(input.mission),
      execution: normalizeOptionalString(input.execution),
      sustainment: normalizeOptionalString(input.sustainment),
      commandSignal: normalizeOptionalString(input.commandSignal),
      mapName: normalizeOptionalString(input.mapName),
      modPreset: normalizeOptionalString(input.modPreset),
      participatingUnitsSummary: normalizeOptionalString(input.participatingUnitsSummary),
      missionMakerName: normalizeOptionalString(input.missionMakerName),
      zeusName: normalizeOptionalString(input.zeusName),
      missionCommanderName: normalizeOptionalString(input.missionCommanderName),
      specialInstructions: normalizeOptionalString(input.specialInstructions),
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "conop.created",
    entityType: "Conop",
    entityId: conop.id,
    summary: `${conop.title} CONOP created.`,
    newValue: {
      title: conop.title,
      status: conop.status,
      eventId: conop.eventId,
      campaignId: conop.campaignId,
    },
    reason: normalizeOptionalString(input.reason),
  });

  revalidateS3Routes({
    eventId: conop.eventId,
    campaignId: conop.campaignId,
    unitKeys: scope.unitKeys,
  });
}

export async function editConop(input: EditConopInput) {
  const existing = await getConopRecord(input.conopId);

  if (!existing || existing.deletedAt) {
    throw new Error("CONOP not found.");
  }

  const scope = await resolveEventAndCampaignScope(input);
  const actor = await requireScopedS3Permission("s3.conops.edit", [
    ...scope.hostUnitIds,
    existing.event?.hostUnitId,
    ...(existing.campaign?.events.map((event) => event.hostUnitId) ?? []),
  ]);
  const updated = await prisma.conop.update({
    where: { id: existing.id },
    data: {
      title: normalizeRequiredString(input.title, "CONOP title"),
      eventId: normalizeFilterValue(input.eventId) ?? null,
      campaignId: normalizeFilterValue(input.campaignId) ?? null,
      situation: normalizeOptionalString(input.situation),
      mission: normalizeOptionalString(input.mission),
      execution: normalizeOptionalString(input.execution),
      sustainment: normalizeOptionalString(input.sustainment),
      commandSignal: normalizeOptionalString(input.commandSignal),
      mapName: normalizeOptionalString(input.mapName),
      modPreset: normalizeOptionalString(input.modPreset),
      participatingUnitsSummary: normalizeOptionalString(input.participatingUnitsSummary),
      missionMakerName: normalizeOptionalString(input.missionMakerName),
      zeusName: normalizeOptionalString(input.zeusName),
      missionCommanderName: normalizeOptionalString(input.missionCommanderName),
      specialInstructions: normalizeOptionalString(input.specialInstructions),
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "conop.edited",
    entityType: "Conop",
    entityId: updated.id,
    summary: `${updated.title} CONOP updated.`,
    oldValue: {
      title: existing.title,
      status: existing.status,
      eventId: existing.eventId,
      campaignId: existing.campaignId,
    },
    newValue: {
      title: updated.title,
      status: updated.status,
      eventId: updated.eventId,
      campaignId: updated.campaignId,
    },
    reason: normalizeOptionalString(input.reason),
  });

  revalidateS3Routes({
    eventId: updated.eventId ?? existing.eventId,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: Array.from(
      new Set([
        ...scope.unitKeys,
        existing.event?.hostUnit?.key ?? null,
        ...(existing.campaign?.events.map((event) => event.hostUnit?.key ?? null) ?? []),
      ].filter((unitKey): unitKey is string => Boolean(unitKey))),
    ),
  });
}

export async function publishConop(conopId: string, reason?: string | null) {
  const existing = await getConopRecord(conopId);

  if (!existing || existing.deletedAt) {
    throw new Error("CONOP not found.");
  }

  const actor = await requireScopedS3Permission("s3.conops.publish", [
    existing.event?.hostUnitId,
    ...(existing.campaign?.events.map((event) => event.hostUnitId) ?? []),
  ]);
  const updated = await prisma.conop.update({
    where: { id: existing.id },
    data: {
      status: "published",
      publishedAt: existing.publishedAt ?? new Date(),
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "conop.published",
    entityType: "Conop",
    entityId: updated.id,
    summary: `${updated.title} CONOP published.`,
    oldValue: {
      status: existing.status,
      publishedAt: existing.publishedAt?.toISOString() ?? null,
    },
    newValue: {
      status: updated.status,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    },
    reason: normalizeOptionalString(reason),
  });

  await queueConopPublishedNotificationPlaceholder({
    actorUserId: actor.id,
    conopTitle: updated.title,
    eventId: updated.eventId,
    targetUnitIds: [
      existing.event?.hostUnitId,
      ...(existing.campaign?.events.map((event) => event.hostUnitId) ?? []),
    ],
  });

  revalidateS3Routes({
    eventId: updated.eventId,
    campaignId: updated.campaignId,
    unitKeys: Array.from(
      new Set([
        existing.event?.hostUnit?.key ?? null,
        ...(existing.campaign?.events.map((event) => event.hostUnit?.key ?? null) ?? []),
      ].filter((unitKey): unitKey is string => Boolean(unitKey))),
    ),
  });
}

export async function linkConopToEvent(
  conopId: string,
  eventId: string,
  reason?: string | null,
) {
  const existing = await getConopRecord(conopId);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hostUnit: true,
    },
  });

  if (!existing || existing.deletedAt) {
    throw new Error("CONOP not found.");
  }

  if (!event) {
    throw new Error("Event not found.");
  }

  const actor = await requireScopedS3Permission("s3.conops.edit", [event.hostUnitId]);

  await prisma.conop.update({
    where: { id: existing.id },
    data: {
      eventId: event.id,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "conop.event_linked",
    entityType: "Conop",
    entityId: existing.id,
    summary: `${existing.title} linked to ${event.title}.`,
    oldValue: {
      eventId: existing.eventId,
    },
    newValue: {
      eventId: event.id,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateS3Routes({
    eventId: event.id,
    campaignId: existing.campaignId,
    unitKeys: event.hostUnit?.key ? [event.hostUnit.key] : [],
  });
}

export async function linkConopToCampaign(
  conopId: string,
  campaignId: string,
  reason?: string | null,
) {
  const existing = await getConopRecord(conopId);
  const scope = await getCampaignScope(campaignId);

  if (!existing || existing.deletedAt) {
    throw new Error("CONOP not found.");
  }

  const actor = await requireScopedS3Permission("s3.conops.edit", scope.hostUnitIds);

  await prisma.conop.update({
    where: { id: existing.id },
    data: {
      campaignId,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "conop.campaign_linked",
    entityType: "Conop",
    entityId: existing.id,
    summary: `${existing.title} linked to campaign.`,
    oldValue: {
      campaignId: existing.campaignId,
    },
    newValue: {
      campaignId,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateS3Routes({
    eventId: existing.eventId,
    campaignId,
    unitKeys: scope.unitKeys,
  });
}

function canSubmitAarAsActor(actor: PortalUser, hostUnitIds: Array<string | null | undefined>) {
  if (can(actor, "aars.submit") || can(actor, "patrols.aar.submit") || can(actor, "s3.aars.submit")) {
    return true;
  }

  return hostUnitIds.some((hostUnitId) =>
    hostUnitId
      ? can(actor, "aars.submit", { unitId: hostUnitId }) ||
        can(actor, "patrols.aar.submit", { unitId: hostUnitId }) ||
        can(actor, "s3.aars.submit", { unitId: hostUnitId })
      : false,
  );
}

async function createPatrolAarForActor(
  input: SubmitAarInput,
  scope: Awaited<ReturnType<typeof resolveEventAndCampaignScope>>,
  actor: PortalUser,
) {
  const event = scope.event;
  assertPatrolAarEvent(event);
  const aar = await prisma.aar.create({
    data: {
      title: normalizeRequiredString(input.title, "AAR title"),
      eventId: event.id,
      campaignId: event.campaignId ?? normalizeFilterValue(input.campaignId) ?? null,
      submittedByUserId: actor.id,
      status: getPatrolAarStatus(input),
      patrolLeaderName: normalizeOptionalString(input.patrolLeaderName),
      summary: normalizeOptionalString(input.summary) ?? normalizeOptionalString(input.report),
      wentWell: normalizeOptionalString(input.wentWell),
      needsImprovement: normalizeOptionalString(input.needsImprovement),
      friendlyCasualties: normalizeOptionalString(input.friendlyCasualties),
      enemyCasualties: normalizeOptionalString(input.enemyCasualties),
      equipmentLosses: normalizeOptionalString(input.equipmentLosses),
      actionItems: normalizeOptionalString(input.actionItems),
      callsigns: normalizeOptionalString(input.callsigns),
      dtg: normalizeOptionalString(input.dtg) ?? event.endsAt?.toISOString() ?? event.startsAt.toISOString(),
      ekia: normalizeOptionalString(input.ekia),
      fkia: normalizeOptionalString(input.fkia),
      fmia: normalizeOptionalString(input.fmia),
      fwia: normalizeOptionalString(input.fwia),
      report: normalizeOptionalString(input.report),
      tasking: normalizeOptionalString(input.tasking),
      aarProgressionRecommendation: normalizeOptionalString(input.aarProgressionRecommendation),
      aarNextVersionRecommendation: normalizeOptionalString(input.aarNextVersionRecommendation),
      aarProgressionDecision: normalizeOptionalString(input.aarProgressionDecision),
      aarProgressionNotes: normalizeOptionalString(input.aarProgressionNotes),
      aarEnemyActivityNotes: normalizeOptionalString(input.aarEnemyActivityNotes),
      aarFriendlyActivityNotes: normalizeOptionalString(input.aarFriendlyActivityNotes),
      aarUnitPerformanceNotes: normalizeOptionalString(input.aarUnitPerformanceNotes),
      aarTaskingAdjustments: normalizeOptionalString(input.aarTaskingAdjustments),
      aarPlanningNotesNextWeek: normalizeOptionalString(input.aarPlanningNotesNextWeek),
      aarLessonsLearned: normalizeOptionalString(input.aarLessonsLearned),
      additionalNotes: normalizeOptionalString(input.additionalNotes),
      submittedAt: new Date(),
    },
    include: {
      event: true,
    },
  });

  if (input.mapScreenshot) {
    await attachAarMapScreenshot({
      actorUserId: actor.id,
      aarId: aar.id,
      campaignId: aar.campaignId,
      deploymentWeek: event.deploymentWeek,
      eventId: aar.eventId,
      file: input.mapScreenshot,
    });
  }

  if (input.supportingMedia) {
    await attachAarSupportingMedia({
      actorUserId: actor.id,
      aarId: aar.id,
      campaignId: aar.campaignId,
      deploymentWeek: event.deploymentWeek,
      eventId: aar.eventId,
      file: input.supportingMedia,
    });
  }

  if (aar.eventId) {
    await prisma.event.update({
      where: { id: aar.eventId },
      data: {
        aarSubmittedAt: input.mapScreenshot ? aar.submittedAt : null,
        patrolStatus: input.mapScreenshot ? "aar-submitted" : "awaiting-aar",
      },
    });
    await syncMissionLifecycleFromEventState(aar.eventId);
  }

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: input.mapScreenshot ? "aar.submitted" : "aar.draft_created",
    entityType: "Aar",
    entityId: aar.id,
    summary: input.mapScreenshot
      ? `${aar.title} AAR submitted.`
      : `${aar.title} Patrol AAR draft created pending map screenshot.`,
    newValue: {
      title: aar.title,
      status: aar.status,
      eventId: aar.eventId,
      campaignId: aar.campaignId,
      patrolLeaderName: aar.patrolLeaderName,
      mapScreenshotRequired: !input.mapScreenshot,
      aarNextVersionRecommendation: aar.aarNextVersionRecommendation,
      aarProgressionRecommendation: aar.aarProgressionRecommendation,
    },
    reason: normalizeOptionalString(input.reason),
  });

  if (input.mapScreenshot) {
    await queueAarSubmittedNotificationPlaceholder({
      actorUserId: actor.id,
      aarId: aar.id,
      eventTitle: aar.event?.title ?? null,
      patrolLeaderName: aar.patrolLeaderName,
      targetUnitId: aar.event?.hostUnitId ?? null,
    });
  } else {
    await queueAarMissingScreenshotNotificationPlaceholder({
      actorUserId: actor.id,
      aarId: aar.id,
      eventTitle: aar.event?.title ?? null,
      patrolLeaderName: aar.patrolLeaderName,
      targetUnitId: aar.event?.hostUnitId ?? null,
    });
  }

  revalidateS3Routes({
    eventId: aar.eventId,
    campaignId: aar.campaignId,
    unitKeys: scope.unitKeys,
  });

  return aar;
}

export async function submitAar(input: SubmitAarInput) {
  const scope = await resolveEventAndCampaignScope(input);
  assertPatrolAarEvent(scope.event);
  assertRequiredPatrolAarReportFields(input, {
    requireMapScreenshot: true,
  });
  const actor = await requireAnyScopedPermission(["aars.submit", "patrols.aar.submit", "s3.aars.submit"], scope.hostUnitIds);

  return createPatrolAarForActor(input, scope, actor);
}

export async function submitAarAsActor(input: SubmitAarInput, actor: PortalUser) {
  const scope = await resolveEventAndCampaignScope(input);
  assertPatrolAarEvent(scope.event);
  assertRequiredPatrolAarReportFields(input, {
    requireMapScreenshot: false,
  });

  if (!canSubmitAarAsActor(actor, scope.hostUnitIds)) {
    throw new Error("You do not have permission to submit AARs.");
  }

  return createPatrolAarForActor(input, scope, actor);
}

export async function attachAarMapScreenshotAsActor(input: {
  aarId: string;
  file: NonNullable<SubmitAarInput["mapScreenshot"]>;
  reason?: string | null;
  source?: "discord" | "portal";
}, actor: PortalUser) {
  const existing = await getAarRecord(input.aarId);

  if (!existing || existing.deletedAt) {
    throw new Error("AAR not found.");
  }

  if (!existing.event || existing.event.eventType !== "patrol") {
    throw new Error("Only Patrol AARs can receive map screenshots.");
  }

  const isSubmitter = existing.submittedByUserId === actor.id;
  const isPatrolLeader =
    existing.event.patrolLeaderUserId === actor.id && can(actor, "patrols.lead");

  if (
    !isSubmitter &&
    !isPatrolLeader &&
    !canSubmitAarAsActor(actor, [
      existing.event.hostUnitId,
      ...(existing.campaign?.events.map((event) => event.hostUnitId) ?? []),
    ])
  ) {
    throw new Error("You do not have permission to attach this Patrol AAR screenshot.");
  }

  if (existing.attachments.some((attachment) => attachment.attachmentType === "map_screenshot")) {
    throw new Error("This Patrol AAR already has a map screenshot. Use the portal to review or replace attachments.");
  }

  const attachment = await attachAarMapScreenshot({
    actorUserId: actor.id,
    aarId: existing.id,
    campaignId: existing.campaignId,
    deploymentWeek: existing.event.deploymentWeek,
    eventId: existing.eventId,
    file: input.file,
  });

  const updated = await prisma.aar.update({
    where: {
      id: existing.id,
    },
    data: {
      status: existing.status === "reviewed" ? existing.status : "submitted",
      submittedAt: existing.submittedAt ?? new Date(),
    },
  });

  if (updated.eventId) {
    await prisma.event.update({
      where: {
        id: updated.eventId,
      },
      data: {
        aarSubmittedAt: updated.submittedAt,
        patrolStatus: "aar-submitted",
      },
    });
    await syncMissionLifecycleFromEventState(updated.eventId);
  }

  await prisma.pendingDiscordAarSubmission.updateMany({
    where: {
      aarId: existing.id,
      status: "awaiting-screenshot",
    },
    data: {
      status: "completed",
    },
  });

  if (input.source === "discord") {
    await createAuditLogEntry({
      action: "discord.aar_screenshot_uploaded",
      actorUserId: actor.id,
      entityId: attachment.id,
      entityType: "AarAttachment",
      metadata: {
        aarId: existing.id,
        eventId: existing.eventId,
        fileName: attachment.fileName,
        source: input.source,
      },
      reason: normalizeOptionalString(input.reason),
      summary: `${attachment.fileName} map screenshot uploaded from Discord for ${existing.title}.`,
    });
  }

  await queueAarSubmittedNotificationPlaceholder({
    actorUserId: actor.id,
    aarId: existing.id,
    eventTitle: existing.event.title,
    patrolLeaderName: existing.patrolLeaderName,
    targetUnitId: existing.event.hostUnitId,
  });

  revalidateS3Routes({
    eventId: existing.eventId,
    campaignId: existing.campaignId,
    unitKeys: existing.event.hostUnit?.key ? [existing.event.hostUnit.key] : [],
  });

  return {
    aar: updated,
    attachment,
    event: existing.event,
  };
}

export async function editAar(input: EditAarInput) {
  const existing = await getAarRecord(input.aarId);

  if (!existing || existing.deletedAt) {
    throw new Error("AAR not found.");
  }

  const scope = await resolveEventAndCampaignScope(input);
  const event = scope.event;
  assertPatrolAarEvent(event);
  const actor = await requireScopedS3Permission("s3.aars.submit", [
    ...scope.hostUnitIds,
    existing.event?.hostUnitId,
    ...(existing.campaign?.events.map((event) => event.hostUnitId) ?? []),
  ]);
  const updated = await prisma.aar.update({
    where: { id: existing.id },
    data: {
      title: normalizeRequiredString(input.title, "AAR title"),
      eventId: event.id,
      campaignId: event.campaignId ?? normalizeFilterValue(input.campaignId) ?? null,
      patrolLeaderName: normalizeOptionalString(input.patrolLeaderName),
      summary: normalizeOptionalString(input.summary) ?? normalizeOptionalString(input.report),
      wentWell: normalizeOptionalString(input.wentWell),
      needsImprovement: normalizeOptionalString(input.needsImprovement),
      friendlyCasualties: normalizeOptionalString(input.friendlyCasualties),
      enemyCasualties: normalizeOptionalString(input.enemyCasualties),
      equipmentLosses: normalizeOptionalString(input.equipmentLosses),
      actionItems: normalizeOptionalString(input.actionItems),
      callsigns: normalizeOptionalString(input.callsigns),
      dtg: normalizeOptionalString(input.dtg) ?? event.endsAt?.toISOString() ?? event.startsAt.toISOString(),
      ekia: normalizeOptionalString(input.ekia),
      fkia: normalizeOptionalString(input.fkia),
      fmia: normalizeOptionalString(input.fmia),
      fwia: normalizeOptionalString(input.fwia),
      report: normalizeOptionalString(input.report),
      tasking: normalizeOptionalString(input.tasking),
      aarProgressionRecommendation: normalizeOptionalString(input.aarProgressionRecommendation),
      aarNextVersionRecommendation: normalizeOptionalString(input.aarNextVersionRecommendation),
      aarProgressionDecision: normalizeOptionalString(input.aarProgressionDecision),
      aarProgressionNotes: normalizeOptionalString(input.aarProgressionNotes),
      aarEnemyActivityNotes: normalizeOptionalString(input.aarEnemyActivityNotes),
      aarFriendlyActivityNotes: normalizeOptionalString(input.aarFriendlyActivityNotes),
      aarUnitPerformanceNotes: normalizeOptionalString(input.aarUnitPerformanceNotes),
      aarTaskingAdjustments: normalizeOptionalString(input.aarTaskingAdjustments),
      aarPlanningNotesNextWeek: normalizeOptionalString(input.aarPlanningNotesNextWeek),
      aarLessonsLearned: normalizeOptionalString(input.aarLessonsLearned),
      additionalNotes: normalizeOptionalString(input.additionalNotes),
      status: existing.status === "reviewed" ? existing.status : input.mapScreenshot || existing.attachments.some((attachment) => attachment.attachmentType === "map_screenshot") ? "submitted" : "pending-map",
      submittedAt: existing.submittedAt ?? new Date(),
      submittedByUserId: existing.submittedByUserId ?? actor.id,
    },
  });

  if (input.mapScreenshot) {
    await attachAarMapScreenshot({
      actorUserId: actor.id,
      aarId: updated.id,
      campaignId: updated.campaignId,
      deploymentWeek: event.deploymentWeek,
      eventId: updated.eventId,
      file: input.mapScreenshot,
    });
  }

  if (input.supportingMedia) {
    await attachAarSupportingMedia({
      actorUserId: actor.id,
      aarId: updated.id,
      campaignId: updated.campaignId,
      deploymentWeek: event.deploymentWeek,
      eventId: updated.eventId,
      file: input.supportingMedia,
    });
  }

  if (updated.eventId) {
    await prisma.event.update({
      where: { id: updated.eventId },
      data: {
        aarSubmittedAt: updated.status === "submitted" || updated.status === "reviewed" ? updated.submittedAt : null,
        patrolStatus: updated.status === "pending-map" ? "awaiting-aar" : "aar-submitted",
      },
    });
    await syncMissionLifecycleFromEventState(updated.eventId);
  }

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "aar.edited",
    entityType: "Aar",
    entityId: updated.id,
    summary: `${updated.title} AAR updated.`,
    oldValue: {
      title: existing.title,
      status: existing.status,
      eventId: existing.eventId,
      campaignId: existing.campaignId,
      aarNextVersionRecommendation: existing.aarNextVersionRecommendation,
      aarProgressionRecommendation: existing.aarProgressionRecommendation,
      aarProgressionDecision: existing.aarProgressionDecision,
    },
    newValue: {
      title: updated.title,
      status: updated.status,
      eventId: updated.eventId,
      campaignId: updated.campaignId,
      aarNextVersionRecommendation: updated.aarNextVersionRecommendation,
      aarProgressionRecommendation: updated.aarProgressionRecommendation,
      aarProgressionDecision: updated.aarProgressionDecision,
    },
    reason: normalizeOptionalString(input.reason),
  });

  revalidateS3Routes({
    eventId: updated.eventId ?? existing.eventId,
    campaignId: updated.campaignId ?? existing.campaignId,
    unitKeys: Array.from(
      new Set([
        ...scope.unitKeys,
        existing.event?.hostUnit?.key ?? null,
        ...(existing.campaign?.events.map((event) => event.hostUnit?.key ?? null) ?? []),
      ].filter((unitKey): unitKey is string => Boolean(unitKey))),
    ),
  });
}

export async function reviewAar(
  aarId: string,
  status: string,
  input: ReviewAarInput = {},
) {
  const existing = await getAarRecord(aarId);

  if (!existing || existing.deletedAt) {
    throw new Error("AAR not found.");
  }

  if (!isAarStatus(status) || status === "draft") {
    throw new Error("Select a valid AAR review status.");
  }

  if (existing.event?.eventType !== "patrol") {
    throw new Error("Only Patrol AARs can be reviewed. Weekend Operations do not use AARs.");
  }

  if (
    status === "reviewed" &&
    !existing.attachments.some((attachment) => attachment.attachmentType === "map_screenshot")
  ) {
    throw new Error("A Patrol AAR cannot be reviewed until the required map screenshot is uploaded.");
  }

  const actor = await requireAnyScopedPermission(["aars.review", "patrols.aar.review", "s3.aars.review"], [
    existing.event?.hostUnitId,
    ...(existing.campaign?.events.map((event) => event.hostUnitId) ?? []),
  ]);
  const updated = await prisma.aar.update({
    where: { id: existing.id },
    data: {
      status,
      reviewedAt: status === "reviewed" ? new Date() : existing.reviewedAt,
      reviewedByUserId: actor.id,
      aarProgressionRecommendation: normalizeOptionalString(input.aarProgressionRecommendation),
      aarNextVersionRecommendation: normalizeOptionalString(input.aarNextVersionRecommendation),
      aarProgressionDecision: normalizeOptionalString(input.aarProgressionDecision),
      aarProgressionNotes: normalizeOptionalString(input.aarProgressionNotes),
      aarEnemyActivityNotes: normalizeOptionalString(input.aarEnemyActivityNotes),
      aarFriendlyActivityNotes: normalizeOptionalString(input.aarFriendlyActivityNotes),
      aarUnitPerformanceNotes: normalizeOptionalString(input.aarUnitPerformanceNotes),
      aarTaskingAdjustments: normalizeOptionalString(input.aarTaskingAdjustments),
      aarPlanningNotesNextWeek: normalizeOptionalString(input.aarPlanningNotesNextWeek),
      aarLessonsLearned: normalizeOptionalString(input.aarLessonsLearned),
    },
  });

  if (updated.eventId) {
    await prisma.event.update({
      where: { id: updated.eventId },
      data: {
        patrolStatus:
          status === "reviewed"
            ? "reviewed"
            : status === "pending-map"
              ? "awaiting-aar"
              : "aar-submitted",
      },
    });
    await syncMissionLifecycleFromEventState(updated.eventId);
  }

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "aar.reviewed",
    entityType: "Aar",
    entityId: updated.id,
    summary: `${updated.title} AAR reviewed.`,
    oldValue: {
      status: existing.status,
      reviewedAt: existing.reviewedAt?.toISOString() ?? null,
      aarNextVersionRecommendation: existing.aarNextVersionRecommendation,
      aarProgressionRecommendation: existing.aarProgressionRecommendation,
      aarProgressionDecision: existing.aarProgressionDecision,
      aarProgressionNotes: existing.aarProgressionNotes,
    },
    newValue: {
      status: updated.status,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      aarNextVersionRecommendation: updated.aarNextVersionRecommendation,
      aarProgressionRecommendation: updated.aarProgressionRecommendation,
      aarProgressionDecision: updated.aarProgressionDecision,
      aarProgressionNotes: updated.aarProgressionNotes,
    },
    reason: normalizeOptionalString(input.reason),
  });

  if (
    normalizeOptionalString(input.aarProgressionDecision) ||
    normalizeOptionalString(input.aarProgressionRecommendation) ||
    normalizeOptionalString(input.aarNextVersionRecommendation) ||
    normalizeOptionalString(input.aarPlanningNotesNextWeek)
  ) {
    await createAuditLogEntry({
      actorUserId: actor.id,
      action: "deployment.progression_recommendation_added",
      entityType: "Aar",
      entityId: updated.id,
      summary: `${updated.title} added deployment progression context.`,
      newValue: {
        aarNextVersionRecommendation: updated.aarNextVersionRecommendation,
        aarProgressionDecision: updated.aarProgressionDecision,
        aarProgressionRecommendation: updated.aarProgressionRecommendation,
        aarPlanningNotesNextWeek: updated.aarPlanningNotesNextWeek,
      },
      reason: normalizeOptionalString(input.reason),
    });
    await queueDeploymentProgressionRecommendedNotificationPlaceholder({
      actorUserId: actor.id,
      aarId: updated.id,
      eventTitle: existing.event?.title ?? updated.title,
      progressionDecision: updated.aarProgressionDecision,
      targetUnitId: existing.event?.hostUnitId ?? null,
    });
  }

  if (
    normalizeOptionalString(input.aarProgressionDecision) &&
    normalizeOptionalString(input.aarProgressionDecision) !== existing.aarProgressionDecision
  ) {
    await createAuditLogEntry({
      actorUserId: actor.id,
      action: "deployment.progression_decision_updated",
      entityType: "Aar",
      entityId: updated.id,
      summary: `${updated.title} progression decision updated.`,
      oldValue: {
        aarProgressionDecision: existing.aarProgressionDecision,
      },
      newValue: {
        aarProgressionDecision: updated.aarProgressionDecision,
      },
      reason: normalizeOptionalString(input.reason),
    });
  }

  await queueAarReviewedNotificationPlaceholder({
    actorUserId: actor.id,
    aarId: updated.id,
    eventTitle: existing.event?.title ?? updated.title,
    patrolLeaderName: existing.patrolLeaderName,
    statusLabel: status,
    targetUnitId: existing.event?.hostUnitId ?? null,
  });

  revalidateS3Routes({
    eventId: updated.eventId,
    campaignId: updated.campaignId,
    unitKeys: Array.from(
      new Set([
        existing.event?.hostUnit?.key ?? null,
        ...(existing.campaign?.events.map((event) => event.hostUnit?.key ?? null) ?? []),
      ].filter((unitKey): unitKey is string => Boolean(unitKey))),
    ),
  });
}

export async function linkAarToEvent(
  aarId: string,
  eventId: string,
  reason?: string | null,
) {
  const existing = await getAarRecord(aarId);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hostUnit: true,
    },
  });

  if (!existing || existing.deletedAt) {
    throw new Error("AAR not found.");
  }

  if (!event) {
    throw new Error("Event not found.");
  }

  const actor = await requireScopedS3Permission("s3.aars.submit", [event.hostUnitId]);

  await prisma.aar.update({
    where: { id: existing.id },
    data: {
      eventId: event.id,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "aar.event_linked",
    entityType: "Aar",
    entityId: existing.id,
    summary: `${existing.title} linked to ${event.title}.`,
    oldValue: {
      eventId: existing.eventId,
    },
    newValue: {
      eventId: event.id,
    },
    reason: normalizeOptionalString(reason),
  });

  await syncMissionLifecycleFromEventState(event.id);

  revalidateS3Routes({
    eventId: event.id,
    campaignId: existing.campaignId,
    unitKeys: event.hostUnit?.key ? [event.hostUnit.key] : [],
  });
}

export async function linkAarToCampaign(
  aarId: string,
  campaignId: string,
  reason?: string | null,
) {
  const existing = await getAarRecord(aarId);
  const scope = await getCampaignScope(campaignId);

  if (!existing || existing.deletedAt) {
    throw new Error("AAR not found.");
  }

  const actor = await requireScopedS3Permission("s3.aars.submit", scope.hostUnitIds);

  await prisma.aar.update({
    where: { id: existing.id },
    data: {
      campaignId,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "aar.campaign_linked",
    entityType: "Aar",
    entityId: existing.id,
    summary: `${existing.title} linked to campaign.`,
    oldValue: {
      campaignId: existing.campaignId,
    },
    newValue: {
      campaignId,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateS3Routes({
    eventId: existing.eventId,
    campaignId,
    unitKeys: scope.unitKeys,
  });
}
