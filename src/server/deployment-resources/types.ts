import type {
  deploymentResourceTypeCatalog,
  deploymentResourceVisibilityCatalog,
} from "@/server/database/catalogs";

export type DeploymentResourceTypeKey = (typeof deploymentResourceTypeCatalog)[number]["key"];
export type DeploymentResourceVisibilityKey = (typeof deploymentResourceVisibilityCatalog)[number]["key"];

export type DeploymentResourceVersionView = {
  id: string;
  versionNumber: number;
  sourceType: string;
  url: string | null;
  downloadUrl: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  parsedName: string | null;
  parsedModCount: number | null;
  uploadedAt: Date;
  uploadedByName: string | null;
  isCurrent: boolean;
  archivedAt: Date | null;
  changeNote: string | null;
};

export type DeploymentResourceView = {
  id: string;
  campaignId: string;
  eventId: string | null;
  resourceType: DeploymentResourceTypeKey | string;
  resourceTypeLabel: string;
  displayName: string;
  description: string | null;
  visibility: DeploymentResourceVisibilityKey | string;
  displayOrder: number;
  currentVersion: DeploymentResourceVersionView | null;
  versions: DeploymentResourceVersionView[];
};
