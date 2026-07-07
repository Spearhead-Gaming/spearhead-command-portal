import {
  deploymentResourceTypeCatalog,
  deploymentResourceVisibilityCatalog,
} from "@/server/database/catalogs";
import type {
  DeploymentResourceTypeKey,
  DeploymentResourceVisibilityKey,
} from "@/server/deployment-resources/types";

const allowedExtensions = new Set([
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".zip",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
  ".html",
  ".htm",
  ".csv",
  ".json",
]);

export function getDeploymentResourceTypeLabel(type: string) {
  return deploymentResourceTypeCatalog.find((entry) => entry.key === type)?.label ?? type;
}

export function isDeploymentResourceType(value: string): value is DeploymentResourceTypeKey {
  return deploymentResourceTypeCatalog.some((entry) => entry.key === value);
}

export function isDeploymentResourceVisibility(value: string): value is DeploymentResourceVisibilityKey {
  return deploymentResourceVisibilityCatalog.some((entry) => entry.key === value);
}

export function assertAllowedResourceFile(fileName: string, resourceType: string) {
  const extension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";

  if (resourceType === "ARMA3_PRESET" && extension !== ".html" && extension !== ".htm") {
    throw new Error("Arma 3 preset uploads must be .html or .htm files.");
  }

  if (!allowedExtensions.has(extension)) {
    throw new Error("Unsupported resource file type.");
  }
}

export function parseArma3Preset(input: {
  fileName: string;
  html: string;
}) {
  const titleMatch = input.html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaMatch = input.html.match(/name=["']arma:PresetName["'][^>]*content=["']([^"']+)["']/i);
  const fallbackName = input.fileName.replace(/\.(html|htm)$/i, "");
  const workshopIds = new Set(
    Array.from(input.html.matchAll(/(?:steamcommunity\.com\/sharedfiles\/filedetails\/\?id=|steam:\/\/url\/CommunityFilePage\/)(\d+)/gi))
      .map((match) => match[1])
      .filter(Boolean),
  );

  return {
    modCount: workshopIds.size || null,
    presetName: metaMatch?.[1]?.trim() || titleMatch?.[1]?.trim() || fallbackName,
    workshopUrls: Array.from(workshopIds).map((id) => `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`),
  };
}
