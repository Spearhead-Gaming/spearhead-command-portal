"use server";

import { redirect } from "next/navigation";

import {
  archiveDeploymentResource,
  upsertDeploymentResource,
} from "@/server/deployment-resources/service";

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);
  const parsed = value ? Number.parseInt(value, 10) : null;

  return parsed && !Number.isNaN(parsed) ? parsed : null;
}

async function getFileInput(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return {
    bytes: Buffer.from(await file.arrayBuffer()),
    name: file.name,
    type: file.type || "application/octet-stream",
  };
}

export async function upsertDeploymentResourceAction(formData: FormData) {
  const returnTo = getRequiredString(formData, "returnTo", "Return path");

  try {
    await upsertDeploymentResource({
      campaignId: getRequiredString(formData, "campaignId", "Deployment"),
      changeNote: getOptionalString(formData, "changeNote"),
      description: getOptionalString(formData, "description"),
      displayName: getRequiredString(formData, "displayName", "Display name"),
      displayOrder: getOptionalNumber(formData, "displayOrder"),
      eventId: getOptionalString(formData, "eventId"),
      file: await getFileInput(formData),
      resourceId: getOptionalString(formData, "resourceId"),
      resourceType: getRequiredString(formData, "resourceType", "Resource type"),
      url: getOptionalString(formData, "url"),
      visibility: getOptionalString(formData, "visibility"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deployment resource could not be saved.";
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
  }

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}message=${encodeURIComponent("Deployment resource saved.")}`);
}

export async function archiveDeploymentResourceAction(formData: FormData) {
  const returnTo = getRequiredString(formData, "returnTo", "Return path");

  try {
    await archiveDeploymentResource(
      getRequiredString(formData, "resourceId", "Resource"),
      getOptionalString(formData, "reason"),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deployment resource could not be archived.";
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
  }

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}message=${encodeURIComponent("Deployment resource archived.")}`);
}
