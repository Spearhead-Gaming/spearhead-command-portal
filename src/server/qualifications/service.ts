import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { prisma } from "@/server/database/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { can, requirePermission } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel";
import {
  queueQualificationAwardedNotificationPlaceholder,
  queueQualificationRevokedNotificationPlaceholder,
  queueQualificationSignoffRequiredNotificationPlaceholder,
} from "@/server/notifications/hooks";

type CreateQualificationInput = {
  key: string;
  label: string;
  description?: string | null;
  categoryId: string;
  expiresAfterDays?: number | null;
  reason?: string | null;
};

type UpdateQualificationInput = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  categoryId: string;
  expiresAfterDays?: number | null;
  reason?: string | null;
};

type AwardQualificationInput = {
  memberProfileId: string;
  qualificationId: string;
  status?: "qualified" | "pending_signoff";
  awardedAt?: Date | null;
  expiresAt?: Date | null;
  notes?: string | null;
  reason?: string | null;
};

type UpdateMemberQualificationInput = {
  recordId: string;
  status?: "qualified" | "pending_signoff";
  awardedAt?: Date | null;
  expiresAt?: Date | null;
  notes?: string | null;
  reason?: string | null;
};

type RevokeQualificationInput = {
  recordId: string;
  revokedAt?: Date | null;
  reason?: string | null;
};

type ManageRequirementInput = {
  qualificationId: string;
  unitId?: string | null;
  positionId?: string | null;
  isRequired?: boolean;
  dueWithinDays?: number | null;
  notes?: string | null;
  reason?: string | null;
};

type CompleteQualificationSignoffInput = {
  recordId: string;
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

function normalizeQualificationRecordStatus(value?: string | null) {
  return value === "pending_signoff" ? "pending_signoff" : "qualified";
}

function revalidateQualificationRoutes(input?: {
  memberProfileId?: string | null;
  unitKey?: string | null;
}) {
  revalidatePath("/personnel/qualifications");
  revalidatePath("/training/qualification-matrix");

  if (input?.memberProfileId) {
    revalidatePath(`/personnel/members/${input.memberProfileId}`);
    revalidatePath("/personnel/members");
    revalidatePath("/personnel/roster");
  }

  if (input?.unitKey) {
    revalidatePath(`/units/${input.unitKey}`);
  }
}

export async function createQualification(input: CreateQualificationInput) {
  const actor = await requirePermission("qualifications.create");
  const qualification = await prisma.qualification.create({
    data: {
      key: normalizeRequiredString(input.key, "Qualification key"),
      label: normalizeRequiredString(input.label, "Qualification label"),
      description: normalizeOptionalString(input.description),
      categoryId: input.categoryId,
      expiresAfterDays: input.expiresAfterDays ?? null,
      isActive: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "qualifications.catalog.created",
    entityType: "Qualification",
    entityId: qualification.id,
    summary: `${qualification.label} qualification created.`,
    newValue: {
      key: qualification.key,
      label: qualification.label,
      categoryId: qualification.categoryId,
      expiresAfterDays: qualification.expiresAfterDays,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateQualificationRoutes();

  return qualification;
}

export async function editQualification(input: UpdateQualificationInput) {
  const actor = await requirePermission("qualifications.edit");
  const existing = await prisma.qualification.findUniqueOrThrow({
    where: { id: input.id },
  });

  const qualification = await prisma.qualification.update({
    where: { id: input.id },
    data: {
      key: normalizeRequiredString(input.key, "Qualification key"),
      label: normalizeRequiredString(input.label, "Qualification label"),
      description: normalizeOptionalString(input.description),
      categoryId: input.categoryId,
      expiresAfterDays: input.expiresAfterDays ?? null,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "qualifications.catalog.updated",
    entityType: "Qualification",
    entityId: qualification.id,
    summary: `${qualification.label} qualification updated.`,
    oldValue: {
      key: existing.key,
      label: existing.label,
      description: existing.description,
      categoryId: existing.categoryId,
      expiresAfterDays: existing.expiresAfterDays,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      key: qualification.key,
      label: qualification.label,
      description: qualification.description,
      categoryId: qualification.categoryId,
      expiresAfterDays: qualification.expiresAfterDays,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateQualificationRoutes();

  return qualification;
}

export async function archiveQualification(qualificationId: string, reason?: string | null) {
  const actor = await requirePermission("qualifications.archive");
  const existing = await prisma.qualification.findUniqueOrThrow({
    where: { id: qualificationId },
  });

  const qualification = await prisma.qualification.update({
    where: { id: qualificationId },
    data: {
      isActive: false,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "qualifications.catalog.archived",
    entityType: "Qualification",
    entityId: qualification.id,
    summary: `${qualification.label} qualification archived.`,
    oldValue: {
      isActive: existing.isActive,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      isActive: qualification.isActive,
    } satisfies Prisma.InputJsonObject,
    reason: reason ?? null,
  });

  revalidateQualificationRoutes();
}

export async function awardQualification(input: AwardQualificationInput) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const member = await prisma.memberProfile.findUniqueOrThrow({
    where: { id: input.memberProfileId },
    include: {
      currentUnit: true,
      user: {
        select: {
          id: true,
          displayName: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (
    !can(
      actor,
      "qualifications.record.award",
      member.currentUnitId ? { unitId: member.currentUnitId } : undefined,
    ) &&
    !can(actor, "qualifications.record.award")
  ) {
    throw new Error("You do not have permission to award qualifications for this member.");
  }

  const latestRecord = await prisma.memberQualification.findFirst({
    where: {
      memberProfileId: input.memberProfileId,
      qualificationId: input.qualificationId,
    },
    orderBy: [{ updatedAt: "desc" }, { awardedAt: "desc" }],
  });

  const awardedAt = input.awardedAt ?? new Date();
  const nextStatus = normalizeQualificationRecordStatus(input.status);

  const nextExpiresAt =
    input.expiresAt ??
    (await prisma.qualification
      .findUnique({
        where: { id: input.qualificationId },
        select: { expiresAfterDays: true, label: true },
      })
      .then((qualification) => {
        if (!qualification) {
          throw new Error("Qualification not found.");
        }

        if (!qualification.expiresAfterDays) {
          return null;
        }

        const expiresAt = new Date(awardedAt);
        expiresAt.setDate(expiresAt.getDate() + qualification.expiresAfterDays);

        return expiresAt;
      }));

  const record =
    latestRecord && !latestRecord.revokedAt
      ? await prisma.memberQualification.update({
          where: { id: latestRecord.id },
          data: {
            awardedByUserId: actor.id,
            awardedAt,
            expiresAt: nextExpiresAt,
            revokedAt: null,
            status: nextStatus,
            notes: normalizeOptionalString(input.notes),
          },
        })
      : await prisma.memberQualification.create({
          data: {
            memberProfileId: input.memberProfileId,
            qualificationId: input.qualificationId,
            awardedByUserId: actor.id,
            status: nextStatus,
            awardedAt,
            expiresAt: nextExpiresAt,
            notes: normalizeOptionalString(input.notes),
          },
        });

  const qualification = await prisma.qualification.findUniqueOrThrow({
    where: { id: input.qualificationId },
    select: {
      label: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "qualifications.record.awarded",
    entityType: "MemberQualification",
    entityId: record.id,
    summary: `${getMemberDisplayName(member)} qualification awarded.`,
    oldValue: latestRecord
      ? ({
          awardedAt: latestRecord.awardedAt.toISOString(),
          expiresAt: latestRecord.expiresAt?.toISOString() ?? null,
          revokedAt: latestRecord.revokedAt?.toISOString() ?? null,
        } satisfies Prisma.InputJsonObject)
      : null,
    newValue: {
      memberProfileId: record.memberProfileId,
      qualificationId: record.qualificationId,
      status: record.status,
      awardedAt: record.awardedAt.toISOString(),
      expiresAt: record.expiresAt?.toISOString() ?? null,
      revokedAt: record.revokedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  if (nextStatus === "pending_signoff") {
    await queueQualificationSignoffRequiredNotificationPlaceholder({
      actorUserId: actor.id,
      memberName: getMemberDisplayName(member),
      qualificationLabel: qualification.label,
      recipientUserIds: member.user?.id ? [member.user.id] : [],
    });
  } else {
    await queueQualificationAwardedNotificationPlaceholder({
      actorUserId: actor.id,
      memberName: getMemberDisplayName(member),
      qualificationLabel: qualification.label,
      recipientUserIds: member.user?.id ? [member.user.id] : [],
      targetUnitId: member.currentUnitId,
    });
  }

  revalidateQualificationRoutes({
    memberProfileId: member.id,
    unitKey: member.currentUnit?.key ?? null,
  });

  return record;
}

export async function updateQualificationRecord(input: UpdateMemberQualificationInput) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const existing = await prisma.memberQualification.findUniqueOrThrow({
    where: { id: input.recordId },
    include: {
      memberProfile: {
        include: {
          currentUnit: true,
          user: true,
        },
      },
    },
  });

  if (
    !can(
      actor,
      "qualifications.record.edit",
      existing.memberProfile.currentUnitId
        ? { unitId: existing.memberProfile.currentUnitId }
        : undefined,
    ) &&
    !can(actor, "qualifications.record.edit")
  ) {
    throw new Error("You do not have permission to edit this qualification record.");
  }

  const updated = await prisma.memberQualification.update({
    where: { id: input.recordId },
    data: {
      status:
        input.status === undefined
          ? existing.status
          : normalizeQualificationRecordStatus(input.status),
      awardedAt: input.awardedAt ?? existing.awardedAt,
      expiresAt:
        input.expiresAt === undefined ? existing.expiresAt : input.expiresAt ?? null,
      notes: input.notes === undefined ? existing.notes : normalizeOptionalString(input.notes),
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "qualifications.record.updated",
    entityType: "MemberQualification",
    entityId: updated.id,
    summary: `${getMemberDisplayName(existing.memberProfile)} qualification record updated.`,
    oldValue: {
      status: existing.status,
      awardedAt: existing.awardedAt.toISOString(),
      expiresAt: existing.expiresAt?.toISOString() ?? null,
      notes: existing.notes,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      status: updated.status,
      awardedAt: updated.awardedAt.toISOString(),
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      notes: updated.notes,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateQualificationRoutes({
    memberProfileId: existing.memberProfileId,
    unitKey: existing.memberProfile.currentUnit?.key ?? null,
  });
}

export async function revokeQualification(input: RevokeQualificationInput) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const existing = await prisma.memberQualification.findUniqueOrThrow({
    where: { id: input.recordId },
    include: {
      memberProfile: {
        include: {
          currentUnit: true,
          user: {
            select: {
              id: true,
              displayName: true,
              name: true,
              email: true,
            },
          },
        },
      },
      qualification: true,
    },
  });

  if (
    !can(
      actor,
      "qualifications.record.revoke",
      existing.memberProfile.currentUnitId
        ? { unitId: existing.memberProfile.currentUnitId }
        : undefined,
    ) &&
    !can(actor, "qualifications.record.revoke")
  ) {
    throw new Error("You do not have permission to revoke this qualification.");
  }

  const revokedAt = input.revokedAt ?? new Date();
  const updated = await prisma.memberQualification.update({
    where: { id: input.recordId },
    data: {
      revokedAt,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "qualifications.record.revoked",
    entityType: "MemberQualification",
    entityId: updated.id,
    summary: `${getMemberDisplayName(existing.memberProfile)} qualification revoked.`,
    oldValue: {
      revokedAt: existing.revokedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      revokedAt: revokedAt.toISOString(),
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  await queueQualificationRevokedNotificationPlaceholder({
    actorUserId: actor.id,
    memberName: getMemberDisplayName(existing.memberProfile),
    qualificationLabel: existing.qualification.label,
    recipientUserIds: existing.memberProfile.user?.id ? [existing.memberProfile.user.id] : [],
    targetUnitId: existing.memberProfile.currentUnitId,
  });

  revalidateQualificationRoutes({
    memberProfileId: existing.memberProfileId,
    unitKey: existing.memberProfile.currentUnit?.key ?? null,
  });
}

export async function completeQualificationSignoff(
  input: CompleteQualificationSignoffInput,
) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const existing = await prisma.memberQualification.findUniqueOrThrow({
    where: { id: input.recordId },
    include: {
      memberProfile: {
        include: {
          currentUnit: true,
          user: {
            select: {
              id: true,
              displayName: true,
              name: true,
              email: true,
            },
          },
        },
      },
      qualification: true,
    },
  });

  if (
    !can(
      actor,
      "qualifications.signoff.manage",
      existing.memberProfile.currentUnitId
        ? { unitId: existing.memberProfile.currentUnitId }
        : undefined,
    ) &&
    !can(actor, "qualifications.signoff.manage")
  ) {
    throw new Error("You do not have permission to complete this qualification sign-off.");
  }

  const updated = await prisma.memberQualification.update({
    where: { id: input.recordId },
    data: {
      status: "qualified",
      revokedAt: null,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "qualifications.record.signoff_completed",
    entityType: "MemberQualification",
    entityId: updated.id,
    summary: `${getMemberDisplayName(existing.memberProfile)} qualification sign-off completed.`,
    oldValue: {
      status: existing.status,
      revokedAt: existing.revokedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      status: updated.status,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  await queueQualificationAwardedNotificationPlaceholder({
    actorUserId: actor.id,
    memberName: getMemberDisplayName(existing.memberProfile),
    qualificationLabel: existing.qualification.label,
    recipientUserIds: existing.memberProfile.user?.id ? [existing.memberProfile.user.id] : [],
    targetUnitId: existing.memberProfile.currentUnitId,
  });

  revalidateQualificationRoutes({
    memberProfileId: existing.memberProfileId,
    unitKey: existing.memberProfile.currentUnit?.key ?? null,
  });

  return updated;
}

export async function manageQualificationRequirement(input: ManageRequirementInput) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  if (!input.unitId && !input.positionId) {
    throw new Error("A unit or position is required.");
  }

  let scopeUnitId = input.unitId ?? null;

  if (input.positionId && !scopeUnitId) {
    const position = await prisma.position.findUniqueOrThrow({
      where: { id: input.positionId },
    });
    scopeUnitId = position.unitId;
  }

  if (
    !can(
      actor,
      "qualifications.requirements.manage",
      scopeUnitId ? { unitId: scopeUnitId } : undefined,
    ) &&
    !can(actor, "qualifications.requirements.manage")
  ) {
    throw new Error("You do not have permission to manage qualification requirements here.");
  }

  const existing = await prisma.qualificationRequirement.findFirst({
    where: {
      qualificationId: input.qualificationId,
      unitId: input.unitId ?? null,
      positionId: input.positionId ?? null,
    },
  });

  const requirement = existing
    ? await prisma.qualificationRequirement.update({
        where: { id: existing.id },
        data: {
          isRequired: input.isRequired ?? true,
          dueWithinDays: input.dueWithinDays ?? null,
          notes: normalizeOptionalString(input.notes),
        },
      })
    : await prisma.qualificationRequirement.create({
        data: {
          qualificationId: input.qualificationId,
          unitId: input.unitId ?? null,
          positionId: input.positionId ?? null,
          isRequired: input.isRequired ?? true,
          dueWithinDays: input.dueWithinDays ?? null,
          notes: normalizeOptionalString(input.notes),
        },
      });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: existing
      ? "qualifications.requirement.updated"
      : "qualifications.requirement.created",
    entityType: "QualificationRequirement",
    entityId: requirement.id,
    summary: existing
      ? "Qualification requirement updated."
      : "Qualification requirement added.",
    oldValue: existing
      ? ({
          unitId: existing.unitId,
          positionId: existing.positionId,
          isRequired: existing.isRequired,
          dueWithinDays: existing.dueWithinDays,
          notes: existing.notes,
        } satisfies Prisma.InputJsonObject)
      : null,
    newValue: {
      unitId: requirement.unitId,
      positionId: requirement.positionId,
      isRequired: requirement.isRequired,
      dueWithinDays: requirement.dueWithinDays,
      notes: requirement.notes,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateQualificationRoutes();
}

export async function removeQualificationRequirement(requirementId: string, reason?: string | null) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const existing = await prisma.qualificationRequirement.findUniqueOrThrow({
    where: { id: requirementId },
    include: {
      position: true,
    },
  });

  const scopeUnitId = existing.unitId ?? existing.position?.unitId ?? null;

  if (
    !can(
      actor,
      "qualifications.requirements.manage",
      scopeUnitId ? { unitId: scopeUnitId } : undefined,
    ) &&
    !can(actor, "qualifications.requirements.manage")
  ) {
    throw new Error("You do not have permission to remove this requirement.");
  }

  await prisma.qualificationRequirement.delete({
    where: { id: requirementId },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "qualifications.requirement.removed",
    entityType: "QualificationRequirement",
    entityId: requirementId,
    summary: "Qualification requirement removed.",
    oldValue: {
      qualificationId: existing.qualificationId,
      unitId: existing.unitId,
      positionId: existing.positionId,
      isRequired: existing.isRequired,
      notes: existing.notes,
    } satisfies Prisma.InputJsonObject,
    reason: reason ?? null,
  });

  revalidateQualificationRoutes();
}
