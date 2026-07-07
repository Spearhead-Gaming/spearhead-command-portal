import { revalidatePath } from "next/cache";

import type { PortalUser } from "@/features/auth/types";
import { getCurrentUser, getPortalUserById } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import {
  queueAttendanceFinalizedNotificationPlaceholder,
  queueMissingAarNotificationPlaceholder,
} from "@/server/notifications/hooks";
import { can } from "@/server/permissions/access";
import type { FinalAttendanceStatusKey, RsvpStatusKey } from "@/server/attendance/types";
import { getEventAttendanceWorkspace } from "@/server/attendance/queries";
import {
  isFinalAttendanceStatus,
  isRsvpStatus,
  normalizeFilterValue,
} from "@/server/events/utils";

type UpdateRsvpInput = {
  eventId: string;
  memberProfileId?: string | null;
  rsvpStatus: RsvpStatusKey;
  reason?: string | null;
  source?: "portal" | "discord" | "staff";
};

type RecordAttendanceInput = {
  eventId: string;
  memberProfileId: string;
  finalStatus: FinalAttendanceStatusKey;
  notes?: string | null;
  reason?: string | null;
};

type BulkAttendanceUpdateInput = {
  eventId: string;
  updates: Array<{
    memberProfileId: string;
    rsvpStatus?: RsvpStatusKey | null;
    finalStatus?: FinalAttendanceStatusKey | null;
    notes?: string | null;
  }>;
  reason?: string | null;
};

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function revalidateAttendanceRoutes(input: {
  eventId: string;
  hostUnitKey?: string | null;
  memberProfileIds?: string[];
}) {
  revalidatePath("/operations/events");
  revalidatePath("/operations/attendance");
  revalidatePath(`/operations/events/${input.eventId}`);

  if (input.hostUnitKey) {
    revalidatePath(`/units/${input.hostUnitKey}`);
  }

  for (const memberProfileId of input.memberProfileIds ?? []) {
    revalidatePath(`/personnel/members/${memberProfileId}`);
  }
}

async function getAttendanceContext(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hostUnit: true,
      attendanceRecords: true,
      aars: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    },
  });
}

async function assertEventScopedPermission(
  permissionKey: string,
  eventId: string,
  options?: {
    allowSelfRsvp?: boolean;
    targetMemberProfileId?: string | null;
  },
) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  return assertEventScopedPermissionForActor(actor, permissionKey, eventId, options);
}

async function assertEventScopedPermissionForActor(
  actor: PortalUser,
  permissionKey: string,
  eventId: string,
  options?: {
    allowSelfRsvp?: boolean;
    targetMemberProfileId?: string | null;
  },
) {
  const event = await getAttendanceContext(eventId);

  if (!event) {
    throw new Error("Event not found.");
  }

  if (
    options?.allowSelfRsvp &&
    options.targetMemberProfileId &&
    actor.memberProfileId === options.targetMemberProfileId &&
    can(actor, "attendance.rsvp.view") &&
    (can(actor, "events.view", { unitId: event.hostUnitId }) || can(actor, "events.view"))
  ) {
    return { actor, event };
  }

  if (!can(actor, permissionKey, { unitId: event.hostUnitId }) && !can(actor, permissionKey)) {
    throw new Error("You do not have permission to manage attendance for this event.");
  }

  return { actor, event };
}

function getRsvpAuditAction(input: {
  actor: PortalUser;
  resolvedMemberProfileId: string;
  source: NonNullable<UpdateRsvpInput["source"]>;
}) {
  if (input.resolvedMemberProfileId !== input.actor.memberProfileId) {
    return "attendance.rsvp.staff_changed";
  }

  if (input.source === "discord") {
    return "attendance.rsvp.discord_changed";
  }

  return "attendance.rsvp.portal_changed";
}

async function upsertAttendanceRecord(input: {
  actorUserId: string;
  eventId: string;
  memberProfileId: string;
  rsvpStatus?: RsvpStatusKey | null;
  finalStatus?: FinalAttendanceStatusKey | null;
  notes?: string | null;
  setRespondedAt?: boolean;
  setRecordedAt?: boolean;
}) {
  return prisma.attendanceRecord.upsert({
    where: {
      eventId_memberProfileId: {
        eventId: input.eventId,
        memberProfileId: input.memberProfileId,
      },
    },
    update: {
      ...(input.rsvpStatus !== undefined ? { rsvpStatus: input.rsvpStatus } : {}),
      ...(input.finalStatus !== undefined ? { finalStatus: input.finalStatus } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.setRespondedAt ? { respondedAt: new Date() } : {}),
      ...(input.setRecordedAt ? { recordedAt: new Date() } : {}),
      recordedByUserId: input.actorUserId,
    },
    create: {
      eventId: input.eventId,
      memberProfileId: input.memberProfileId,
      rsvpStatus: input.rsvpStatus ?? null,
      finalStatus: input.finalStatus ?? null,
      notes: input.notes ?? null,
      respondedAt: input.setRespondedAt ? new Date() : null,
      recordedAt: input.setRecordedAt ? new Date() : null,
      recordedByUserId: input.actorUserId,
    },
  });
}

export async function updateRsvp(input: UpdateRsvpInput) {
  if (!isRsvpStatus(input.rsvpStatus)) {
    throw new Error("Select a valid RSVP status.");
  }

  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  await updateRsvpForActor(actor, input);
}

async function updateRsvpForActor(actor: PortalUser, input: UpdateRsvpInput) {
  const targetMemberProfileId = normalizeFilterValue(input.memberProfileId);
  const { event } = await assertEventScopedPermissionForActor(
    actor,
    "attendance.rsvp.manage",
    input.eventId,
    {
      allowSelfRsvp: true,
      targetMemberProfileId,
    },
  );
  const resolvedMemberProfileId = targetMemberProfileId ?? actor.memberProfileId;

  if (!resolvedMemberProfileId) {
    throw new Error("A linked member profile is required to RSVP.");
  }

  if (
    event.status === "cancelled" ||
    event.status === "completed" ||
    event.status === "archived"
  ) {
    throw new Error("RSVP is closed for this event.");
  }

  const existing = event.attendanceRecords.find(
    (record) => record.memberProfileId === resolvedMemberProfileId,
  );

  if (
    existing?.lockedAt &&
    !can(actor, "attendance.override", { unitId: event.hostUnitId }) &&
    !can(actor, "attendance.override")
  ) {
    throw new Error("Attendance is locked for this event.");
  }

  const updated = await upsertAttendanceRecord({
    actorUserId: actor.id,
    eventId: input.eventId,
    memberProfileId: resolvedMemberProfileId,
    rsvpStatus: input.rsvpStatus,
    notes: existing?.notes ?? null,
    setRespondedAt: true,
  });

  if ((existing?.rsvpStatus ?? null) !== updated.rsvpStatus) {
    await createAuditLogEntry({
      actorUserId: actor.id,
      action: getRsvpAuditAction({
        actor,
        resolvedMemberProfileId,
        source: input.source ?? "portal",
      }),
      entityType: "AttendanceRecord",
      entityId: updated.id,
      summary:
        resolvedMemberProfileId === actor.memberProfileId
          ? `RSVP updated for ${event.title}.`
          : `RSVP updated by staff for ${event.title}.`,
      oldValue: {
        rsvpStatus: existing?.rsvpStatus ?? null,
      },
      newValue: {
        rsvpStatus: updated.rsvpStatus,
      },
      reason: normalizeOptionalString(input.reason),
    });
  }

  revalidateAttendanceRoutes({
    eventId: event.id,
    hostUnitKey: event.hostUnit?.key ?? null,
    memberProfileIds: [resolvedMemberProfileId],
  });

  return {
    event,
    record: updated,
    resolvedMemberProfileId,
  };
}

export async function updateRsvpFromDiscord(input: {
  discordUserId: string;
  eventId: string;
  reason?: string | null;
  rsvpStatus: RsvpStatusKey;
}) {
  const linkedUser = await prisma.user.findUnique({
    where: {
      discordId: input.discordUserId,
    },
    select: {
      id: true,
    },
  });

  if (!linkedUser) {
    throw new Error("Your Discord account is not linked to a portal user.");
  }

  const actor = await getPortalUserById(linkedUser.id);

  if (!actor) {
    throw new Error("Your linked portal user could not be loaded.");
  }

  return updateRsvpForActor(actor, {
    eventId: input.eventId,
    memberProfileId: actor.memberProfileId,
    reason: input.reason,
    rsvpStatus: input.rsvpStatus,
    source: "discord",
  });
}

export async function recordFinalAttendance(input: RecordAttendanceInput) {
  if (!isFinalAttendanceStatus(input.finalStatus)) {
    throw new Error("Select a valid final attendance status.");
  }

  const { actor, event } = await assertEventScopedPermission("attendance.record", input.eventId);
  const existing = event.attendanceRecords.find(
    (record) => record.memberProfileId === input.memberProfileId,
  );

  if (existing?.lockedAt && !can(actor, "attendance.override", { unitId: event.hostUnitId })) {
    throw new Error("Attendance is locked for this event.");
  }

  if (
    existing?.finalStatus &&
    existing.lockedAt === null &&
    !can(actor, "attendance.edit", { unitId: event.hostUnitId }) &&
    !can(actor, "attendance.edit")
  ) {
    throw new Error("You do not have permission to edit recorded attendance.");
  }

  const updated = await upsertAttendanceRecord({
    actorUserId: actor.id,
    eventId: input.eventId,
    memberProfileId: input.memberProfileId,
    rsvpStatus: (existing?.rsvpStatus as RsvpStatusKey | null) ?? null,
    finalStatus: input.finalStatus,
    notes: normalizeOptionalString(input.notes),
    setRecordedAt: true,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: existing?.finalStatus ? "attendance.edited" : "attendance.recorded",
    entityType: "AttendanceRecord",
    entityId: updated.id,
    summary: `Final attendance recorded for ${event.title}.`,
    oldValue: {
      finalStatus: existing?.finalStatus ?? null,
      notes: existing?.notes ?? null,
    },
    newValue: {
      finalStatus: updated.finalStatus,
      notes: updated.notes,
    },
    reason: normalizeOptionalString(input.reason),
  });

  await queueAttendanceFinalizedNotificationPlaceholder({
    actorUserId: actor.id,
    eventId: event.id,
    eventTitle: event.title,
    summary: `${event.title} attendance was finalized and locked by staff.`,
    targetUnitId: event.hostUnitId,
  });

  if (event.eventType === "patrol" && event.aars.length === 0) {
    await queueMissingAarNotificationPlaceholder({
      actorUserId: actor.id,
      missionTitle: event.title,
    });
  }

  revalidateAttendanceRoutes({
    eventId: event.id,
    hostUnitKey: event.hostUnit?.key ?? null,
    memberProfileIds: [input.memberProfileId],
  });
}

export async function bulkUpdateAttendance(input: BulkAttendanceUpdateInput) {
  const { actor, event } = await assertEventScopedPermission("attendance.record", input.eventId);
  const overrideAllowed =
    can(actor, "attendance.override", { unitId: event.hostUnitId }) ||
    can(actor, "attendance.override");
  const editAllowed =
    can(actor, "attendance.edit", { unitId: event.hostUnitId }) ||
    can(actor, "attendance.edit");
  const manageRsvpAllowed =
    can(actor, "attendance.rsvp.manage", { unitId: event.hostUnitId }) ||
    can(actor, "attendance.rsvp.manage");
  const touchedMembers = new Set<string>();

  for (const update of input.updates) {
    const existing = event.attendanceRecords.find(
      (record) => record.memberProfileId === update.memberProfileId,
    );
    const nextRsvpStatus = update.rsvpStatus ?? (existing?.rsvpStatus as RsvpStatusKey | null) ?? null;
    const nextFinalStatus =
      update.finalStatus ?? (existing?.finalStatus as FinalAttendanceStatusKey | null) ?? null;
    const nextNotes = normalizeOptionalString(update.notes) ?? null;

    if (existing?.lockedAt && !overrideAllowed) {
      throw new Error("One or more attendance rows are locked.");
    }

    if (
      update.rsvpStatus !== undefined &&
      update.rsvpStatus !== existing?.rsvpStatus &&
      !manageRsvpAllowed
    ) {
      throw new Error("You do not have permission to manage RSVP status.");
    }

    if (
      update.finalStatus !== undefined &&
      update.finalStatus !== existing?.finalStatus &&
      existing?.finalStatus &&
      !editAllowed &&
      !overrideAllowed
    ) {
      throw new Error("You do not have permission to edit recorded attendance.");
    }

    if (
      nextRsvpStatus === (existing?.rsvpStatus as RsvpStatusKey | null) &&
      nextFinalStatus === (existing?.finalStatus as FinalAttendanceStatusKey | null) &&
      nextNotes === (existing?.notes ?? null)
    ) {
      continue;
    }

    const updated = await upsertAttendanceRecord({
      actorUserId: actor.id,
      eventId: input.eventId,
      memberProfileId: update.memberProfileId,
      rsvpStatus: nextRsvpStatus,
      finalStatus: nextFinalStatus,
      notes: nextNotes,
      setRespondedAt: update.rsvpStatus !== undefined,
      setRecordedAt: update.finalStatus !== undefined,
    });

    if (update.rsvpStatus !== undefined && update.rsvpStatus !== existing?.rsvpStatus) {
      await createAuditLogEntry({
        actorUserId: actor.id,
        action: "attendance.rsvp.staff_changed",
        entityType: "AttendanceRecord",
        entityId: updated.id,
        summary: `RSVP updated by staff for ${event.title}.`,
        oldValue: {
          rsvpStatus: existing?.rsvpStatus ?? null,
        },
        newValue: {
          rsvpStatus: updated.rsvpStatus,
        },
        reason: normalizeOptionalString(input.reason),
      });
    }

    if (update.finalStatus !== undefined && update.finalStatus !== existing?.finalStatus) {
      await createAuditLogEntry({
        actorUserId: actor.id,
        action: existing?.lockedAt ? "attendance.overridden" : existing?.finalStatus ? "attendance.edited" : "attendance.recorded",
        entityType: "AttendanceRecord",
        entityId: updated.id,
        summary: `Final attendance updated for ${event.title}.`,
        oldValue: {
          finalStatus: existing?.finalStatus ?? null,
          notes: existing?.notes ?? null,
        },
        newValue: {
          finalStatus: updated.finalStatus,
          notes: updated.notes,
        },
        reason: normalizeOptionalString(input.reason),
      });
    }

    touchedMembers.add(update.memberProfileId);
  }

  revalidateAttendanceRoutes({
    eventId: event.id,
    hostUnitKey: event.hostUnit?.key ?? null,
    memberProfileIds: Array.from(touchedMembers),
  });
}

export async function lockAttendance(eventId: string, reason?: string | null) {
  const { actor, event } = await assertEventScopedPermission("attendance.lock", eventId);
  const workspace = await getEventAttendanceWorkspace(eventId);

  if (!workspace) {
    throw new Error("Attendance workspace not found.");
  }

  const pendingRows = workspace.rows.filter((row) => row.finalStatus === null);

  if (pendingRows.length > 0) {
    throw new Error(`Record final attendance for ${pendingRows.length} member(s) before locking.`);
  }

  await prisma.attendanceRecord.updateMany({
    where: {
      eventId,
      lockedAt: null,
    },
    data: {
      lockedAt: new Date(),
      recordedByUserId: actor.id,
    },
  });

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: event.status === "archived" ? event.status : "completed",
      missionStatus: event.status === "archived" ? "archived" : "completed",
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "attendance.locked",
    entityType: "Event",
    entityId: event.id,
    summary: `${event.title} attendance locked.`,
    oldValue: {
      status: event.status,
    },
    newValue: {
      status: event.status === "archived" ? event.status : "completed",
      missionStatus: event.status === "archived" ? "archived" : "completed",
      locked: true,
    },
    reason: normalizeOptionalString(reason),
  });

  revalidateAttendanceRoutes({
    eventId: event.id,
    hostUnitKey: event.hostUnit?.key ?? null,
    memberProfileIds: workspace.rows.map((row) => row.memberProfileId),
  });
}
