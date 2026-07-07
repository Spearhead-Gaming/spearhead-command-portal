"use server";

import { redirect } from "next/navigation";

import {
  addPatrolParticipant,
  completePatrol,
  recordPatrolRsvp,
  removePatrolParticipant,
  startPatrol,
} from "@/server/patrols/service";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);

  return value || null;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  const parsed = Number(value);

  return value && Number.isFinite(parsed) ? parsed : null;
}

function withFlash(
  returnTo: string,
  key: "error" | "message",
  value: string,
  updates?: Record<string, string | null | undefined>,
) {
  const [pathname, existingQuery] = returnTo.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  params.set(key, value);

  for (const [updateKey, updateValue] of Object.entries(updates ?? {})) {
    if (updateValue) {
      params.set(updateKey, updateValue);
    } else {
      params.delete(updateKey);
    }
  }

  return `${pathname}?${params.toString()}`;
}

export async function startPatrolAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/operations/patrols";
  let redirectTo = "";

  try {
    const patrol = await startPatrol({
      campaignId: getOptionalString(formData, "campaignId"),
      deploymentWeek: getOptionalNumber(formData, "deploymentWeek"),
      description: getOptionalString(formData, "description"),
      estimatedDurationMinutes: getOptionalNumber(formData, "estimatedDurationMinutes"),
      patrolName: getString(formData, "patrolName"),
      patrolType: getOptionalString(formData, "patrolType"),
      reason: "Patrol started from portal quick action.",
      source: "portal",
    });

    redirectTo = withFlash(returnTo, "message", "Patrol started.", {
      inspect: patrol.id,
      panel: null,
    });
  } catch (error) {
    redirectTo = withFlash(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to start patrol.",
    );
  }

  redirect(redirectTo);
}

export async function completePatrolAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/operations/patrols";
  let redirectTo = "";

  try {
    const patrol = await completePatrol({
      patrolId: getString(formData, "patrolId"),
      reason: getOptionalString(formData, "reason") ?? "Patrol completed from portal.",
      source: "portal",
    });

    redirectTo = withFlash(returnTo, "message", "Patrol completed. Submit the Patrol AAR next.", {
      inspect: patrol.id,
    });
  } catch (error) {
    redirectTo = withFlash(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to complete patrol.",
    );
  }

  redirect(redirectTo);
}

export async function addPatrolParticipantAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/operations/patrols";
  let redirectTo = "";

  try {
    await addPatrolParticipant({
      memberProfileId: getString(formData, "memberProfileId"),
      notes: getOptionalString(formData, "notes"),
      patrolId: getString(formData, "patrolId"),
      reason: "Patrol participant managed from portal.",
    });

    redirectTo = withFlash(returnTo, "message", "Participant added.");
  } catch (error) {
    redirectTo = withFlash(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to add participant.",
    );
  }

  redirect(redirectTo);
}

export async function removePatrolParticipantAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/operations/patrols";
  let redirectTo = "";

  try {
    await removePatrolParticipant({
      participantId: getString(formData, "participantId"),
      reason: "Patrol participant removed from portal.",
    });

    redirectTo = withFlash(returnTo, "message", "Participant removed.");
  } catch (error) {
    redirectTo = withFlash(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to remove participant.",
    );
  }

  redirect(redirectTo);
}

export async function recordPatrolInterestAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/operations/patrols";
  let redirectTo = "";

  try {
    await recordPatrolRsvp({
      patrolId: getString(formData, "patrolId"),
      source: "portal",
    });

    redirectTo = withFlash(returnTo, "message", "Patrol interest recorded.");
  } catch (error) {
    redirectTo = withFlash(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to record patrol interest.",
    );
  }

  redirect(redirectTo);
}
