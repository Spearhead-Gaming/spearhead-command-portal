import type { OperationsPackageData, ReadinessRuleResult } from "@/server/operations-package/types";

export type OperationsJourneyStepStatus = "complete" | "current" | "blocked" | "warning" | "pending";

export type OperationsJourneyStep = {
  actionHref?: string;
  actionLabel?: string;
  blockingIssues: string[];
  description: string;
  id: string;
  label: string;
  responsible: string;
  status: OperationsJourneyStepStatus;
  warningMessages: string[];
};

export type OperationsNextAction = {
  href: string;
  label: string;
  reason: string;
  responsible: string;
  status: Exclude<OperationsJourneyStepStatus, "complete">;
};

export type OperationsJourney = {
  completionPercent: number;
  currentStep: OperationsJourneyStep | null;
  nextAction: OperationsNextAction | null;
  steps: OperationsJourneyStep[];
};

function getPackageHref(data: OperationsPackageData) {
  return `/operations/packages/${data.campaign.id}/week/${data.week.weekNumber}`;
}

function isReleasePublished(data: OperationsPackageData) {
  const status = data.release?.current?.status.toLowerCase();

  return status === "published" || status === "scheduled";
}

function isReleaseApproved(data: OperationsPackageData) {
  const status = data.release?.current?.status.toLowerCase();

  return status === "approved" || status === "published" || status === "scheduled";
}

function mapRuleMessages(rules: ReadinessRuleResult[] | undefined) {
  return (rules ?? []).slice(0, 3).map((rule) => rule.message || rule.recommendedAction);
}

function getZeusAssigned(data: OperationsPackageData) {
  return data.campaign.zeusAssignmentType === "creator_is_zeus" || Boolean(data.campaign.zeusName);
}

function makeStep(input: Omit<OperationsJourneyStep, "blockingIssues" | "warningMessages"> & {
  blockingIssues?: string[];
  warningMessages?: string[];
}): OperationsJourneyStep {
  return {
    ...input,
    blockingIssues: input.blockingIssues ?? [],
    warningMessages: input.warningMessages ?? [],
  };
}

export function buildOperationsJourney(data: OperationsPackageData): OperationsJourney {
  const packageHref = getPackageHref(data);
  const readinessBlockers = data.readiness?.blockingIssues ?? [];
  const readinessWarnings = data.readiness?.warnings ?? [];
  const releasePublished = isReleasePublished(data);
  const releaseApproved = isReleaseApproved(data);
  const intentAssessed = data.intentAssessment?.status === "assessed";
  const planningComplete = data.completion.planningFieldsComplete >= data.completion.planningFieldsTotal;
  const unitTaskingsComplete =
    data.completion.unitTaskingsTotal > 0 &&
    data.completion.unitTaskingsComplete >= data.completion.unitTaskingsTotal;
  const zeusAssigned = getZeusAssigned(data);

  const steps: OperationsJourneyStep[] = [
    makeStep({
      actionHref: `/operations/deployments/${data.campaign.id}`,
      actionLabel: "Open deployment",
      description: "Deployment record and operational week exist.",
      id: "deployment-created",
      label: "Deployment created",
      responsible: "Deployment Creator",
      status: "complete",
    }),
    makeStep({
      actionHref: `${packageHref}#resources`,
      actionLabel: "Add resources",
      description: "Deployment-wide OPORD, player primer, mod preset, and supporting resources are available.",
      id: "resources-added",
      label: "Resources added",
      responsible: "Deployment Creator / S3",
      status: data.completion.hasResources ? "complete" : "warning",
      warningMessages: data.completion.hasResources ? [] : ["Add deployment resources or confirm they are intentionally deferred."],
    }),
    makeStep({
      actionHref: packageHref,
      actionLabel: "Open current week",
      description: "Current operational week package is available.",
      id: "current-week-opened",
      label: "Current week opened",
      responsible: "S3",
      status: "complete",
    }),
    makeStep({
      actionHref: `${packageHref}#overview`,
      actionLabel: "Schedule operation",
      description: "Weekend Operation is linked to this package.",
      id: "weekend-operation-scheduled",
      label: "Weekend Operation scheduled",
      responsible: "S3",
      status: data.completion.hasWeekendOperation ? "complete" : "blocked",
      blockingIssues: data.completion.hasWeekendOperation ? [] : ["Link or create the Weekend Operation for this week."],
    }),
    makeStep({
      actionHref: `${packageHref}#planning`,
      actionLabel: "Complete planning",
      description: "Intent, objectives, situation, and planning context are filled enough for tasking.",
      id: "planning-completed",
      label: "Planning completed",
      responsible: "S3 / Deployment Creator",
      status: planningComplete ? "complete" : "current",
      warningMessages: planningComplete ? [] : [`${data.completion.planningFieldsComplete}/${data.completion.planningFieldsTotal} planning fields complete.`],
    }),
    makeStep({
      actionHref: `${packageHref}#tasking`,
      actionLabel: "Complete weekly tasking",
      description: "Weekly Tasking exists and summarizes the operation.",
      id: "weekly-tasking-completed",
      label: "Weekly Tasking completed",
      responsible: "S3",
      status: data.completion.hasTasking ? "complete" : "pending",
    }),
    makeStep({
      actionHref: `${packageHref}#tasking`,
      actionLabel: "Complete unit taskings",
      description: "Every active unit has a focused tasking summary.",
      id: "unit-taskings-completed",
      label: "Unit Taskings completed",
      responsible: "Unit Leadership / S3",
      status: unitTaskingsComplete ? "complete" : data.completion.hasTasking ? "current" : "pending",
      warningMessages: unitTaskingsComplete ? [] : [`${data.completion.unitTaskingsComplete}/${data.completion.unitTaskingsTotal} unit taskings complete.`],
    }),
    makeStep({
      actionHref: `${packageHref}#resources`,
      actionLabel: "Attach CONOP",
      description: "Week-specific CONOP file or link is attached as a resource.",
      id: "conop-attached",
      label: "CONOP attached",
      responsible: "S3 / Zeus",
      status: data.completion.hasConop ? "complete" : "blocked",
      blockingIssues: data.completion.hasConop ? [] : ["Attach the week CONOP before publication readiness can pass."],
    }),
    makeStep({
      actionHref: `${packageHref}#overview`,
      actionLabel: "Assign Zeus",
      description: "Zeus owner is known or intentionally set to creator.",
      id: "zeus-assigned",
      label: "Zeus assigned",
      responsible: "S3",
      status: zeusAssigned ? "complete" : "warning",
      warningMessages: zeusAssigned ? [] : ["Assign Zeus or explicitly leave unassigned if that is intentional."],
    }),
    makeStep({
      actionHref: `${packageHref}#readiness`,
      actionLabel: "Review readiness",
      blockingIssues: mapRuleMessages(readinessBlockers),
      description: "Operational and publication readiness have been evaluated.",
      id: "readiness-reviewed",
      label: "Readiness reviewed",
      responsible: "S3 / Command",
      status: data.readiness?.canContinueToPreview
        ? "complete"
        : readinessBlockers.length > 0
          ? "blocked"
          : readinessWarnings.length > 0
            ? "warning"
            : "pending",
      warningMessages: mapRuleMessages(readinessWarnings),
    }),
    makeStep({
      actionHref: `${packageHref}#release`,
      actionLabel: "Preview package",
      description: "Release preview is available for review before publication.",
      id: "previewed",
      label: "Previewed",
      responsible: "Publisher",
      status: data.release?.preview ? "complete" : "pending",
    }),
    makeStep({
      actionHref: `${packageHref}#release`,
      actionLabel: releaseApproved ? "Publish amendment" : "Approve package",
      description: "Package is approved, scheduled, or published through immutable release history.",
      id: "package-approved",
      label: "Package approved",
      responsible: "Publisher / Command",
      status: releaseApproved ? "complete" : data.readiness?.canPublish ? "current" : "pending",
    }),
    makeStep({
      actionHref: `${packageHref}#release`,
      actionLabel: "Publish weekly operation",
      description: "Current release is published or scheduled and ready for member-facing consumption.",
      id: "published",
      label: "Published",
      responsible: "Publisher",
      status: releasePublished ? "complete" : releaseApproved ? "current" : "pending",
    }),
    makeStep({
      actionHref: "/operations/patrols",
      actionLabel: "Monitor patrol activity",
      description: "Patrols and AARs feed operational progression after publication.",
      id: "patrol-activity",
      label: "Patrol activity",
      responsible: "Patrol Leaders / S3",
      status: releasePublished ? "current" : "pending",
    }),
    makeStep({
      actionHref: "/operations/aar-queue",
      actionLabel: "Review Patrol AARs",
      description: "Reviewed Patrol AARs inform progression and next-week planning.",
      id: "patrol-aar-review",
      label: "Patrol AAR review",
      responsible: "S3",
      status: intentAssessed ? "complete" : releasePublished ? "current" : "pending",
    }),
    makeStep({
      actionHref: `${packageHref}#intent`,
      actionLabel: "Assess intent",
      description: "Commander's Intent assessment records execution outcome and next-week guidance.",
      id: "intent-assessment",
      label: "Intent assessment",
      responsible: "Command / S3",
      status: intentAssessed ? "complete" : releasePublished ? "warning" : "pending",
    }),
  ];

  const currentStep = steps.find((step) => step.status !== "complete") ?? null;
  const nextAction = currentStep?.actionHref
    ? {
        href: currentStep.actionHref,
        label: currentStep.actionLabel ?? currentStep.label,
        reason:
          currentStep.blockingIssues[0] ??
          currentStep.warningMessages[0] ??
          currentStep.description,
        responsible: currentStep.responsible,
        status: currentStep.status === "complete" ? "pending" : currentStep.status,
      }
    : null;

  return {
    completionPercent: Math.round(
      (steps.filter((step) => step.status === "complete").length / steps.length) * 100,
    ),
    currentStep,
    nextAction,
    steps,
  };
}
