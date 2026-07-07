"use server";

import { redirect } from "next/navigation";

import {
  bulkUpdateAttendance,
  lockAttendance,
  recordFinalAttendance,
  updateRsvp,
} from "@/server/attendance/service";
import { isFinalAttendanceStatus, isRsvpStatus } from "@/server/events/utils";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
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
  const returnTo = getRequiredString(formData, "returnTo") || "/operations/attendance";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function updateRsvpAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      const rsvpStatus = getRequiredString(formData, "rsvpStatus");

      if (!isRsvpStatus(rsvpStatus)) {
        throw new Error("Select a valid RSVP status.");
      }

      await updateRsvp({
        eventId: getRequiredString(formData, "eventId"),
        memberProfileId: getOptionalString(formData, "memberProfileId"),
        rsvpStatus,
        reason: getOptionalString(formData, "reason"),
      });
    },
    "RSVP updated.",
  );
}

export async function recordAttendanceAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      const finalStatus = getRequiredString(formData, "finalStatus");

      if (!isFinalAttendanceStatus(finalStatus)) {
        throw new Error("Select a valid final attendance status.");
      }

      await recordFinalAttendance({
        eventId: getRequiredString(formData, "eventId"),
        memberProfileId: getRequiredString(formData, "memberProfileId"),
        finalStatus,
        notes: getOptionalString(formData, "notes"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Attendance recorded.",
  );
}

export async function bulkUpdateAttendanceAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      const eventId = getRequiredString(formData, "eventId");
      const updates = Array.from(formData.keys())
        .filter((key) => key.startsWith("memberProfileId:"))
        .map((key) => key.replace("memberProfileId:", ""))
        .map((memberProfileId) => {
          const rsvpStatusValue = getOptionalString(formData, `rsvpStatus:${memberProfileId}`);
          const finalStatusValue = getOptionalString(formData, `finalStatus:${memberProfileId}`);

          return {
            memberProfileId,
            rsvpStatus:
              rsvpStatusValue && isRsvpStatus(rsvpStatusValue)
                ? rsvpStatusValue
                : rsvpStatusValue === ""
                  ? null
                  : undefined,
            finalStatus:
              finalStatusValue && isFinalAttendanceStatus(finalStatusValue)
                ? finalStatusValue
                : finalStatusValue === ""
                  ? null
                  : undefined,
            notes: getOptionalString(formData, `notes:${memberProfileId}`),
          };
        });

      await bulkUpdateAttendance({
        eventId,
        updates,
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Attendance updates saved.",
  );
}

export async function lockAttendanceAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await lockAttendance(
        getRequiredString(formData, "eventId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Attendance locked.",
  );
}
