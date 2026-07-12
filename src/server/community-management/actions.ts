"use server";

import {
  addCaseEvidence,
  addCaseNote,
  assignCommunityCase,
  createCommunityCase,
  issueWarning,
  recordCaseDecision,
  submitAppeal,
  submitIncidentReport,
  transitionCommunityCase,
} from "@/server/community-management/service";
import { executeCaseBackedDiscordModerationAction } from "@/server/discord/moderation/service";
import type { CaseConfidentiality, CasePriority, CaseTypeId } from "@/server/community-management/types";

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value || null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? new Date(value) : null;
}

export async function createCommunityCaseAction(formData: FormData) {
  await createCommunityCase({
    caseType: getRequiredString(formData, "caseType", "Case type") as CaseTypeId,
    confidentiality: (getOptionalString(formData, "confidentiality") as CaseConfidentiality | null) ?? "standard",
    description: getOptionalString(formData, "description"),
    dueAt: getOptionalDate(formData, "dueAt"),
    priority: (getOptionalString(formData, "priority") as CasePriority | null) ?? "medium",
    relatedDiscordUserId: getOptionalString(formData, "relatedDiscordUserId"),
    relatedMemberId: getOptionalString(formData, "relatedMemberId"),
    summary: getRequiredString(formData, "summary", "Summary"),
    title: getRequiredString(formData, "title", "Title"),
  });
}

export async function assignCommunityCaseAction(formData: FormData) {
  await assignCommunityCase({
    assignedToUserId: getOptionalString(formData, "assignedToUserId"),
    caseId: getRequiredString(formData, "caseId", "Case"),
    dueAt: getOptionalDate(formData, "dueAt"),
    notes: getOptionalString(formData, "notes"),
    permissionKey: getOptionalString(formData, "permissionKey"),
  });
}

export async function transitionCommunityCaseAction(formData: FormData) {
  await transitionCommunityCase({
    caseId: getRequiredString(formData, "caseId", "Case"),
    resolution: getOptionalString(formData, "resolution"),
    status: getRequiredString(formData, "status", "Status"),
  });
}

export async function addCaseNoteAction(formData: FormData) {
  await addCaseNote({
    body: getRequiredString(formData, "body", "Note"),
    caseId: getRequiredString(formData, "caseId", "Case"),
    noteType: getOptionalString(formData, "noteType"),
    visibility: getOptionalString(formData, "visibility"),
  });
}

export async function addCaseEvidenceAction(formData: FormData) {
  await addCaseEvidence({
    caseId: getRequiredString(formData, "caseId", "Case"),
    description: getOptionalString(formData, "description"),
    evidenceType: getOptionalString(formData, "evidenceType"),
    externalUrl: getOptionalString(formData, "externalUrl"),
    label: getRequiredString(formData, "label", "Evidence label"),
    source: getOptionalString(formData, "source"),
    visibility: getOptionalString(formData, "visibility"),
  });
}

export async function recordCaseDecisionAction(formData: FormData) {
  await recordCaseDecision({
    appealAllowed: formData.get("appealAllowed") === "on",
    appealDeadline: getOptionalDate(formData, "appealDeadline"),
    caseId: getRequiredString(formData, "caseId", "Case"),
    decisionType: getRequiredString(formData, "decisionType", "Decision type"),
    reasoning: getOptionalString(formData, "reasoning"),
    summary: getRequiredString(formData, "summary", "Decision summary"),
  });
}

export async function issueWarningAction(formData: FormData) {
  await issueWarning({
    caseId: getRequiredString(formData, "caseId", "Case"),
    followUpDate: getOptionalDate(formData, "followUpDate"),
    reason: getRequiredString(formData, "reason", "Warning reason"),
    severity: getOptionalString(formData, "severity"),
    targetUserId: getOptionalString(formData, "targetUserId"),
  });
}

export async function requestModerationActionAction(formData: FormData) {
  await executeCaseBackedDiscordModerationAction({
    action: getRequiredString(formData, "action", "Action") as never,
    caseId: getOptionalString(formData, "caseId"),
    discordServerId: getRequiredString(formData, "discordServerId", "Discord server"),
    durationSeconds: Number(getOptionalString(formData, "durationSeconds") ?? "") || null,
    reason: getRequiredString(formData, "reason", "Reason"),
    targetDiscordUserId: getRequiredString(formData, "targetDiscordUserId", "Target Discord user"),
  });
}

export async function submitIncidentReportAction(formData: FormData) {
  await submitIncidentReport({
    category: getRequiredString(formData, "category", "Incident category"),
    confidentiality: getOptionalString(formData, "confidentiality"),
    detailedReport: getRequiredString(formData, "detailedReport", "Detailed report"),
    immediateActionsTaken: getOptionalString(formData, "immediateActionsTaken"),
    locationContext: getOptionalString(formData, "locationContext"),
    occurredAt: getOptionalDate(formData, "occurredAt"),
    requestedReview: getOptionalString(formData, "requestedReview"),
    summary: getRequiredString(formData, "summary", "Summary"),
    title: getRequiredString(formData, "title", "Title"),
  });
}

export async function submitAppealAction(formData: FormData) {
  await submitAppeal({
    appealReason: getRequiredString(formData, "appealReason", "Appeal reason"),
    originalCaseId: getRequiredString(formData, "originalCaseId", "Original case"),
    requestedRemedy: getOptionalString(formData, "requestedRemedy"),
    title: getOptionalString(formData, "title"),
  });
}
