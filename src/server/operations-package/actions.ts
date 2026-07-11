"use server";

import { redirect } from "next/navigation";

import { operationsPackageService } from "@/server/operations-package/service";
import { dismissRecommendation, resolveRecommendation } from "@/server/recommendations/service";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRequiredNumber(formData: FormData, key: string) {
  return Number(getRequiredString(formData, key));
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? new Date(value) : null;
}

function getVersionBump(formData: FormData) {
  const value = getOptionalString(formData, "versionBump");

  return value === "major" ? "major" : "minor";
}

function withFlash(returnTo: string, key: "message" | "error", value: string) {
  const [pathname, existingQuery] = returnTo.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  params.set(key, value);

  return `${pathname}?${params.toString()}`;
}

async function runAction(
  formData: FormData,
  operation: () => Promise<void>,
  successMessage: string,
) {
  const returnTo = getRequiredString(formData, "returnTo") || "/operations";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function ensureOperationsPackageAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await operationsPackageService.createPackage({
        campaignId: getRequiredString(formData, "campaignId"),
        weekNumber: getRequiredNumber(formData, "weekNumber"),
      });
    },
    "Operations Package prepared.",
  );
}

export async function updateOperationsPackagePlanningAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await operationsPackageService.updatePlanning({
        campaignId: getRequiredString(formData, "campaignId"),
        commanderEndState: getOptionalString(formData, "commanderEndState"),
        commandersIntent: getOptionalString(formData, "commandersIntent"),
        enemySituation: getOptionalString(formData, "enemySituation"),
        failureConditions: getOptionalString(formData, "failureConditions"),
        friendlySituation: getOptionalString(formData, "friendlySituation"),
        intelligenceSummary: getOptionalString(formData, "intelligenceSummary"),
        logistics: getOptionalString(formData, "logistics"),
        notes: getOptionalString(formData, "notes"),
        operationalNotes: getOptionalString(formData, "operationalNotes"),
        operationalObjectives: getOptionalString(formData, "operationalObjectives"),
        planningAssumptions: getOptionalString(formData, "planningAssumptions"),
        planningNotes: getOptionalString(formData, "planningNotes"),
        planningStatus: getOptionalString(formData, "planningStatus"),
        reason: getOptionalString(formData, "reason"),
        specialInstructions: getOptionalString(formData, "specialInstructions"),
        successCriteria: getOptionalString(formData, "successCriteria"),
        weather: getOptionalString(formData, "weather"),
        weekNumber: getRequiredNumber(formData, "weekNumber"),
      });
    },
    "Planning updated.",
  );
}

export async function updateWeeklyTaskingAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await operationsPackageService.updateWeeklyTasking({
        campaignId: getRequiredString(formData, "campaignId"),
        commandersIntent: getOptionalString(formData, "commandersIntent"),
        enemySituation: getOptionalString(formData, "enemySituation"),
        friendlySituation: getOptionalString(formData, "friendlySituation"),
        intelligenceSummary: getOptionalString(formData, "intelligenceSummary"),
        logisticsNotes: getOptionalString(formData, "logisticsNotes"),
        operationalNotes: getOptionalString(formData, "operationalNotes"),
        operationalSummary: getOptionalString(formData, "operationalSummary"),
        reason: getOptionalString(formData, "reason"),
        specialInstructions: getOptionalString(formData, "specialInstructions"),
        timeline: getOptionalString(formData, "timeline"),
        weather: getOptionalString(formData, "weather"),
        weekNumber: getRequiredNumber(formData, "weekNumber"),
      });
    },
    "Weekly tasking updated.",
  );
}

export async function updateUnitTaskingAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await operationsPackageService.updateUnitTasking({
        primaryObjective: getOptionalString(formData, "primaryObjective"),
        reason: getOptionalString(formData, "reason"),
        secondaryObjective: getOptionalString(formData, "secondaryObjective"),
        specialEquipment: getOptionalString(formData, "specialEquipment"),
        specialInstructions: getOptionalString(formData, "specialInstructions"),
        supportingAssets: getOptionalString(formData, "supportingAssets"),
        unitNotes: getOptionalString(formData, "unitNotes"),
        unitTaskingId: getRequiredString(formData, "unitTaskingId"),
      });
    },
    "Unit tasking updated.",
  );
}

export async function publishOperationsPackageAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await operationsPackageService.publishPackage({
        amendmentSummary: getOptionalString(formData, "amendmentSummary"),
        campaignId: getRequiredString(formData, "campaignId"),
        releaseNotes: getOptionalString(formData, "releaseNotes"),
        scheduledFor: getOptionalDate(formData, "scheduledFor"),
        versionBump: getVersionBump(formData),
        weekNumber: getRequiredNumber(formData, "weekNumber"),
      });
    },
    "Operations Release publication started.",
  );
}

export async function updateIntentAssessmentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await operationsPackageService.updateIntentAssessment({
        assessmentSummary: getOptionalString(formData, "assessmentSummary"),
        campaignId: getRequiredString(formData, "campaignId"),
        lessonsLearned: getOptionalString(formData, "lessonsLearned"),
        nextWeekRecommendations: getOptionalString(formData, "nextWeekRecommendations"),
        status: getRequiredString(formData, "status") || "deferred",
        supportingEvidence: getOptionalString(formData, "supportingEvidence"),
        weekNumber: getRequiredNumber(formData, "weekNumber"),
      });
    },
    "Commander intent assessment updated.",
  );
}

export async function dismissRecommendationAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await dismissRecommendation({
        reason: getOptionalString(formData, "reason"),
        recommendationId: getRequiredString(formData, "recommendationId"),
      });
    },
    "Recommendation dismissed.",
  );
}

export async function resolveRecommendationAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await resolveRecommendation({
        reason: getOptionalString(formData, "reason"),
        recommendationId: getRequiredString(formData, "recommendationId"),
      });
    },
    "Recommendation marked resolved.",
  );
}
