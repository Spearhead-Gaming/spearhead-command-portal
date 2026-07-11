import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getMemberAttendanceSummary } from "@/server/attendance";
import { processCommunicationRequest } from "@/server/communications/pipeline";
import { prisma } from "@/server/database/client";
import { can, requirePermission } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel/display-name";
import type { PersonnelCenterData } from "@/server/personnel/center-types";
import {
  evaluateMemberReadinessRules,
  evaluateUnitReadinessRules,
} from "@/server/personnel/readiness-rules";
import { createOrUpdatePrimaryRosterAssignment } from "@/server/roster/service";
import { recordAuditEvent } from "@/server/services/audit-log-service";

function normalizeRequiredString(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized || null;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function revalidatePersonnelCenter() {
  revalidatePath("/personnel");
  revalidatePath("/personnel/members");
  revalidatePath("/personnel/roster");
  revalidatePath("/units");
}

async function getNextCaseNumber() {
  const year = new Date().getFullYear();
  const prefix = `SHG-${year}-`;
  const count = await prisma.communityCase.count({
    where: {
      caseNumber: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

async function createPersonnelReviewCase(input: {
  actorUserId: string;
  caseType: "TRANSFER_REVIEW" | "LOA_REVIEW" | "QUALIFICATION_EXCEPTION" | "PROFILE_CORRECTION";
  description: string;
  memberProfileId: string;
  summary: string;
  title: string;
}) {
  const member = await prisma.memberProfile.findUnique({
    where: {
      id: input.memberProfileId,
    },
  });

  return prisma.communityCase.create({
    data: {
      caseNumber: await getNextCaseNumber(),
      caseType: input.caseType,
      confidentiality: "restricted",
      createdByUserId: input.actorUserId,
      description: input.description,
      priority: "medium",
      relatedMemberId: input.memberProfileId,
      status: "open",
      summary: input.summary,
      title: input.title,
      timelineEntries: {
        create: {
          actorUserId: input.actorUserId,
          entryType: "personnel.case_created",
          title: `${input.caseType.toLowerCase().replaceAll("_", " ")} opened`,
        },
      },
      ...(member?.currentUnitId ? { owningUnitId: member.currentUnitId } : {}),
    },
  });
}

async function notifyUser(input: {
  body: string;
  idempotencyKey: string;
  requestedByUserId: string | null;
  title: string;
  type: string;
  userId: string | null | undefined;
}) {
  if (!input.userId) {
    return null;
  }

  return processCommunicationRequest({
    body: input.body,
    category: "personnel",
    idempotencyKey: input.idempotencyKey,
    priority: "normal",
    requestedByUserId: input.requestedByUserId,
    requestedChannels: [{ type: "portal" }],
    sourceEvent: input.type,
    sourceModule: "personnel-readiness",
    targetAudience: [{ type: "users", userIds: [input.userId] }],
    title: input.title,
    type: "system.alert",
  }).catch(() => null);
}

export async function getPersonnelReadinessCenterData(): Promise<PersonnelCenterData> {
  const user = await requirePermission("personnel.dashboard.view");
  const [members, units, requirements, memberQualifications, personnelActions, transfers, leaves] = await Promise.all([
    prisma.memberProfile.findMany({
      include: {
        currentPosition: true,
        currentUnit: true,
        status: true,
        user: true,
      },
      orderBy: {
        displayName: "asc",
      },
      where: {
        deletedAt: null,
        isActive: true,
      },
      take: 200,
    }),
    prisma.unit.findMany({
      include: {
        currentMembers: {
          include: {
            currentPosition: true,
            status: true,
            user: true,
          },
          where: {
            deletedAt: null,
            isActive: true,
          },
        },
        positions: {
          include: {
            currentMembers: {
              where: {
                deletedAt: null,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      where: {
        deletedAt: null,
        isActive: true,
      },
    }),
    prisma.qualificationRequirement.findMany({
      include: {
        qualification: true,
      },
    }),
    prisma.memberQualification.findMany({
      where: {
        status: {
          in: ["qualified", "pending_signoff"],
        },
      },
    }),
    prisma.personnelAction.findMany({
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      take: 20,
      where: {
        status: {
          in: ["open", "assigned", "under_review"],
        },
      },
    }),
    prisma.transferRequest.findMany({
      include: {
        currentUnit: true,
        memberProfile: {
          include: {
            user: true,
          },
        },
        requestedUnit: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      where: {
        status: {
          in: ["submitted", "current_unit_review", "receiving_unit_review"],
        },
      },
    }),
    prisma.leaveOfAbsence.findMany({
      include: {
        memberProfile: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        expectedReturnAt: "asc",
      },
      take: 20,
      where: {
        status: {
          in: ["requested", "approved", "active", "extension_requested"],
        },
      },
    }),
  ]);
  const now = new Date();
  const qualificationKeysByMember = new Map<string, Set<string>>();

  for (const record of memberQualifications) {
    const set = qualificationKeysByMember.get(record.memberProfileId) ?? new Set<string>();

    if (record.status === "qualified" && (!record.expiresAt || record.expiresAt > now)) {
      set.add(record.qualificationId);
    }

    qualificationKeysByMember.set(record.memberProfileId, set);
  }

  const missingByMember = new Map<string, string[]>();
  const overdueByMember = new Map<string, string[]>();

  for (const member of members) {
    const memberRequirements = requirements.filter(
      (requirement) =>
        requirement.isRequired &&
        ((requirement.unitId && requirement.unitId === member.currentUnitId) ||
          (requirement.positionId && requirement.positionId === member.currentPositionId)),
    );
    const earned = qualificationKeysByMember.get(member.id) ?? new Set<string>();
    const missing = memberRequirements.filter((requirement) => !earned.has(requirement.qualificationId));

    missingByMember.set(member.id, missing.map((requirement) => requirement.qualification.label));
    overdueByMember.set(
      member.id,
      missing
        .filter((requirement) => {
          if (!requirement.dueWithinDays || !member.joinDate) {
            return false;
          }

          const dueAt = new Date(member.joinDate);
          dueAt.setDate(dueAt.getDate() + requirement.dueWithinDays);

          return dueAt < now;
        })
        .map((requirement) => requirement.qualification.label),
    );
  }

  const activeMembers = members.filter((member) => member.status.key === "active");
  const loaMembers = members.filter((member) => member.status.key === "loa");
  const expiringQualifications = memberQualifications.filter(
    (record) => record.expiresAt && record.expiresAt > now && record.expiresAt.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 * 30,
  ).length;
  const totalMissingQualifications = Array.from(missingByMember.values()).reduce((total, labels) => total + labels.length, 0);
  const attendanceConcernRows: PersonnelCenterData["attendanceConcerns"] = [];

  for (const member of members.slice(0, 60)) {
    if (!can(user, "attendance.reports.view", { unitId: member.currentUnitId }) && !can(user, "attendance.view", { unitId: member.currentUnitId })) {
      continue;
    }

    const attendance = await getMemberAttendanceSummary(member.id);

    if (attendance?.attendanceRate !== null && attendance?.attendanceRate !== undefined && attendance.attendanceRate < 70) {
      attendanceConcernRows.push({
        attendanceRate: attendance.attendanceRate,
        displayName: getMemberDisplayName(member),
        id: member.id,
        unitShortName: member.currentUnit?.shortName ?? null,
      });
    }
  }

  const unitReadiness = units.map((unit) => {
    const leadershipPositions = unit.positions.filter((position) => position.isLeadership && position.isActive);
    const vacantLeadershipPositions = leadershipPositions.filter((position) => position.currentMembers.length === 0).length;
    const unitMembers = unit.currentMembers;
    const missingRequiredQualifications = unitMembers.reduce(
      (total, member) => total + (missingByMember.get(member.id)?.length ?? 0),
      0,
    );

    return {
      activeMembers: unitMembers.filter((member) => member.status.key === "active").length,
      id: unit.id,
      missingRequiredQualifications,
      name: unit.name,
      readinessLabel:
        vacantLeadershipPositions > 0 || missingRequiredQualifications > 0 ? "Needs Attention" : "Ready",
      shortName: unit.shortName,
      vacantLeadershipPositions,
    };
  });
  const membersNeedingAttention = members
    .map((member) => {
      const reasons = [
        ...(member.currentUnitId ? [] : ["No active unit assignment"]),
        ...(member.status.key !== "active" ? [`Status is ${member.status.label}`] : []),
        ...((missingByMember.get(member.id) ?? []).length > 0
          ? [`${missingByMember.get(member.id)?.length ?? 0} missing required qualifications`]
          : []),
        ...((overdueByMember.get(member.id) ?? []).length > 0
          ? [`${overdueByMember.get(member.id)?.length ?? 0} overdue requirements`]
          : []),
      ];

      return {
        displayName: getMemberDisplayName(member),
        id: member.id,
        reasons,
        unitShortName: member.currentUnit?.shortName ?? null,
      };
    })
    .filter((member) => member.reasons.length > 0)
    .slice(0, 16);
  const unitRuleOutputs = await Promise.all(
    unitReadiness.slice(0, 8).map((unit) =>
      evaluateUnitReadinessRules({
        attendanceConcerns: attendanceConcernRows.filter((row) => row.unitShortName === unit.shortName).length,
        inactiveLeadership: 0,
        loaMembers: units.find((entry) => entry.id === unit.id)?.currentMembers.filter((member) => member.status.key === "loa").length ?? 0,
        missingRequiredQualifications: unit.missingRequiredQualifications,
        pendingTransfers: transfers.filter((transfer) => transfer.currentUnitId === unit.id || transfer.requestedUnitId === unit.id).length,
        trackedMembers: unit.activeMembers,
        vacantLeadershipPositions: unit.vacantLeadershipPositions,
      }),
    ),
  );
  const memberRuleOutputs = await Promise.all(
    membersNeedingAttention.slice(0, 8).map((member) =>
      evaluateMemberReadinessRules({
        attendanceRate: attendanceConcernRows.find((row) => row.id === member.id)?.attendanceRate ?? null,
        activeAssignment: !member.reasons.includes("No active unit assignment"),
        incompleteProfile: false,
        loaActive: member.reasons.some((reason) => reason.includes("LOA")),
        missingRequiredQualifications: missingByMember.get(member.id)?.length ?? 0,
        overdueRequiredQualifications: overdueByMember.get(member.id)?.length ?? 0,
        pendingPersonnelActions: personnelActions.filter((action) => action.memberProfileId === member.id).length,
        profileStatusKey: member.reasons.find((reason) => reason.startsWith("Status is "))?.replace("Status is ", "") ?? "active",
      }),
    ),
  );

  return {
    actions: personnelActions.map((action) => ({
      actionType: action.actionType,
      dueAt: action.dueAt,
      id: action.id,
      priority: action.priority,
      status: action.status,
      summary: action.summary,
      title: action.title,
    })),
    attendanceConcerns: attendanceConcernRows.slice(0, 12),
    capabilities: {
      canManageActions: can(user, "personnel.actions.manage"),
      canManageAttendancePolicies: can(user, "attendance.policies.manage"),
      canReviewLeave: can(user, "loa.review"),
      canReviewTransfers: can(user, "transfers.review"),
      canSubmitLeave: can(user, "loa.submit"),
      canSubmitTransfers: can(user, "transfers.submit"),
    },
    loaReturns: leaves.map((leave) => ({
      expectedReturnAt: leave.expectedReturnAt,
      id: leave.id,
      memberDisplayName: getMemberDisplayName(leave.memberProfile),
      status: leave.status,
    })),
    membersNeedingAttention,
    metrics: {
      activeMembers: activeMembers.length,
      expiringQualifications,
      loaMembers: loaMembers.length,
      missingQualifications: totalMissingQualifications,
      pendingPersonnelActions: personnelActions.length + transfers.length + leaves.filter((leave) => leave.status === "requested").length,
      totalMembers: members.length,
      vacantLeadershipPositions: unitReadiness.reduce((total, unit) => total + unit.vacantLeadershipPositions, 0),
    },
    pendingTransfers: transfers.map((transfer) => ({
      createdAt: transfer.createdAt,
      currentUnitShortName: transfer.currentUnit?.shortName ?? null,
      id: transfer.id,
      memberDisplayName: getMemberDisplayName(transfer.memberProfile),
      requestedUnitShortName: transfer.requestedUnit.shortName,
      status: transfer.status,
    })),
    readinessRules: [...unitRuleOutputs, ...memberRuleOutputs]
      .flatMap((output) => output.results)
      .filter((rule) => rule.status !== "PASS")
      .slice(0, 16),
    reference: {
      members: members.map((member) => ({
        displayName: getMemberDisplayName(member),
        id: member.id,
      })),
      units: units.map((unit) => ({
        id: unit.id,
        label: unit.name,
      })),
    },
    unitReadiness,
  };
}

export async function createPersonnelAction(input: {
  actionType: string;
  assignedToId?: string | null;
  dueAt?: Date | null;
  memberProfileId?: string | null;
  priority?: string | null;
  summary: string;
  title: string;
}) {
  const actor = await requirePermission("personnel.actions.manage");
  const action = await prisma.personnelAction.create({
    data: {
      actionType: normalizeRequiredString(input.actionType, "Action type"),
      assignedToId: input.assignedToId ?? null,
      dueAt: input.dueAt ?? null,
      memberProfileId: input.memberProfileId ?? null,
      priority: normalizeOptionalString(input.priority) ?? "medium",
      requestedById: actor.id,
      status: input.assignedToId ? "assigned" : "open",
      summary: normalizeRequiredString(input.summary, "Summary"),
      title: normalizeRequiredString(input.title, "Title"),
    },
  });

  await recordAuditEvent({
    action: "personnel.action.created",
    actorUserId: actor.id,
    entityId: action.id,
    entityType: "PersonnelAction",
    summary: `Personnel action created: ${action.title}.`,
  });
  revalidatePersonnelCenter();

  return action;
}

export async function submitTransferRequest(input: {
  memberProfileId: string;
  reason: string;
  requestedUnitId: string;
}) {
  const actor = await requirePermission("transfers.submit");
  const member = await prisma.memberProfile.findUniqueOrThrow({
    include: {
      user: true,
    },
    where: {
      id: input.memberProfileId,
    },
  });
  const reviewCase = await createPersonnelReviewCase({
    actorUserId: actor.id,
    caseType: "TRANSFER_REVIEW",
    description: input.reason,
    memberProfileId: member.id,
    summary: `Transfer request for ${getMemberDisplayName(member)}.`,
    title: `Transfer Review: ${getMemberDisplayName(member)}`,
  });
  const transfer = await prisma.transferRequest.create({
    data: {
      currentUnitId: member.currentUnitId,
      memberProfileId: member.id,
      reason: normalizeRequiredString(input.reason, "Transfer reason"),
      relatedCaseId: reviewCase.id,
      requestedById: actor.id,
      requestedUnitId: input.requestedUnitId,
      status: "submitted",
    },
  });

  await notifyUser({
    body: `Your transfer request has been submitted for review.`,
    idempotencyKey: `transfer.requested:${transfer.id}`,
    requestedByUserId: actor.id,
    title: "Transfer request submitted",
    type: "transfer.requested",
    userId: member.userId,
  });
  await recordAuditEvent({
    action: "transfer.requested",
    actorUserId: actor.id,
    entityId: transfer.id,
    entityType: "TransferRequest",
    metadata: {
      caseId: reviewCase.id,
      requestedUnitId: input.requestedUnitId,
    },
    reason: input.reason,
    summary: `Transfer requested for ${getMemberDisplayName(member)}.`,
  });
  revalidatePersonnelCenter();

  return transfer;
}

export async function reviewTransferRequest(input: {
  effectiveDate?: Date | null;
  reviewNotes?: string | null;
  status: "approved" | "denied";
  transferRequestId: string;
}) {
  const actor = await requirePermission("transfers.review");
  const transfer = await prisma.transferRequest.findUniqueOrThrow({
    include: {
      memberProfile: {
        include: {
          currentPosition: true,
          currentRank: true,
          currentUnit: true,
          status: true,
          user: true,
        },
      },
      requestedUnit: true,
    },
    where: {
      id: input.transferRequestId,
    },
  });

  if (input.status === "approved") {
    if (!can(actor, "roster.unit.assign", { unitId: transfer.requestedUnitId }) && !can(actor, "roster.unit.assign")) {
      throw new Error("Approving this transfer requires roster unit assignment permission.");
    }

    await createOrUpdatePrimaryRosterAssignment({
      actor,
      memberProfileId: transfer.memberProfileId,
      rankId: transfer.memberProfile.rankId,
      reason: input.reviewNotes ?? "Transfer approved",
      unitId: transfer.requestedUnitId,
    });
  }

  const updated = await prisma.transferRequest.update({
    data: {
      decidedAt: new Date(),
      effectiveDate: input.effectiveDate ?? null,
      reviewedById: actor.id,
      reviewNotes: normalizeOptionalString(input.reviewNotes),
      status: input.status,
    },
    where: {
      id: transfer.id,
    },
  });

  await notifyUser({
    body: `Your transfer request was ${input.status}.`,
    idempotencyKey: `transfer.${input.status}:${transfer.id}`,
    requestedByUserId: actor.id,
    title: `Transfer ${input.status}`,
    type: `transfer.${input.status}`,
    userId: transfer.memberProfile.userId,
  });
  await recordAuditEvent({
    action: input.status === "approved" ? "transfer.approved" : "transfer.denied",
    actorUserId: actor.id,
    entityId: transfer.id,
    entityType: "TransferRequest",
    reason: input.reviewNotes ?? null,
    summary: `Transfer ${input.status} for ${getMemberDisplayName(transfer.memberProfile)}.`,
  });
  revalidatePersonnelCenter();

  return updated;
}

export async function submitLeaveOfAbsence(input: {
  expectedReturnAt?: Date | null;
  memberProfileId: string;
  reason?: string | null;
  startsAt: Date;
}) {
  const actor = await requirePermission("loa.submit");
  const member = await prisma.memberProfile.findUniqueOrThrow({
    include: {
      user: true,
    },
    where: {
      id: input.memberProfileId,
    },
  });
  const reviewCase = await createPersonnelReviewCase({
    actorUserId: actor.id,
    caseType: "LOA_REVIEW",
    description: input.reason ?? "LOA request submitted.",
    memberProfileId: member.id,
    summary: `LOA request for ${getMemberDisplayName(member)}.`,
    title: `LOA Review: ${getMemberDisplayName(member)}`,
  });
  const leave = await prisma.leaveOfAbsence.create({
    data: {
      expectedReturnAt: input.expectedReturnAt ?? null,
      memberProfileId: member.id,
      reason: normalizeOptionalString(input.reason),
      relatedCaseId: reviewCase.id,
      requestedById: actor.id,
      startsAt: input.startsAt,
      status: "requested",
    },
  });

  await notifyUser({
    body: "Your LOA request has been submitted for review.",
    idempotencyKey: `loa.requested:${leave.id}`,
    requestedByUserId: actor.id,
    title: "LOA request submitted",
    type: "loa.requested",
    userId: member.userId,
  });
  await recordAuditEvent({
    action: "loa.requested",
    actorUserId: actor.id,
    entityId: leave.id,
    entityType: "LeaveOfAbsence",
    reason: input.reason ?? null,
    summary: `LOA requested for ${getMemberDisplayName(member)}.`,
  });
  revalidatePersonnelCenter();

  return leave;
}

export async function reviewLeaveOfAbsence(input: {
  leaveId: string;
  reviewNotes?: string | null;
  status: "approved" | "denied" | "returned";
}) {
  const actor = await requirePermission("loa.review");
  const leave = await prisma.leaveOfAbsence.findUniqueOrThrow({
    include: {
      memberProfile: {
        include: {
          user: true,
        },
      },
    },
    where: {
      id: input.leaveId,
    },
  });
  const updated = await prisma.leaveOfAbsence.update({
    data: {
      decidedAt: input.status === "returned" ? leave.decidedAt : new Date(),
      returnedAt: input.status === "returned" ? new Date() : leave.returnedAt,
      reviewedById: actor.id,
      reviewNotes: normalizeOptionalString(input.reviewNotes),
      status: input.status,
    },
    where: {
      id: leave.id,
    },
  });

  await notifyUser({
    body: `Your LOA request was ${input.status}.`,
    idempotencyKey: `loa.${input.status}:${leave.id}`,
    requestedByUserId: actor.id,
    title: `LOA ${input.status}`,
    type: `loa.${input.status}`,
    userId: leave.memberProfile.userId,
  });
  await recordAuditEvent({
    action: `loa.${input.status}`,
    actorUserId: actor.id,
    entityId: leave.id,
    entityType: "LeaveOfAbsence",
    reason: input.reviewNotes ?? null,
    summary: `LOA ${input.status} for ${getMemberDisplayName(leave.memberProfile)}.`,
  });
  revalidatePersonnelCenter();

  return updated;
}

export async function upsertAttendancePolicy(input: {
  lookbackDays: number;
  minimumAttendancePercent: number;
  notes?: string | null;
  unitId: string;
}) {
  const actor = await requirePermission("attendance.policies.manage", { unitId: input.unitId });
  const policy = await prisma.attendancePolicy.upsert({
    create: {
      lookbackDays: input.lookbackDays,
      minimumAttendancePercent: input.minimumAttendancePercent,
      notes: normalizeOptionalString(input.notes),
      unitId: input.unitId,
    },
    update: {
      lookbackDays: input.lookbackDays,
      minimumAttendancePercent: input.minimumAttendancePercent,
      notes: normalizeOptionalString(input.notes),
    },
    where: {
      unitId: input.unitId,
    },
  });

  await recordAuditEvent({
    action: "attendance.policy.updated",
    actorUserId: actor.id,
    entityId: policy.id,
    entityType: "AttendancePolicy",
    newValue: toJson({
      lookbackDays: policy.lookbackDays,
      minimumAttendancePercent: policy.minimumAttendancePercent,
      unitId: policy.unitId,
    }),
    summary: "Attendance policy updated.",
  });
  revalidatePersonnelCenter();

  return policy;
}
