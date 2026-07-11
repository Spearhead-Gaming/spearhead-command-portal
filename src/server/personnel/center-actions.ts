"use server";

import { redirect } from "next/navigation";

import {
  createPersonnelAction,
  reviewLeaveOfAbsence,
  reviewTransferRequest,
  submitLeaveOfAbsence,
  submitTransferRequest,
  upsertAttendancePolicy,
} from "@/server/personnel/center-service";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);

  return value || null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? new Date(value) : null;
}

function getRequiredDate(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return new Date(value);
}

function getRequiredNumber(formData: FormData, key: string) {
  const value = Number(getRequiredString(formData, key));

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a number.`);
  }

  return value;
}

function withFlash(returnTo: string, key: "message" | "error", value: string) {
  const [pathname, existingQuery] = returnTo.split("?");
  const params = new URLSearchParams(existingQuery ?? "");

  params.set(key, value);

  return `${pathname}?${params.toString()}`;
}

async function runCenterAction(formData: FormData, operation: () => Promise<unknown>, successMessage: string) {
  const returnTo = getRequiredString(formData, "returnTo") || "/personnel";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the personnel request.";

    redirect(withFlash(returnTo, "error", message));
  }
}

export async function createPersonnelActionAction(formData: FormData) {
  await runCenterAction(
    formData,
    () =>
      createPersonnelAction({
        actionType: getRequiredString(formData, "actionType"),
        assignedToId: getOptionalString(formData, "assignedToId"),
        dueAt: getOptionalDate(formData, "dueAt"),
        memberProfileId: getOptionalString(formData, "memberProfileId"),
        priority: getOptionalString(formData, "priority"),
        summary: getRequiredString(formData, "summary"),
        title: getRequiredString(formData, "title"),
      }),
    "Personnel action created.",
  );
}

export async function submitTransferRequestAction(formData: FormData) {
  await runCenterAction(
    formData,
    () =>
      submitTransferRequest({
        memberProfileId: getRequiredString(formData, "memberProfileId"),
        reason: getRequiredString(formData, "reason"),
        requestedUnitId: getRequiredString(formData, "requestedUnitId"),
      }),
    "Transfer request submitted.",
  );
}

export async function reviewTransferRequestAction(formData: FormData) {
  await runCenterAction(
    formData,
    () =>
      reviewTransferRequest({
        effectiveDate: getOptionalDate(formData, "effectiveDate"),
        reviewNotes: getOptionalString(formData, "reviewNotes"),
        status: getRequiredString(formData, "status") === "approved" ? "approved" : "denied",
        transferRequestId: getRequiredString(formData, "transferRequestId"),
      }),
    "Transfer review recorded.",
  );
}

export async function submitLeaveOfAbsenceAction(formData: FormData) {
  await runCenterAction(
    formData,
    () =>
      submitLeaveOfAbsence({
        expectedReturnAt: getOptionalDate(formData, "expectedReturnAt"),
        memberProfileId: getRequiredString(formData, "memberProfileId"),
        reason: getOptionalString(formData, "reason"),
        startsAt: getRequiredDate(formData, "startsAt"),
      }),
    "LOA request submitted.",
  );
}

export async function reviewLeaveOfAbsenceAction(formData: FormData) {
  const status = getRequiredString(formData, "status");

  await runCenterAction(
    formData,
    () =>
      reviewLeaveOfAbsence({
        leaveId: getRequiredString(formData, "leaveId"),
        reviewNotes: getOptionalString(formData, "reviewNotes"),
        status: status === "approved" || status === "returned" ? status : "denied",
      }),
    "LOA review recorded.",
  );
}

export async function upsertAttendancePolicyAction(formData: FormData) {
  await runCenterAction(
    formData,
    () =>
      upsertAttendancePolicy({
        lookbackDays: getRequiredNumber(formData, "lookbackDays"),
        minimumAttendancePercent: getRequiredNumber(formData, "minimumAttendancePercent"),
        notes: getOptionalString(formData, "notes"),
        unitId: getRequiredString(formData, "unitId"),
      }),
    "Attendance policy updated.",
  );
}
