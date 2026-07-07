import { Prisma } from "@prisma/client";

import type { PortalUser } from "@/features/auth/types";
import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { getCurrentUser } from "@/server/auth/current-user";
import { can } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel";

type PrimaryAssignmentInput = {
  actor: PortalUser;
  memberProfileId: string;
  unitId: string;
  rankId?: string | null;
  positionId?: string | null;
  reason?: string | null;
  effectiveAt?: Date;
};

function createPositionKey(unitKey: string, title: string) {
  return `${unitKey}-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export async function resolvePositionIdForAssignment(input: {
  unitId: string;
  positionId?: string | null;
  positionTitle?: string | null;
}) {
  if (input.positionId) {
    return input.positionId;
  }

  const normalizedTitle = input.positionTitle?.trim();

  if (!normalizedTitle) {
    return null;
  }

  const unit = await prisma.unit.findUniqueOrThrow({
    where: {
      id: input.unitId,
    },
  });

  const existingPosition = await prisma.position.findFirst({
    where: {
      unitId: input.unitId,
      title: normalizedTitle,
      isActive: true,
    },
  });

  if (existingPosition) {
    return existingPosition.id;
  }

  const createdPosition = await prisma.position.create({
    data: {
      key: createPositionKey(unit.key, normalizedTitle),
      title: normalizedTitle,
      unitId: input.unitId,
      isActive: true,
    },
  });

  return createdPosition.id;
}

export async function createOrUpdatePrimaryRosterAssignment({
  actor,
  memberProfileId,
  unitId,
  rankId = null,
  positionId = null,
  reason,
  effectiveAt = new Date(),
}: PrimaryAssignmentInput) {
  const memberProfile = await prisma.memberProfile.findUniqueOrThrow({
    where: { id: memberProfileId },
    include: {
      currentUnit: true,
      currentPosition: true,
      currentRank: true,
      rosterAssignments: {
        where: {
          isPrimary: true,
          endsAt: null,
        },
        orderBy: [{ startsAt: "desc" }],
        take: 1,
      },
    },
  });

  const currentUnitId = memberProfile.currentUnitId;
  const hasScopedAccess =
    can(actor, "roster.member.edit", currentUnitId ? { unitId: currentUnitId } : undefined) ||
    can(actor, "roster.member.edit", { unitId });

  if (!hasScopedAccess) {
    throw new Error("You do not have permission to manage this roster assignment.");
  }

  const activeAssignment = memberProfile.rosterAssignments[0] ?? null;
  const currentSignature = JSON.stringify({
    unitId: memberProfile.currentUnitId,
    positionId: memberProfile.currentPositionId,
    rankId: memberProfile.rankId,
  });
  const nextSignature = JSON.stringify({
    unitId,
    positionId,
    rankId,
  });

  if (currentSignature === nextSignature && activeAssignment) {
    return activeAssignment;
  }

  return prisma.$transaction(async (tx) => {
    if (activeAssignment) {
      await tx.rosterAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          endsAt: effectiveAt,
          updatedAt: effectiveAt,
        },
      });
    }

    const assignment = await tx.rosterAssignment.create({
      data: {
        memberProfileId,
        unitId,
        positionId,
        rankId,
        startsAt: effectiveAt,
        isPrimary: true,
      },
    });

    await tx.memberProfile.update({
      where: { id: memberProfileId },
      data: {
        currentUnitId: unitId,
        currentPositionId: positionId,
        rankId,
      },
    });

    await createAuditLogEntry({
      actorUserId: actor.id,
      action: activeAssignment ? "roster.assignment.changed" : "roster.assignment.created",
      entityType: "RosterAssignment",
      entityId: assignment.id,
      summary: `${getMemberDisplayName(memberProfile)} roster assignment ${
        activeAssignment ? "changed" : "created"
      }.`,
      oldValue: activeAssignment
        ? ({
            unitId: memberProfile.currentUnitId,
            positionId: memberProfile.currentPositionId,
            rankId: memberProfile.rankId,
          } satisfies Prisma.InputJsonObject)
        : null,
      newValue: {
        unitId,
        positionId,
        rankId,
      } satisfies Prisma.InputJsonObject,
      metadata: {
        memberProfileId,
      } satisfies Prisma.InputJsonObject,
      reason: reason ?? null,
    });

    return assignment;
  });
}

export async function getRosterActionActor() {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  return actor;
}
