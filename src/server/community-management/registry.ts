import type { CaseStatus, CaseTypeDefinition } from "@/server/community-management/types";

const defaultTransitions: Record<CaseStatus, CaseStatus[]> = {
  archived: [],
  appealed: ["under_review", "closed", "archived"],
  awaiting_information: ["under_review", "pending_decision", "dismissed"],
  closed: ["reopened", "archived"],
  dismissed: ["reopened", "archived"],
  draft: ["open", "archived"],
  open: ["under_review", "awaiting_information", "pending_decision", "dismissed", "closed"],
  pending_decision: ["resolved", "dismissed", "appealed"],
  reopened: ["under_review", "awaiting_information", "pending_decision"],
  resolved: ["closed", "appealed", "reopened"],
  under_review: ["awaiting_information", "pending_decision", "resolved", "dismissed"],
};

const caseTypes = new Map<string, CaseTypeDefinition>();

function registerCaseType(definition: CaseTypeDefinition) {
  caseTypes.set(definition.id, definition);
}

const baseStatuses = Object.keys(defaultTransitions) as CaseStatus[];

[
  {
    defaultPriority: "high",
    description: "Moderation case for warnings, Discord actions, and conduct review.",
    displayName: "Moderation Case",
    evidenceRequired: true,
    id: "MODERATION",
    notificationHooks: ["warning.issued", "moderation.action_requested", "case.resolved"],
    owningDomain: "community-management",
  },
  {
    defaultPriority: "medium",
    description: "Incident report or community concern requiring staff review.",
    displayName: "Incident Review",
    evidenceRequired: false,
    id: "INCIDENT",
    notificationHooks: ["incident.submitted", "case.assigned"],
    owningDomain: "community-management",
  },
  {
    defaultPriority: "medium",
    description: "Appeal of a prior case, decision, or moderation action.",
    displayName: "Appeal Case",
    evidenceRequired: false,
    id: "APPEAL",
    notificationHooks: ["appeal.submitted", "appeal.decision"],
    owningDomain: "community-management",
  },
  {
    defaultPriority: "medium",
    description: "Administrative review that may involve staff, access, or policy follow-up.",
    displayName: "Administrative Review",
    evidenceRequired: false,
    id: "ADMINISTRATIVE_REVIEW",
    notificationHooks: ["case.assigned", "case.decision_recorded"],
    owningDomain: "administration",
  },
  {
    defaultPriority: "low",
    description: "Non-punitive coaching, guidance, or informal resolution case.",
    displayName: "Coaching",
    evidenceRequired: false,
    id: "COACHING",
    notificationHooks: ["coaching.recorded"],
    owningDomain: "personnel",
  },
  {
    defaultPriority: "medium",
    description: "General member concern requiring neutral staff review.",
    displayName: "Member Concern",
    evidenceRequired: false,
    id: "MEMBER_CONCERN",
    notificationHooks: ["case.created", "case.assigned"],
    owningDomain: "community-management",
  },
  {
    defaultPriority: "medium",
    description: "Personnel transfer review that updates assignment only after approval.",
    displayName: "Transfer Review",
    evidenceRequired: false,
    id: "TRANSFER_REVIEW",
    notificationHooks: ["transfer.requested", "transfer.approved", "transfer.denied"],
    owningDomain: "personnel",
  },
  {
    defaultPriority: "medium",
    description: "Leave of absence request, approval, extension, return, or review.",
    displayName: "LOA Review",
    evidenceRequired: false,
    id: "LOA_REVIEW",
    notificationHooks: ["loa.requested", "loa.approved", "loa.return_due"],
    owningDomain: "personnel",
  },
  {
    defaultPriority: "low",
    description: "Qualification exception or requirement review for a member.",
    displayName: "Qualification Exception",
    evidenceRequired: false,
    id: "QUALIFICATION_EXCEPTION",
    notificationHooks: ["qualification.exception_requested"],
    owningDomain: "personnel",
  },
  {
    defaultPriority: "low",
    description: "Profile correction dispute or administrative member record update.",
    displayName: "Profile Correction",
    evidenceRequired: false,
    id: "PROFILE_CORRECTION",
    notificationHooks: ["profile.correction_requested"],
    owningDomain: "personnel",
  },
].forEach((definition) =>
  registerCaseType({
    allowedStatuses: baseStatuses,
    allowedTransitions: defaultTransitions,
    assignmentPermission: "cases.assign",
    closureRequirements: ["resolution"],
    permissionRequirements: {
      create: "cases.create",
      manage: "cases.edit",
      view: "cases.view",
    },
    ...definition,
  } as CaseTypeDefinition),
);

export function getCaseTypeDefinition(caseType: string) {
  return caseTypes.get(caseType);
}

export function listCaseTypeDefinitions() {
  return Array.from(caseTypes.values());
}

export function assertValidCaseTransition(caseType: string, from: string, to: string) {
  const definition = getCaseTypeDefinition(caseType);
  const allowed = definition?.allowedTransitions[from as CaseStatus] ?? [];

  if (!allowed.includes(to as CaseStatus)) {
    throw new Error(`Case status cannot transition from ${from} to ${to}.`);
  }
}
