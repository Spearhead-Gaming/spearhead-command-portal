"use server";

import { redirect } from "next/navigation";

import {
  archiveCampaign,
  createCampaign,
  editCampaign,
  linkEventToCampaign,
  publishCampaign,
  unlinkEventFromCampaign,
  updateCampaignPhase,
  updateCampaignStatus,
} from "@/server/campaigns/service";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? new Date(value) : null;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
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
  const returnTo = getRequiredString(formData, "returnTo") || "/operations/campaigns";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function createCampaignAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createCampaign({
        key: getRequiredString(formData, "key"),
        title: getRequiredString(formData, "title"),
        summary: getOptionalString(formData, "summary"),
        phase: getOptionalString(formData, "phase"),
        deploymentDurationWeeks: getOptionalNumber(formData, "deploymentDurationWeeks"),
        zeusAssignmentType: getOptionalString(formData, "zeusAssignmentType"),
        zeusUserId: getOptionalString(formData, "zeusUserId"),
        startsAt: getOptionalDate(formData, "startsAt"),
        endsAt: getOptionalDate(formData, "endsAt"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Deployment created.",
  );
}

export async function editCampaignAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await editCampaign({
        campaignId: getRequiredString(formData, "campaignId"),
        key: getRequiredString(formData, "key"),
        title: getRequiredString(formData, "title"),
        summary: getOptionalString(formData, "summary"),
        phase: getOptionalString(formData, "phase"),
        deploymentDurationWeeks: getOptionalNumber(formData, "deploymentDurationWeeks"),
        zeusAssignmentType: getOptionalString(formData, "zeusAssignmentType"),
        zeusUserId: getOptionalString(formData, "zeusUserId"),
        startsAt: getOptionalDate(formData, "startsAt"),
        endsAt: getOptionalDate(formData, "endsAt"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Deployment updated.",
  );
}

export async function publishCampaignAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await publishCampaign(
        getRequiredString(formData, "campaignId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Deployment published.",
  );
}

export async function archiveCampaignAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await archiveCampaign(
        getRequiredString(formData, "campaignId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Deployment archived.",
  );
}

export async function updateCampaignStatusAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await updateCampaignStatus(
        getRequiredString(formData, "campaignId"),
        getRequiredString(formData, "status"),
        getOptionalString(formData, "reason"),
      );
    },
    "Deployment status updated.",
  );
}

export async function updateCampaignPhaseAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await updateCampaignPhase(
        getRequiredString(formData, "campaignId"),
        getOptionalString(formData, "phase"),
        getOptionalString(formData, "reason"),
      );
    },
    "Deployment phase updated.",
  );
}

export async function linkEventToCampaignAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await linkEventToCampaign(
        getRequiredString(formData, "campaignId"),
        getRequiredString(formData, "eventId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Event linked to deployment.",
  );
}

export async function unlinkEventFromCampaignAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await unlinkEventFromCampaign(
        getRequiredString(formData, "eventId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Event unlinked from deployment.",
  );
}
