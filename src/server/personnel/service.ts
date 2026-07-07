import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { getCurrentUser } from "@/server/auth/current-user";
import { can, requirePermission } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel/display-name";
import {
  createOrUpdatePrimaryRosterAssignment,
  resolvePositionIdForAssignment,
} from "@/server/roster/service";

type CreateMemberProfileInput = {
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  callsign?: string | null;
  joinDate?: Date | null;
  statusId: string;
  rankId?: string | null;
  unitId?: string | null;
  positionId?: string | null;
  positionTitle?: string | null;
  reason?: string | null;
};

type UpdateMemberProfileInput = {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  callsign?: string | null;
  joinDate?: Date | null;
  reason?: string | null;
};

type ChangeRankInput = {
  memberProfileId: string;
  rankId: string | null;
  reason?: string | null;
};

type ChangeUnitInput = {
  memberProfileId: string;
  unitId: string;
  rankId?: string | null;
  positionId?: string | null;
  positionTitle?: string | null;
  reason?: string | null;
};

type ChangePositionInput = {
  memberProfileId: string;
  unitId?: string | null;
  positionId?: string | null;
  positionTitle?: string | null;
  reason?: string | null;
};

type ChangeStatusInput = {
  memberProfileId: string;
  statusId: string;
  reason?: string | null;
};

function normalizeRequiredString(value: string, fieldLabel: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function coerceJoinDate(value?: Date | null) {
  return value ?? null;
}

async function getEditableProfileForPermission(
  id: string,
  permissionKey: string,
) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const profile = await prisma.memberProfile.findUniqueOrThrow({
    where: { id },
    include: {
      status: true,
      currentUnit: true,
      currentPosition: true,
      currentRank: true,
    },
  });

  if (
    !can(actor, permissionKey, profile.currentUnitId ? { unitId: profile.currentUnitId } : undefined) &&
    !can(actor, permissionKey)
  ) {
    throw new Error("You do not have permission to modify this member.");
  }

  return {
    actor,
    profile,
  };
}

function revalidatePersonnelRoutes(memberProfileId: string, unitKey?: string | null) {
  revalidatePath("/personnel/members");
  revalidatePath(`/personnel/members/${memberProfileId}`);
  revalidatePath("/personnel/roster");
  revalidatePath("/units");

  if (unitKey) {
    revalidatePath(`/units/${unitKey}`);
  }
}

export async function createMemberProfile(input: CreateMemberProfileInput) {
  const actor = await requirePermission("personnel.profile.create");
  const displayName = normalizeRequiredString(input.displayName, "Display name");
  const firstName = normalizeOptionalString(input.firstName);
  const lastName = normalizeOptionalString(input.lastName);
  const callsign = normalizeOptionalString(input.callsign);
  const joinDate = coerceJoinDate(input.joinDate);

  if (input.unitId && !can(actor, "roster.unit.assign", { unitId: input.unitId })) {
    throw new Error("You do not have permission to assign this unit.");
  }

  const positionId = input.unitId
    ? await resolvePositionIdForAssignment({
        unitId: input.unitId,
        positionId: input.positionId,
        positionTitle: input.positionTitle,
      })
    : null;

  const memberProfile = await prisma.memberProfile.create({
    data: {
      firstName,
      lastName,
      displayName,
      callsign,
      joinDate,
      statusId: input.statusId,
      rankId: input.rankId ?? null,
      currentUnitId: input.unitId ?? null,
      currentPositionId: positionId,
      isActive: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "personnel.profile.created",
    entityType: "MemberProfile",
    entityId: memberProfile.id,
    summary: `${displayName} profile created.`,
    newValue: {
      firstName,
      lastName,
      displayName,
      callsign,
      joinDate: joinDate?.toISOString() ?? null,
      statusId: input.statusId,
      rankId: input.rankId ?? null,
      unitId: input.unitId ?? null,
      positionId,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  if (input.unitId) {
    await createOrUpdatePrimaryRosterAssignment({
      actor,
      memberProfileId: memberProfile.id,
      unitId: input.unitId,
      rankId: input.rankId ?? null,
      positionId,
      reason: input.reason ?? "Initial roster assignment",
    });
  }

  const assignedUnit = input.unitId
    ? await prisma.unit.findUnique({
        where: { id: input.unitId },
        select: { key: true },
      })
    : null;

  revalidatePersonnelRoutes(memberProfile.id, assignedUnit?.key ?? null);

  return memberProfile;
}

export async function updateMemberProfile(input: UpdateMemberProfileInput) {
  const { actor, profile } = await getEditableProfileForPermission(
    input.id,
    "personnel.profile.edit",
  );

  const updatedProfile = await prisma.memberProfile.update({
    where: { id: input.id },
    data: {
      displayName: normalizeRequiredString(input.displayName, "Display name"),
      firstName: normalizeOptionalString(input.firstName),
      lastName: normalizeOptionalString(input.lastName),
      callsign: normalizeOptionalString(input.callsign),
      joinDate: coerceJoinDate(input.joinDate),
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "personnel.profile.updated",
    entityType: "MemberProfile",
    entityId: profile.id,
    summary: `${getMemberDisplayName(profile)} profile details updated.`,
    oldValue: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      callsign: profile.callsign,
      joinDate: profile.joinDate?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      firstName: updatedProfile.firstName,
      lastName: updatedProfile.lastName,
      displayName: updatedProfile.displayName,
      callsign: updatedProfile.callsign,
      joinDate: updatedProfile.joinDate?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidatePersonnelRoutes(profile.id, profile.currentUnit?.key ?? null);

  return updatedProfile;
}

export async function changeRank(input: ChangeRankInput) {
  const { actor, profile } = await getEditableProfileForPermission(
    input.memberProfileId,
    "roster.rank.change",
  );

  const activeUnitId = profile.currentUnitId;

  if (activeUnitId && !can(actor, "roster.rank.change", { unitId: activeUnitId }) && !can(actor, "roster.rank.change")) {
    throw new Error("You do not have permission to change this rank.");
  }

  await createOrUpdatePrimaryRosterAssignment({
    actor,
    memberProfileId: profile.id,
    unitId: profile.currentUnitId ?? (() => { throw new Error("Assign a unit before changing rank."); })(),
    rankId: input.rankId,
    positionId: profile.currentPositionId,
    reason: input.reason ?? "Rank change",
  });

  const nextRank = input.rankId
    ? await prisma.rank.findUnique({ where: { id: input.rankId } })
    : null;

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "roster.rank.changed",
    entityType: "MemberProfile",
    entityId: profile.id,
    summary: `${getMemberDisplayName(profile)} rank changed.`,
    oldValue: {
      rankId: profile.rankId,
      rankLabel: profile.currentRank?.abbreviation ?? null,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      rankId: input.rankId,
      rankLabel: nextRank?.abbreviation ?? null,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidatePersonnelRoutes(profile.id, profile.currentUnit?.key ?? null);
}

export async function changeUnit(input: ChangeUnitInput) {
  const { actor, profile } = await getEditableProfileForPermission(
    input.memberProfileId,
    "roster.unit.assign",
  );

  const allowedForCurrent =
    profile.currentUnitId &&
    can(actor, "roster.unit.assign", { unitId: profile.currentUnitId });
  const allowedForTarget = can(actor, "roster.unit.assign", { unitId: input.unitId });

  if (!allowedForCurrent && !allowedForTarget && !can(actor, "roster.unit.assign")) {
    throw new Error("You do not have permission to assign this unit.");
  }

  const positionId = await resolvePositionIdForAssignment({
    unitId: input.unitId,
    positionId: input.positionId,
    positionTitle: input.positionTitle,
  });

  await createOrUpdatePrimaryRosterAssignment({
    actor,
    memberProfileId: profile.id,
    unitId: input.unitId,
    rankId: input.rankId ?? profile.rankId,
    positionId,
    reason: input.reason ?? "Unit assignment change",
  });

  const nextUnit = await prisma.unit.findUniqueOrThrow({
    where: { id: input.unitId },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "roster.unit.changed",
    entityType: "MemberProfile",
    entityId: profile.id,
    summary: `${getMemberDisplayName(profile)} unit changed.`,
    oldValue: {
      unitId: profile.currentUnitId,
      unitLabel: profile.currentUnit?.name ?? null,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      unitId: nextUnit.id,
      unitLabel: nextUnit.name,
      positionId,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidatePersonnelRoutes(profile.id, nextUnit.key);
}

export async function changePosition(input: ChangePositionInput) {
  const { actor, profile } = await getEditableProfileForPermission(
    input.memberProfileId,
    "roster.position.assign",
  );

  const unitId = input.unitId ?? profile.currentUnitId;

  if (!unitId) {
    throw new Error("Assign a unit before assigning a position.");
  }

  if (!can(actor, "roster.position.assign", { unitId }) && !can(actor, "roster.position.assign")) {
    throw new Error("You do not have permission to assign this position.");
  }

  const positionId = await resolvePositionIdForAssignment({
    unitId,
    positionId: input.positionId,
    positionTitle: input.positionTitle,
  });

  await createOrUpdatePrimaryRosterAssignment({
    actor,
    memberProfileId: profile.id,
    unitId,
    rankId: profile.rankId,
    positionId,
    reason: input.reason ?? "Position assignment change",
  });

  const nextPosition = positionId
    ? await prisma.position.findUnique({
        where: { id: positionId },
      })
    : null;
  const nextUnit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "roster.position.changed",
    entityType: "MemberProfile",
    entityId: profile.id,
    summary: `${getMemberDisplayName(profile)} position changed.`,
    oldValue: {
      positionId: profile.currentPositionId,
      positionLabel: profile.currentPosition?.title ?? null,
      unitId: profile.currentUnitId,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      positionId,
      positionLabel: nextPosition?.title ?? null,
      unitId,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidatePersonnelRoutes(profile.id, nextUnit.key);
}

export async function changeStatus(input: ChangeStatusInput) {
  const { actor, profile } = await getEditableProfileForPermission(
    input.memberProfileId,
    "roster.status.change",
  );

  const nextStatus = await prisma.profileStatus.findUniqueOrThrow({
    where: { id: input.statusId },
  });

  await prisma.memberProfile.update({
    where: { id: profile.id },
    data: {
      statusId: input.statusId,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "personnel.profile.status_changed",
    entityType: "MemberProfile",
    entityId: profile.id,
    summary: `${getMemberDisplayName(profile)} status changed.`,
    oldValue: {
      statusId: profile.statusId,
      statusLabel: profile.status.label,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      statusId: nextStatus.id,
      statusLabel: nextStatus.label,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidatePersonnelRoutes(profile.id, profile.currentUnit?.key ?? null);
}
