"use server";

import { redirect } from "next/navigation";

import {
  archiveQualification,
  awardQualification,
  completeQualificationSignoff,
  createQualification,
  editQualification,
  manageQualificationRequirement,
  removeQualificationRequirement,
  revokeQualification,
  updateQualificationRecord,
} from "@/server/qualifications/service";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? new Date(value) : null;
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
  const returnTo = getRequiredString(formData, "returnTo") || "/personnel/qualifications";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function createQualificationAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createQualification({
        key: getRequiredString(formData, "key"),
        label: getRequiredString(formData, "label"),
        description: getOptionalString(formData, "description"),
        categoryId: getRequiredString(formData, "categoryId"),
        expiresAfterDays: getOptionalNumber(formData, "expiresAfterDays"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Qualification created.",
  );
}

export async function editQualificationAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await editQualification({
        id: getRequiredString(formData, "qualificationId"),
        key: getRequiredString(formData, "key"),
        label: getRequiredString(formData, "label"),
        description: getOptionalString(formData, "description"),
        categoryId: getRequiredString(formData, "categoryId"),
        expiresAfterDays: getOptionalNumber(formData, "expiresAfterDays"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Qualification updated.",
  );
}

export async function archiveQualificationAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await archiveQualification(
        getRequiredString(formData, "qualificationId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Qualification archived.",
  );
}

export async function awardQualificationAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await awardQualification({
        memberProfileId: getRequiredString(formData, "memberProfileId"),
        qualificationId: getRequiredString(formData, "qualificationId"),
        status:
          getRequiredString(formData, "status") === "pending_signoff"
            ? "pending_signoff"
            : "qualified",
        awardedAt: getOptionalDate(formData, "awardedAt"),
        expiresAt: getOptionalDate(formData, "expiresAt"),
        notes: getOptionalString(formData, "notes"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Qualification awarded.",
  );
}

export async function updateQualificationRecordAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await updateQualificationRecord({
        recordId: getRequiredString(formData, "recordId"),
        status:
          getRequiredString(formData, "status") === "pending_signoff"
            ? "pending_signoff"
            : "qualified",
        awardedAt: getOptionalDate(formData, "awardedAt"),
        expiresAt: getOptionalDate(formData, "expiresAt"),
        notes: getOptionalString(formData, "notes"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Qualification record updated.",
  );
}

export async function revokeQualificationAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await revokeQualification({
        recordId: getRequiredString(formData, "recordId"),
        revokedAt: getOptionalDate(formData, "revokedAt"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Qualification revoked.",
  );
}

export async function completeQualificationSignoffAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await completeQualificationSignoff({
        recordId: getRequiredString(formData, "recordId"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Qualification sign-off completed.",
  );
}

export async function manageQualificationRequirementAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await manageQualificationRequirement({
        qualificationId: getRequiredString(formData, "qualificationId"),
        unitId: getOptionalString(formData, "unitId"),
        positionId: getOptionalString(formData, "positionId"),
        isRequired: getRequiredString(formData, "isRequired") !== "false",
        dueWithinDays: getOptionalNumber(formData, "dueWithinDays"),
        notes: getOptionalString(formData, "notes"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Qualification requirement saved.",
  );
}

export async function removeQualificationRequirementAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await removeQualificationRequirement(
        getRequiredString(formData, "requirementId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Qualification requirement removed.",
  );
}
