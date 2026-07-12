import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { assertValidCaseTransition, getCaseTypeDefinition } from "@/server/community-management/registry";
import { addCaseTimelineEntry } from "@/server/community-management/timeline";
import type { CaseCreateInput } from "@/server/community-management/types";
import { processCommunicationRequest } from "@/server/communications/pipeline";
import { prisma } from "@/server/database/client";
import { kickDiscordGuildMember } from "@/server/discord/guild-members";
import { requirePermission } from "@/server/permissions/access";
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

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function revalidateCommunityManagement() {
  revalidatePath("/community-management");
  revalidatePath("/administration/discord");
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

async function notifyCaseEvent(input: {
  body: string;
  caseId: string;
  requestedByUserId?: string | null;
  targetUserIds: string[];
  title: string;
  type: string;
}) {
  if (input.targetUserIds.length === 0) {
    return null;
  }

  return processCommunicationRequest({
    body: input.body,
    category: "administration",
    idempotencyKey: `${input.type}:${input.caseId}:${input.targetUserIds.join(",")}`,
    priority: "normal",
    relatedEntityId: input.caseId,
    relatedEntityType: "CommunityCase",
    requestedByUserId: input.requestedByUserId ?? null,
    requestedChannels: [{ type: "portal" }],
    sourceEvent: input.type,
    sourceModule: "community-management",
    targetAudience: [{ type: "users", userIds: input.targetUserIds }],
    title: input.title,
    type: "system.alert",
  }).catch(() => null);
}

export async function createCommunityCaseRecord(input: CaseCreateInput & { actorUserId: string }) {
  const definition = getCaseTypeDefinition(input.caseType);

  if (!definition) {
    throw new Error(`Unknown case type: ${input.caseType}.`);
  }

  const created = await prisma.communityCase.create({
    data: {
      caseNumber: await getNextCaseNumber(),
      caseType: definition.id,
      confidentiality: input.confidentiality ?? "standard",
      createdByUserId: input.actorUserId,
      description: normalizeOptionalString(input.description),
      dueAt: input.dueAt ?? null,
      openedAt: new Date(),
      owningUnitId: input.owningUnitId ?? null,
      priority: input.priority ?? definition.defaultPriority,
      relatedDiscordUserId: normalizeOptionalString(input.relatedDiscordUserId),
      relatedEntityId: normalizeOptionalString(input.relatedEntityId),
      relatedEntityType: normalizeOptionalString(input.relatedEntityType),
      relatedMemberId: input.relatedMemberId ?? null,
      status: "open",
      summary: normalizeRequiredString(input.summary, "Case summary"),
      title: normalizeRequiredString(input.title, "Case title"),
    },
  });

  await addCaseTimelineEntry({
    actorUserId: input.actorUserId,
    caseId: created.id,
    entryType: "case.created",
    title: "Case created",
  });
  await recordAuditEvent({
    action: "case.created",
    actorUserId: input.actorUserId,
    entityId: created.id,
    entityType: "CommunityCase",
    metadata: {
      caseNumber: created.caseNumber,
      caseType: created.caseType,
      confidentiality: created.confidentiality,
    },
    summary: `Case created: ${created.caseNumber} ${created.title}.`,
  });
  revalidateCommunityManagement();

  return created;
}

export async function createCommunityCase(input: CaseCreateInput) {
  const actor = await requirePermission("cases.create");

  return createCommunityCaseRecord({
    ...input,
    actorUserId: actor.id,
  });
}

export async function assignCommunityCase(input: {
  assignedToUserId?: string | null;
  caseId: string;
  dueAt?: Date | null;
  notes?: string | null;
  permissionKey?: string | null;
  unitId?: string | null;
}) {
  const actor = await requirePermission("cases.assign");
  const existing = await prisma.communityCase.findUnique({
    where: {
      id: input.caseId,
    },
  });

  if (!existing) {
    throw new Error("Case not found.");
  }

  await prisma.caseAssignment.updateMany({
    where: {
      caseId: existing.id,
      endedAt: null,
    },
    data: {
      endedAt: new Date(),
    },
  });
  const assignment = await prisma.caseAssignment.create({
    data: {
      assignedByUserId: actor.id,
      assignedToUserId: input.assignedToUserId ?? null,
      caseId: existing.id,
      dueAt: input.dueAt ?? null,
      notes: normalizeOptionalString(input.notes),
      permissionKey: normalizeOptionalString(input.permissionKey),
      unitId: input.unitId ?? null,
    },
  });
  const updated = await prisma.communityCase.update({
    where: {
      id: existing.id,
    },
    data: {
      assignedToUserId: input.assignedToUserId ?? null,
      dueAt: input.dueAt ?? existing.dueAt,
    },
  });

  await addCaseTimelineEntry({
    actorUserId: actor.id,
    body: input.notes,
    caseId: existing.id,
    entryType: "case.assigned",
    title: input.assignedToUserId ? "Case assigned" : "Case routed to queue",
  });
  await recordAuditEvent({
    action: existing.assignedToUserId ? "case.reassigned" : "case.assigned",
    actorUserId: actor.id,
    entityId: existing.id,
    entityType: "CommunityCase",
    metadata: {
      assignedToUserId: input.assignedToUserId ?? null,
      assignmentId: assignment.id,
      permissionKey: input.permissionKey ?? null,
      unitId: input.unitId ?? null,
    },
    summary: `Case assignment updated: ${existing.caseNumber}.`,
  });
  await notifyCaseEvent({
    body: `${updated.caseNumber} has been assigned for review.`,
    caseId: updated.id,
    requestedByUserId: actor.id,
    targetUserIds: input.assignedToUserId ? [input.assignedToUserId] : [],
    title: `Case assigned: ${updated.caseNumber}`,
    type: "case.assigned",
  });
  revalidateCommunityManagement();

  return updated;
}

export async function transitionCommunityCase(input: {
  caseId: string;
  resolution?: string | null;
  status: string;
}) {
  const actor = await requirePermission("cases.transition");
  const existing = await prisma.communityCase.findUnique({
    where: {
      id: input.caseId,
    },
  });

  if (!existing) {
    throw new Error("Case not found.");
  }

  assertValidCaseTransition(existing.caseType, existing.status, input.status);

  const now = new Date();
  const updated = await prisma.communityCase.update({
    where: {
      id: existing.id,
    },
    data: {
      archivedAt: input.status === "archived" ? now : existing.archivedAt,
      closedAt: input.status === "closed" ? now : existing.closedAt,
      resolvedAt: ["resolved", "dismissed"].includes(input.status) ? now : existing.resolvedAt,
      resolution: normalizeOptionalString(input.resolution) ?? existing.resolution,
      status: input.status,
    },
  });

  await addCaseTimelineEntry({
    actorUserId: actor.id,
    body: input.resolution,
    caseId: existing.id,
    entryType: "case.status_changed",
    title: `Status changed to ${input.status}`,
  });
  await recordAuditEvent({
    action: "case.status_changed",
    actorUserId: actor.id,
    entityId: existing.id,
    entityType: "CommunityCase",
    newValue: {
      status: input.status,
    },
    oldValue: {
      status: existing.status,
    },
    summary: `Case status changed: ${existing.caseNumber} ${existing.status} -> ${input.status}.`,
  });
  revalidateCommunityManagement();

  return updated;
}

export async function addCaseNote(input: {
  body: string;
  caseId: string;
  noteType?: string | null;
  visibility?: string | null;
}) {
  const actor = await requirePermission("notes.manage");
  const note = await prisma.caseNote.create({
    data: {
      authorId: actor.id,
      body: normalizeRequiredString(input.body, "Note"),
      caseId: input.caseId,
      noteType: normalizeOptionalString(input.noteType) ?? "staff",
      visibility: normalizeOptionalString(input.visibility) ?? "staff",
    },
  });

  await addCaseTimelineEntry({
    actorUserId: actor.id,
    caseId: input.caseId,
    entryType: "case.note_added",
    title: "Note added",
    visibility: note.visibility,
  });
  await recordAuditEvent({
    action: "case.note_added",
    actorUserId: actor.id,
    entityId: input.caseId,
    entityType: "CommunityCase",
    metadata: {
      noteId: note.id,
      noteType: note.noteType,
      visibility: note.visibility,
    },
    summary: "Case note added.",
  });
  revalidateCommunityManagement();

  return note;
}

export async function addCaseEvidence(input: {
  caseId: string;
  description?: string | null;
  evidenceType?: string | null;
  externalUrl?: string | null;
  label: string;
  source?: string | null;
  visibility?: string | null;
}) {
  const actor = await requirePermission("evidence.manage");
  const evidence = await prisma.caseEvidence.create({
    data: {
      caseId: input.caseId,
      description: normalizeOptionalString(input.description),
      evidenceType: normalizeOptionalString(input.evidenceType) ?? "external_link",
      externalUrl: normalizeOptionalString(input.externalUrl),
      label: normalizeRequiredString(input.label, "Evidence label"),
      source: normalizeOptionalString(input.source),
      status: "active",
      uploadedByUserId: actor.id,
      visibility: normalizeOptionalString(input.visibility) ?? "staff",
    },
  });

  await addCaseTimelineEntry({
    actorUserId: actor.id,
    caseId: input.caseId,
    entryType: "case.evidence_added",
    title: `Evidence added: ${evidence.label}`,
    visibility: evidence.visibility,
  });
  await recordAuditEvent({
    action: "case.evidence_uploaded",
    actorUserId: actor.id,
    entityId: input.caseId,
    entityType: "CommunityCase",
    metadata: {
      evidenceId: evidence.id,
      evidenceType: evidence.evidenceType,
      status: evidence.status,
    },
    summary: `Evidence added: ${evidence.label}.`,
  });
  revalidateCommunityManagement();

  return evidence;
}

export async function recordCaseDecision(input: {
  appealAllowed?: boolean;
  appealDeadline?: Date | null;
  caseId: string;
  decisionType: string;
  reasoning?: string | null;
  summary: string;
}) {
  const actor = await requirePermission("cases.close");
  const decision = await prisma.caseDecision.create({
    data: {
      appealAllowed: input.appealAllowed ?? false,
      appealDeadline: input.appealDeadline ?? null,
      caseId: input.caseId,
      decidedByUserId: actor.id,
      decisionType: normalizeRequiredString(input.decisionType, "Decision type"),
      reasoning: normalizeOptionalString(input.reasoning),
      summary: normalizeRequiredString(input.summary, "Decision summary"),
    },
  });

  await addCaseTimelineEntry({
    actorUserId: actor.id,
    body: decision.summary,
    caseId: input.caseId,
    entryType: "case.decision_recorded",
    title: `Decision recorded: ${decision.decisionType}`,
  });
  await recordAuditEvent({
    action: "case.decision_recorded",
    actorUserId: actor.id,
    entityId: input.caseId,
    entityType: "CommunityCase",
    metadata: {
      decisionId: decision.id,
      decisionType: decision.decisionType,
    },
    summary: `Case decision recorded: ${decision.summary}.`,
  });
  revalidateCommunityManagement();

  return decision;
}

export async function issueWarning(input: {
  caseId: string;
  followUpDate?: Date | null;
  reason: string;
  severity?: string | null;
  targetUserId?: string | null;
}) {
  const actor = await requirePermission("moderation.warn");
  const decision = await prisma.caseDecision.create({
    data: {
      appealAllowed: true,
      caseId: input.caseId,
      decidedByUserId: actor.id,
      decisionType: "warning_issued",
      reviewDate: input.followUpDate ?? null,
      summary: normalizeRequiredString(input.reason, "Warning reason"),
    },
  });

  await addCaseTimelineEntry({
    actorUserId: actor.id,
    body: input.reason,
    caseId: input.caseId,
    entryType: "moderation.warning_issued",
    title: `Warning issued${input.severity ? ` (${input.severity})` : ""}`,
  });
  await notifyCaseEvent({
    body: input.reason,
    caseId: input.caseId,
    requestedByUserId: actor.id,
    targetUserIds: input.targetUserId ? [input.targetUserId] : [],
    title: "Community warning issued",
    type: "warning.issued",
  });
  await recordAuditEvent({
    action: "moderation.warning_issued",
    actorUserId: actor.id,
    entityId: input.caseId,
    entityType: "CommunityCase",
    metadata: {
      decisionId: decision.id,
      severity: input.severity ?? null,
    },
    reason: input.reason,
    summary: "Warning issued through Community Management.",
  });
  revalidateCommunityManagement();

  return decision;
}

export async function requestModerationAction(input: {
  action: "kick" | "ban" | "timeout" | "remove_timeout" | "unban";
  caseId?: string | null;
  discordServerId: string;
  durationSeconds?: number | null;
  reason: string;
  targetDiscordUserId: string;
}) {
  const permission =
    input.action === "kick"
      ? "moderation.kick"
      : input.action === "ban" || input.action === "unban"
        ? "moderation.ban"
        : "moderation.timeout";
  const actor = await requirePermission(permission);
  const reason = normalizeRequiredString(input.reason, "Moderation reason");

  if (input.action === "kick") {
    const action = await kickDiscordGuildMember({
      actorUserId: actor.id,
      discordServerId: input.discordServerId,
      reason,
      targetDiscordUserId: normalizeRequiredString(input.targetDiscordUserId, "Target Discord user"),
    });
    const linked = await prisma.discordModerationAction.update({
      where: {
        id: action.id,
      },
      data: {
        approvedByUserId: actor.id,
        executedAt: action.result === "succeeded" ? new Date() : null,
        relatedCaseId: input.caseId ?? null,
      },
    });

    if (input.caseId) {
      await addCaseTimelineEntry({
        actorUserId: actor.id,
        caseId: input.caseId,
        entryType: "moderation.kick_completed",
        relatedEntityId: linked.id,
        relatedEntityType: "DiscordModerationAction",
        title: `Discord kick ${linked.result}`,
      });
    }

    revalidateCommunityManagement();

    return linked;
  }

  const action = await prisma.discordModerationAction.create({
    data: {
      action: input.action,
      approvedByUserId: actor.id,
      discordServerId: input.discordServerId,
      durationSeconds: input.durationSeconds ?? null,
      errorMessage: "This Discord moderation action is recorded but provider execution is not implemented yet.",
      moderatorUserId: actor.id,
      reason,
      relatedCaseId: input.caseId ?? null,
      result: "pending_provider",
      targetDiscordUserId: normalizeRequiredString(input.targetDiscordUserId, "Target Discord user"),
    },
  });

  if (input.caseId) {
    await addCaseTimelineEntry({
      actorUserId: actor.id,
      caseId: input.caseId,
      entryType: "moderation.action_requested",
      relatedEntityId: action.id,
      relatedEntityType: "DiscordModerationAction",
      title: `${input.action} requested`,
    });
  }

  await recordAuditEvent({
    action: `moderation.${input.action}_requested`,
    actorUserId: actor.id,
    entityId: action.id,
    entityType: "DiscordModerationAction",
    reason,
    summary: `${input.action} moderation action recorded pending provider support.`,
  });
  revalidateCommunityManagement();

  return action;
}

export async function submitIncidentReport(input: {
  category: string;
  confidentiality?: string | null;
  detailedReport: string;
  immediateActionsTaken?: string | null;
  locationContext?: string | null;
  occurredAt?: Date | null;
  requestedReview?: string | null;
  summary: string;
  title: string;
}) {
  const actor = await requirePermission("incidents.create");
  const communityCase = await createCommunityCaseRecord({
    actorUserId: actor.id,
    caseType: "INCIDENT",
    confidentiality: (normalizeOptionalString(input.confidentiality) as never) ?? "restricted",
    description: input.detailedReport,
    priority: "medium",
    summary: input.summary,
    title: input.title,
  });
  const incident = await prisma.incidentReport.create({
    data: {
      caseId: communityCase.id,
      category: normalizeRequiredString(input.category, "Incident category"),
      confidentiality: normalizeOptionalString(input.confidentiality) ?? "restricted",
      immediateActionsTaken: normalizeOptionalString(input.immediateActionsTaken),
      locationContext: normalizeOptionalString(input.locationContext),
      occurredAt: input.occurredAt ?? null,
      reporterUserId: actor.id,
      requestedReview: normalizeOptionalString(input.requestedReview),
    },
  });

  await addCaseTimelineEntry({
    actorUserId: actor.id,
    caseId: communityCase.id,
    entryType: "incident.submitted",
    title: "Incident report submitted",
  });
  await recordAuditEvent({
    action: "incident.report_submitted",
    actorUserId: actor.id,
    entityId: incident.id,
    entityType: "IncidentReport",
    metadata: {
      caseId: communityCase.id,
    },
    summary: `Incident report submitted: ${communityCase.caseNumber}.`,
  });
  revalidateCommunityManagement();

  return incident;
}

export async function submitAppeal(input: {
  appealReason: string;
  originalCaseId: string;
  requestedRemedy?: string | null;
  title?: string | null;
}) {
  const actor = await requirePermission("appeals.submit");
  const originalCase = await prisma.communityCase.findUnique({
    where: {
      id: input.originalCaseId,
    },
  });

  if (!originalCase) {
    throw new Error("Original case not found.");
  }

  const appealCase = await createCommunityCaseRecord({
    actorUserId: actor.id,
    caseType: "APPEAL",
    confidentiality: originalCase.confidentiality as never,
    description: input.appealReason,
    priority: "medium",
    relatedEntityId: originalCase.id,
    relatedEntityType: "CommunityCase",
    relatedMemberId: originalCase.relatedMemberId,
    summary: `Appeal for ${originalCase.caseNumber}`,
    title: normalizeOptionalString(input.title) ?? `Appeal: ${originalCase.caseNumber}`,
  });
  const appeal = await prisma.caseAppeal.create({
    data: {
      appealCaseId: appealCase.id,
      appealReason: normalizeRequiredString(input.appealReason, "Appeal reason"),
      appellantUserId: actor.id,
      originalCaseId: originalCase.id,
      requestedRemedy: normalizeOptionalString(input.requestedRemedy),
      status: "submitted",
    },
  });

  await prisma.communityCase.update({
    where: {
      id: originalCase.id,
    },
    data: {
      status: "appealed",
    },
  });
  await addCaseTimelineEntry({
    actorUserId: actor.id,
    caseId: originalCase.id,
    entryType: "appeal.submitted",
    relatedEntityId: appealCase.id,
    relatedEntityType: "CommunityCase",
    title: "Appeal submitted",
  });
  await recordAuditEvent({
    action: "appeal.submitted",
    actorUserId: actor.id,
    entityId: appeal.id,
    entityType: "CaseAppeal",
    metadata: {
      appealCaseId: appealCase.id,
      originalCaseId: originalCase.id,
    },
    summary: `Appeal submitted for ${originalCase.caseNumber}.`,
  });
  revalidateCommunityManagement();

  return appeal;
}

export async function addMemberAdministrativeNote(input: {
  body: string;
  memberProfileId: string;
  noteType?: string | null;
  relatedCaseId?: string | null;
  visibility?: string | null;
}) {
  const actor = await requirePermission("notes.manage");
  const note = await prisma.memberAdministrativeNote.create({
    data: {
      authorUserId: actor.id,
      body: normalizeRequiredString(input.body, "Administrative note"),
      memberProfileId: input.memberProfileId,
      noteType: normalizeOptionalString(input.noteType) ?? "administrative",
      relatedCaseId: input.relatedCaseId ?? null,
      visibility: normalizeOptionalString(input.visibility) ?? "restricted",
    },
  });

  await recordAuditEvent({
    action: "member.administrative_note_added",
    actorUserId: actor.id,
    entityId: input.memberProfileId,
    entityType: "MemberProfile",
    metadata: {
      noteId: note.id,
      relatedCaseId: input.relatedCaseId ?? null,
    },
    summary: "Member administrative note added.",
  });
  revalidateCommunityManagement();

  return note;
}

export function getCommunityManagementJson(value: unknown) {
  return toInputJson(value);
}
