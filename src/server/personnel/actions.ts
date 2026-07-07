"use server";

import { redirect } from "next/navigation";

import {
  changePosition,
  changeRank,
  changeStatus,
  changeUnit,
  createMemberProfile,
  updateMemberProfile,
} from "@/server/personnel/service";

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

function withFlash(returnTo: string, key: "message" | "error", value: string) {
  const [pathname, existingQuery] = returnTo.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  params.set(key, value);

  return `${pathname}?${params.toString()}`;
}

async function runAction(
  formData: FormData,
  operation: () => Promise<void | { id: string }>,
  successMessage: string,
) {
  const returnTo = getRequiredString(formData, "returnTo") || "/personnel/members";

  try {
    const result = await operation();

    if (result && "id" in result) {
      redirect(withFlash(`/personnel/members/${result.id}`, "message", successMessage));
    }

    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function createMemberProfileAction(formData: FormData) {
  await runAction(
    formData,
    () =>
      createMemberProfile({
        displayName: getRequiredString(formData, "displayName"),
        firstName: getOptionalString(formData, "firstName"),
        lastName: getOptionalString(formData, "lastName"),
        callsign: getOptionalString(formData, "callsign"),
        joinDate: getOptionalDate(formData, "joinDate"),
        statusId: getRequiredString(formData, "statusId"),
        rankId: getOptionalString(formData, "rankId"),
        unitId: getOptionalString(formData, "unitId"),
        positionId: getOptionalString(formData, "positionId"),
        positionTitle: getOptionalString(formData, "positionTitle"),
        reason: getOptionalString(formData, "reason"),
      }),
    "Member profile created.",
  );
}

export async function updateMemberProfileAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await updateMemberProfile({
        id: getRequiredString(formData, "memberProfileId"),
        displayName: getRequiredString(formData, "displayName"),
        firstName: getOptionalString(formData, "firstName"),
        lastName: getOptionalString(formData, "lastName"),
        callsign: getOptionalString(formData, "callsign"),
        joinDate: getOptionalDate(formData, "joinDate"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Profile updated.",
  );
}

export async function changeRankAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await changeRank({
        memberProfileId: getRequiredString(formData, "memberProfileId"),
        rankId: getOptionalString(formData, "rankId"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Rank updated.",
  );
}

export async function changeUnitAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await changeUnit({
        memberProfileId: getRequiredString(formData, "memberProfileId"),
        unitId: getRequiredString(formData, "unitId"),
        rankId: getOptionalString(formData, "rankId"),
        positionId: getOptionalString(formData, "positionId"),
        positionTitle: getOptionalString(formData, "positionTitle"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Unit assignment updated.",
  );
}

export async function changePositionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await changePosition({
        memberProfileId: getRequiredString(formData, "memberProfileId"),
        unitId: getOptionalString(formData, "unitId"),
        positionId: getOptionalString(formData, "positionId"),
        positionTitle: getOptionalString(formData, "positionTitle"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Position updated.",
  );
}

export async function changeStatusAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await changeStatus({
        memberProfileId: getRequiredString(formData, "memberProfileId"),
        statusId: getRequiredString(formData, "statusId"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Status updated.",
  );
}
