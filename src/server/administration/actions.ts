"use server";

import { redirect } from "next/navigation";

import {
  assignRoleToUser,
  createAdministrationRole,
  disableAdministrationRole,
  editAdministrationRole,
  removeRoleFromUser,
  setUserActiveState,
  updateRolePermissions,
} from "@/server/administration/service";

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

function assertConfirmed(formData: FormData, key: string, label: string) {
  if (formData.get(key) !== "on") {
    throw new Error(`Confirm the ${label.toLowerCase()} before continuing.`);
  }
}

async function runAction(
  formData: FormData,
  operation: () => Promise<void>,
  successMessage: string,
) {
  const returnTo = getRequiredString(formData, "returnTo") || "/administration";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function setUserActiveStateAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      const nextState = getRequiredString(formData, "nextState");

      if (nextState !== "active" && nextState !== "inactive") {
        throw new Error("Select a valid user state.");
      }

      if (nextState === "inactive") {
        assertConfirmed(formData, "confirmDeactivate", "deactivation");
      }

      await setUserActiveState({
        isActive: nextState === "active",
        reason: getOptionalString(formData, "reason"),
        userId: getRequiredString(formData, "userId"),
      });
    },
    "User state updated.",
  );
}

export async function createAdministrationRoleAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createAdministrationRole({
        description: getOptionalString(formData, "description"),
        label: getRequiredString(formData, "label"),
        name: getRequiredString(formData, "name"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Role created.",
  );
}

export async function editAdministrationRoleAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await editAdministrationRole({
        description: getOptionalString(formData, "description"),
        label: getRequiredString(formData, "label"),
        name: getOptionalString(formData, "name"),
        reason: getOptionalString(formData, "reason"),
        roleId: getRequiredString(formData, "roleId"),
      });
    },
    "Role updated.",
  );
}

export async function disableAdministrationRoleAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      assertConfirmed(formData, "confirmDisable", "role disable");

      await disableAdministrationRole({
        reason: getOptionalString(formData, "reason"),
        roleId: getRequiredString(formData, "roleId"),
      });
    },
    "Role disabled.",
  );
}

export async function updateRolePermissionsAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      const permissionIds = formData
        .getAll("permissionId")
        .map((value) => (typeof value === "string" ? value : ""))
        .filter(Boolean);

      await updateRolePermissions({
        permissionIds,
        reason: getOptionalString(formData, "reason"),
        roleId: getRequiredString(formData, "roleId"),
      });
    },
    "Role permissions updated.",
  );
}

export async function assignRoleToUserAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await assignRoleToUser({
        reason: getOptionalString(formData, "reason"),
        roleId: getRequiredString(formData, "roleId"),
        unitId: getOptionalString(formData, "unitId"),
        userId: getRequiredString(formData, "userId"),
      });
    },
    "Role assigned to user.",
  );
}

export async function removeRoleFromUserAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      assertConfirmed(formData, "confirmRemove", "role removal");

      await removeRoleFromUser({
        reason: getOptionalString(formData, "reason"),
        userRoleId: getRequiredString(formData, "userRoleId"),
      });
    },
    "Role removed from user.",
  );
}
