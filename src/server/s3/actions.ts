"use server";

import { redirect } from "next/navigation";

import {
  approveMission,
  archiveMission,
  createConop,
  createMission,
  editAar,
  editConop,
  editMission,
  linkAarToCampaign,
  linkAarToEvent,
  linkConopToCampaign,
  linkConopToEvent,
  publishConop,
  publishMission,
  rejectMission,
  reviewAar,
  submitAar,
  submitMissionForReview,
  updateMissionStatus,
} from "@/server/s3/service";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRequiredDate(formData: FormData, key: string) {
  return new Date(getRequiredString(formData, key));
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? new Date(value) : null;
}

async function getFileInput(formData: FormData, key: string) {
  const file = formData.get(key);

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return {
    bytes: Buffer.from(await file.arrayBuffer()),
    name: file.name,
    type: file.type || "application/octet-stream",
  };
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
  fallbackReturnTo: string,
) {
  const returnTo = getRequiredString(formData, "returnTo") || fallbackReturnTo;

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function createMissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createMission({
        title: getRequiredString(formData, "title"),
        description: getOptionalString(formData, "description"),
        eventType: getRequiredString(formData, "eventType"),
        hostUnitId: getOptionalString(formData, "hostUnitId"),
        campaignId: getOptionalString(formData, "campaignId"),
        startsAt: getRequiredDate(formData, "startsAt"),
        endsAt: getOptionalDate(formData, "endsAt"),
        missionMakerName: getOptionalString(formData, "missionMakerName"),
        zeusName: getOptionalString(formData, "zeusName"),
        missionCommanderName: getOptionalString(formData, "missionCommanderName"),
        operationVersionLabel: getOptionalString(formData, "operationVersionLabel"),
        selectedOperationVersion: getOptionalString(formData, "selectedOperationVersion"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Operation created.",
    "/operations/s3",
  );
}

export async function editMissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await editMission({
        missionId: getRequiredString(formData, "missionId"),
        title: getRequiredString(formData, "title"),
        description: getOptionalString(formData, "description"),
        eventType: getRequiredString(formData, "eventType"),
        hostUnitId: getOptionalString(formData, "hostUnitId"),
        campaignId: getOptionalString(formData, "campaignId"),
        startsAt: getRequiredDate(formData, "startsAt"),
        endsAt: getOptionalDate(formData, "endsAt"),
        missionMakerName: getOptionalString(formData, "missionMakerName"),
        zeusName: getOptionalString(formData, "zeusName"),
        missionCommanderName: getOptionalString(formData, "missionCommanderName"),
        operationVersionLabel: getOptionalString(formData, "operationVersionLabel"),
        selectedOperationVersion: getOptionalString(formData, "selectedOperationVersion"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Operation updated.",
    "/operations/s3",
  );
}

export async function updateMissionStatusAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await updateMissionStatus(
        getRequiredString(formData, "missionId"),
        getRequiredString(formData, "missionStatus"),
        getOptionalString(formData, "reason"),
      );
    },
    "Operation status updated.",
    "/operations/s3",
  );
}

export async function submitMissionForReviewAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await submitMissionForReview(
        getRequiredString(formData, "missionId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Operation submitted for review.",
    "/operations/s3",
  );
}

export async function approveMissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await approveMission(
        getRequiredString(formData, "missionId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Operation approved.",
    "/operations/s3",
  );
}

export async function rejectMissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await rejectMission(
        getRequiredString(formData, "missionId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Operation returned to draft.",
    "/operations/s3",
  );
}

export async function publishMissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await publishMission(
        getRequiredString(formData, "missionId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Operation published.",
    "/operations/s3",
  );
}

export async function archiveMissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await archiveMission(
        getRequiredString(formData, "missionId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Operation archived.",
    "/operations/s3",
  );
}

export async function createConopAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createConop({
        title: getRequiredString(formData, "title"),
        eventId: getOptionalString(formData, "eventId"),
        campaignId: getOptionalString(formData, "campaignId"),
        situation: getOptionalString(formData, "situation"),
        mission: getOptionalString(formData, "mission"),
        execution: getOptionalString(formData, "execution"),
        sustainment: getOptionalString(formData, "sustainment"),
        commandSignal: getOptionalString(formData, "commandSignal"),
        mapName: getOptionalString(formData, "mapName"),
        modPreset: getOptionalString(formData, "modPreset"),
        participatingUnitsSummary: getOptionalString(formData, "participatingUnitsSummary"),
        missionMakerName: getOptionalString(formData, "missionMakerName"),
        zeusName: getOptionalString(formData, "zeusName"),
        missionCommanderName: getOptionalString(formData, "missionCommanderName"),
        specialInstructions: getOptionalString(formData, "specialInstructions"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "CONOP created.",
    "/operations/conops",
  );
}

export async function editConopAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await editConop({
        conopId: getRequiredString(formData, "conopId"),
        title: getRequiredString(formData, "title"),
        eventId: getOptionalString(formData, "eventId"),
        campaignId: getOptionalString(formData, "campaignId"),
        situation: getOptionalString(formData, "situation"),
        mission: getOptionalString(formData, "mission"),
        execution: getOptionalString(formData, "execution"),
        sustainment: getOptionalString(formData, "sustainment"),
        commandSignal: getOptionalString(formData, "commandSignal"),
        mapName: getOptionalString(formData, "mapName"),
        modPreset: getOptionalString(formData, "modPreset"),
        participatingUnitsSummary: getOptionalString(formData, "participatingUnitsSummary"),
        missionMakerName: getOptionalString(formData, "missionMakerName"),
        zeusName: getOptionalString(formData, "zeusName"),
        missionCommanderName: getOptionalString(formData, "missionCommanderName"),
        specialInstructions: getOptionalString(formData, "specialInstructions"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "CONOP updated.",
    "/operations/conops",
  );
}

export async function publishConopAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await publishConop(
        getRequiredString(formData, "conopId"),
        getOptionalString(formData, "reason"),
      );
    },
    "CONOP published.",
    "/operations/conops",
  );
}

export async function linkConopToEventAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await linkConopToEvent(
        getRequiredString(formData, "conopId"),
        getRequiredString(formData, "eventId"),
        getOptionalString(formData, "reason"),
      );
    },
    "CONOP linked to event.",
    "/operations/conops",
  );
}

export async function linkConopToCampaignAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await linkConopToCampaign(
        getRequiredString(formData, "conopId"),
        getRequiredString(formData, "campaignId"),
        getOptionalString(formData, "reason"),
      );
    },
    "CONOP linked to deployment.",
    "/operations/conops",
  );
}

export async function submitAarAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await submitAar({
        title: getRequiredString(formData, "title"),
        eventId: getOptionalString(formData, "eventId"),
        campaignId: getOptionalString(formData, "campaignId"),
        patrolLeaderName: getOptionalString(formData, "patrolLeaderName"),
        summary: getOptionalString(formData, "summary"),
        wentWell: getOptionalString(formData, "wentWell"),
        needsImprovement: getOptionalString(formData, "needsImprovement"),
        friendlyCasualties: getOptionalString(formData, "friendlyCasualties"),
        enemyCasualties: getOptionalString(formData, "enemyCasualties"),
        equipmentLosses: getOptionalString(formData, "equipmentLosses"),
        actionItems: getOptionalString(formData, "actionItems"),
        additionalNotes: getOptionalString(formData, "additionalNotes"),
        callsigns: getOptionalString(formData, "callsigns"),
        dtg: getOptionalString(formData, "dtg"),
        ekia: getOptionalString(formData, "ekia"),
        fkia: getOptionalString(formData, "fkia"),
        fmia: getOptionalString(formData, "fmia"),
        fwia: getOptionalString(formData, "fwia"),
        mapScreenshot: await getFileInput(formData, "mapScreenshot"),
        supportingMedia: await getFileInput(formData, "supportingMedia"),
        report: getOptionalString(formData, "report"),
        tasking: getOptionalString(formData, "tasking"),
        aarProgressionRecommendation: getOptionalString(formData, "aarProgressionRecommendation"),
        aarNextVersionRecommendation: getOptionalString(formData, "aarNextVersionRecommendation"),
        aarProgressionDecision: getOptionalString(formData, "aarProgressionDecision"),
        aarProgressionNotes: getOptionalString(formData, "aarProgressionNotes"),
        aarEnemyActivityNotes: getOptionalString(formData, "aarEnemyActivityNotes"),
        aarFriendlyActivityNotes: getOptionalString(formData, "aarFriendlyActivityNotes"),
        aarUnitPerformanceNotes: getOptionalString(formData, "aarUnitPerformanceNotes"),
        aarTaskingAdjustments: getOptionalString(formData, "aarTaskingAdjustments"),
        aarPlanningNotesNextWeek: getOptionalString(formData, "aarPlanningNotesNextWeek"),
        aarLessonsLearned: getOptionalString(formData, "aarLessonsLearned"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "AAR submitted.",
    "/operations/aars",
  );
}

export async function editAarAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await editAar({
        aarId: getRequiredString(formData, "aarId"),
        title: getRequiredString(formData, "title"),
        eventId: getOptionalString(formData, "eventId"),
        campaignId: getOptionalString(formData, "campaignId"),
        patrolLeaderName: getOptionalString(formData, "patrolLeaderName"),
        summary: getOptionalString(formData, "summary"),
        wentWell: getOptionalString(formData, "wentWell"),
        needsImprovement: getOptionalString(formData, "needsImprovement"),
        friendlyCasualties: getOptionalString(formData, "friendlyCasualties"),
        enemyCasualties: getOptionalString(formData, "enemyCasualties"),
        equipmentLosses: getOptionalString(formData, "equipmentLosses"),
        actionItems: getOptionalString(formData, "actionItems"),
        additionalNotes: getOptionalString(formData, "additionalNotes"),
        callsigns: getOptionalString(formData, "callsigns"),
        dtg: getOptionalString(formData, "dtg"),
        ekia: getOptionalString(formData, "ekia"),
        fkia: getOptionalString(formData, "fkia"),
        fmia: getOptionalString(formData, "fmia"),
        fwia: getOptionalString(formData, "fwia"),
        mapScreenshot: await getFileInput(formData, "mapScreenshot"),
        supportingMedia: await getFileInput(formData, "supportingMedia"),
        report: getOptionalString(formData, "report"),
        tasking: getOptionalString(formData, "tasking"),
        aarProgressionRecommendation: getOptionalString(formData, "aarProgressionRecommendation"),
        aarNextVersionRecommendation: getOptionalString(formData, "aarNextVersionRecommendation"),
        aarProgressionDecision: getOptionalString(formData, "aarProgressionDecision"),
        aarProgressionNotes: getOptionalString(formData, "aarProgressionNotes"),
        aarEnemyActivityNotes: getOptionalString(formData, "aarEnemyActivityNotes"),
        aarFriendlyActivityNotes: getOptionalString(formData, "aarFriendlyActivityNotes"),
        aarUnitPerformanceNotes: getOptionalString(formData, "aarUnitPerformanceNotes"),
        aarTaskingAdjustments: getOptionalString(formData, "aarTaskingAdjustments"),
        aarPlanningNotesNextWeek: getOptionalString(formData, "aarPlanningNotesNextWeek"),
        aarLessonsLearned: getOptionalString(formData, "aarLessonsLearned"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "AAR updated.",
    "/operations/aars",
  );
}

export async function reviewAarAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await reviewAar(
        getRequiredString(formData, "aarId"),
        getRequiredString(formData, "status"),
        {
          aarNextVersionRecommendation: getOptionalString(formData, "aarNextVersionRecommendation"),
          aarProgressionDecision: getOptionalString(formData, "aarProgressionDecision"),
          aarProgressionNotes: getOptionalString(formData, "aarProgressionNotes"),
          aarProgressionRecommendation: getOptionalString(formData, "aarProgressionRecommendation"),
          aarEnemyActivityNotes: getOptionalString(formData, "aarEnemyActivityNotes"),
          aarFriendlyActivityNotes: getOptionalString(formData, "aarFriendlyActivityNotes"),
          aarTaskingAdjustments: getOptionalString(formData, "aarTaskingAdjustments"),
          aarPlanningNotesNextWeek: getOptionalString(formData, "aarPlanningNotesNextWeek"),
          aarLessonsLearned: getOptionalString(formData, "aarLessonsLearned"),
          aarUnitPerformanceNotes: getOptionalString(formData, "aarUnitPerformanceNotes"),
          reason: getOptionalString(formData, "reason"),
        },
      );
    },
    "AAR review saved.",
    "/operations/aars",
  );
}

export async function linkAarToEventAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await linkAarToEvent(
        getRequiredString(formData, "aarId"),
        getRequiredString(formData, "eventId"),
        getOptionalString(formData, "reason"),
      );
    },
    "AAR linked to event.",
    "/operations/aars",
  );
}

export async function linkAarToCampaignAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await linkAarToCampaign(
        getRequiredString(formData, "aarId"),
        getRequiredString(formData, "campaignId"),
        getOptionalString(formData, "reason"),
      );
    },
    "AAR linked to deployment.",
    "/operations/aars",
  );
}
