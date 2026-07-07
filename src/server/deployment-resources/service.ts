import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import type { DeploymentResourceView, DeploymentResourceVersionView } from "@/server/deployment-resources/types";
import {
  assertAllowedResourceFile,
  getDeploymentResourceTypeLabel,
  isDeploymentResourceType,
  isDeploymentResourceVisibility,
  parseArma3Preset,
} from "@/server/deployment-resources/utils";
import { createNotification } from "@/server/notifications/service";
import { can, requirePermission } from "@/server/permissions/access";
import { requireAnyScopedPermission } from "@/server/s3/utils";
import { putDeploymentResourceFile } from "@/server/storage/deployment-resource-storage";

type ResourceFileInput = {
  bytes: Buffer;
  name: string;
  type?: string | null;
};

export type UpsertDeploymentResourceInput = {
  campaignId: string;
  eventId?: string | null;
  resourceId?: string | null;
  resourceType: string;
  displayName: string;
  description?: string | null;
  visibility?: string | null;
  displayOrder?: number | null;
  url?: string | null;
  file?: ResourceFileInput | null;
  changeNote?: string | null;
};

const staffResourcePermissions = [
  "deployments.resources.upload",
  "deployments.resources.edit",
  "deployments.resources.delete",
  "deployments.edit",
] as const;

function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function revalidateResourceRoutes(campaignId: string, eventId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/operations/campaigns");
  revalidatePath(`/operations/campaigns/${campaignId}`);

  if (eventId) {
    revalidatePath(`/operations/events/${eventId}`);
  }
}

function mapVersion(version: {
  archivedAt: Date | null;
  changeNote: string | null;
  fileSizeBytes: number | null;
  id: string;
  isCurrent: boolean;
  mimeType: string | null;
  originalFileName: string | null;
  parsedModCount: number | null;
  parsedName: string | null;
  sourceType: string;
  uploadedAt: Date;
  uploadedBy?: { displayName: string | null; email: string | null; name: string | null } | null;
  url: string | null;
  versionNumber: number;
}): DeploymentResourceVersionView {
  return {
    archivedAt: version.archivedAt,
    changeNote: version.changeNote,
    downloadUrl:
      version.sourceType === "file"
        ? `/api/deployment-resources/${version.id}/download`
        : version.url,
    fileSizeBytes: version.fileSizeBytes,
    id: version.id,
    isCurrent: version.isCurrent,
    mimeType: version.mimeType,
    originalFileName: version.originalFileName,
    parsedModCount: version.parsedModCount,
    parsedName: version.parsedName,
    sourceType: version.sourceType,
    uploadedAt: version.uploadedAt,
    uploadedByName: version.uploadedBy?.displayName ?? version.uploadedBy?.name ?? version.uploadedBy?.email ?? null,
    url: version.url,
    versionNumber: version.versionNumber,
  };
}

function mapResource(resource: {
  campaignId: string;
  description: string | null;
  displayName: string;
  displayOrder: number;
  eventId: string | null;
  id: string;
  resourceType: string;
  versions: Array<Parameters<typeof mapVersion>[0]>;
  visibility: string;
}): DeploymentResourceView {
  const versions = resource.versions.map(mapVersion);

  return {
    campaignId: resource.campaignId,
    currentVersion: versions.find((version) => version.isCurrent) ?? versions[0] ?? null,
    description: resource.description,
    displayName: resource.displayName,
    displayOrder: resource.displayOrder,
    eventId: resource.eventId,
    id: resource.id,
    resourceType: resource.resourceType,
    resourceTypeLabel: getDeploymentResourceTypeLabel(resource.resourceType),
    versions,
    visibility: resource.visibility,
  };
}

export async function canViewDeploymentResourceHistory() {
  const user = await requirePermission("deployments.resources.view");

  return staffResourcePermissions.some((permission) => can(user, permission)) || can(user, "audit.view");
}

export async function listDeploymentResources(input: {
  campaignId: string;
  eventId?: string | null;
  includeEventSpecific?: boolean;
  includeHistory?: boolean;
}) {
  const user = await requirePermission("deployments.resources.view");
  const includeStaffOnly = staffResourcePermissions.some((permission) => can(user, permission)) || can(user, "audit.view");

  const resources = await prisma.deploymentResource.findMany({
    where: {
      campaignId: input.campaignId,
      isArchived: false,
      ...(input.includeEventSpecific
        ? {
            OR: [
              { eventId: null },
              ...(input.eventId ? [{ eventId: input.eventId }] : []),
            ],
          }
        : { eventId: input.eventId ?? null }),
      ...(includeStaffOnly ? {} : { visibility: "members" }),
    },
    include: {
      versions: {
        where: input.includeHistory && includeStaffOnly ? {} : { isCurrent: true },
        include: {
          uploadedBy: {
            select: {
              displayName: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: [{ isCurrent: "desc" }, { versionNumber: "desc" }],
      },
    },
    orderBy: [{ displayOrder: "asc" }, { resourceType: "asc" }, { createdAt: "asc" }],
  });

  return resources.map(mapResource).filter((resource) => resource.currentVersion);
}

export async function getCurrentArmaPresetForDeployment(campaignId: string) {
  const resources = await listDeploymentResources({
    campaignId,
    includeHistory: false,
  });

  return resources.find((resource) => resource.resourceType === "ARMA3_PRESET") ?? null;
}

async function queueDeploymentResourceNotification(input: {
  actorUserId: string;
  campaignId: string;
  campaignTitle: string;
  resourceType: string;
  resourceDisplayName: string;
}) {
  try {
    await createNotification({
      actionUrl: `/operations/campaigns/${input.campaignId}`,
      createdByUserId: input.actorUserId,
      message: `${input.resourceDisplayName} was updated for ${input.campaignTitle}. Portal resources remain the source of truth.`,
      metadata: {
        campaignId: input.campaignId,
        resourceType: input.resourceType,
      },
      title:
        input.resourceType === "ARMA3_PRESET"
          ? `Current Mod Preset updated for ${input.campaignTitle}`
          : `Deployment resource updated for ${input.campaignTitle}`,
      type:
        input.resourceType === "ARMA3_PRESET"
          ? "deployment.arma3_preset_updated"
          : "deployment.resource.updated",
    });
  } catch (error) {
    console.error("Deployment resource notification hook failed.", error);
  }
}

export async function upsertDeploymentResource(input: UpsertDeploymentResourceInput) {
  const actor = await requireAnyScopedPermission(["deployments.resources.upload", "deployments.resources.edit", "deployments.edit"], []);
  const resourceType = normalizeRequiredString(input.resourceType, "Resource type");
  const displayName = normalizeRequiredString(input.displayName, "Display name");
  const url = normalizeOptionalString(input.url);
  const visibility = normalizeOptionalString(input.visibility) ?? "members";

  if (!isDeploymentResourceType(resourceType)) {
    throw new Error("Unsupported deployment resource type.");
  }

  if (!isDeploymentResourceVisibility(visibility)) {
    throw new Error("Unsupported deployment resource visibility.");
  }

  if (!url && !input.file) {
    throw new Error("Provide either a resource URL or an uploaded file.");
  }

  if (url && input.file) {
    throw new Error("Use either a URL or uploaded file for one resource version, not both.");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new Error("Deployment not found.");
  }

  if (input.eventId) {
    const event = await prisma.event.findFirst({
      where: {
        campaignId: input.campaignId,
        id: input.eventId,
      },
      select: { id: true },
    });

    if (!event) {
      throw new Error("Weekly operation does not belong to this deployment.");
    }
  }

  if (input.file) {
    assertAllowedResourceFile(input.file.name, resourceType);
  }

  const parsedPreset =
    input.file && resourceType === "ARMA3_PRESET"
      ? parseArma3Preset({
          fileName: input.file.name,
          html: input.file.bytes.toString("utf8"),
        })
      : null;

  const result = await prisma.$transaction(async (tx) => {
    const resource =
      input.resourceId
        ? await tx.deploymentResource.update({
            where: { id: input.resourceId },
            data: {
              description: normalizeOptionalString(input.description),
              displayName,
              displayOrder: input.displayOrder ?? 0,
              eventId: input.eventId ?? null,
              resourceType,
              visibility,
            },
          })
        : await tx.deploymentResource.create({
            data: {
              campaignId: input.campaignId,
              description: normalizeOptionalString(input.description),
              displayName,
              displayOrder: input.displayOrder ?? 0,
              eventId: input.eventId ?? null,
              resourceType,
              visibility,
            },
          });

    const previousCurrent = await tx.deploymentResourceVersion.findFirst({
      where: {
        resourceId: resource.id,
        isCurrent: true,
      },
    });
    const latestVersion = await tx.deploymentResourceVersion.findFirst({
      orderBy: { versionNumber: "desc" },
      where: { resourceId: resource.id },
    });
    const now = new Date();

    await tx.deploymentResourceVersion.updateMany({
      data: {
        archivedAt: now,
        isCurrent: false,
      },
      where: {
        resourceId: resource.id,
        isCurrent: true,
      },
    });

    let fileMetadata: Awaited<ReturnType<typeof putDeploymentResourceFile>> | null = null;

    if (input.file) {
      fileMetadata = await putDeploymentResourceFile({
        bytes: input.file.bytes,
        originalFileName: input.file.name,
        resourceId: resource.id,
      });
    }

    const version = await tx.deploymentResourceVersion.create({
      data: {
        changeNote: normalizeOptionalString(input.changeNote),
        checksum: fileMetadata?.checksum ?? null,
        fileSizeBytes: fileMetadata?.fileSizeBytes ?? null,
        isCurrent: true,
        mimeType: input.file?.type ?? null,
        originalFileName: input.file?.name ?? null,
        parsedMetadata: parsedPreset
          ? ({
              workshopUrls: parsedPreset.workshopUrls,
            } satisfies Prisma.InputJsonObject)
          : undefined,
        parsedModCount: parsedPreset?.modCount ?? null,
        parsedName: parsedPreset?.presetName ?? null,
        resourceId: resource.id,
        sourceType: input.file ? "file" : "url",
        storageKey: fileMetadata?.storageKey ?? null,
        uploadedByUserId: actor.id,
        url,
        versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
      },
    });

    return { previousCurrent, resource, version };
  });

  await createAuditLogEntry({
    action: "deployment.resource.version_created",
    actorUserId: actor.id,
    entityId: result.version.id,
    entityType: "DeploymentResourceVersion",
    metadata: {
      campaignId: input.campaignId,
      eventId: input.eventId ?? null,
      resourceId: result.resource.id,
      resourceType,
    },
    summary: `Resource version ${result.version.versionNumber} created for ${displayName}.`,
  });

  if (result.previousCurrent) {
    await createAuditLogEntry({
      action: "deployment.resource.old_version_archived",
      actorUserId: actor.id,
      entityId: result.previousCurrent.id,
      entityType: "DeploymentResourceVersion",
      metadata: {
        campaignId: input.campaignId,
        resourceId: result.resource.id,
        resourceType,
      },
      summary: `Previous ${displayName} version archived.`,
    });
  }

  await createAuditLogEntry({
    action: "deployment.resource.current_version_changed",
    actorUserId: actor.id,
    entityId: result.resource.id,
    entityType: "DeploymentResource",
    metadata: {
      campaignId: input.campaignId,
      currentVersionId: result.version.id,
      resourceType,
    },
    summary: `Current version changed for ${displayName}.`,
  });

  if (resourceType === "ARMA3_PRESET") {
    await createAuditLogEntry({
      action: "deployment.resource.arma3_preset_updated",
      actorUserId: actor.id,
      entityId: result.resource.id,
      entityType: "DeploymentResource",
      metadata: {
        campaignId: input.campaignId,
        modCount: parsedPreset?.modCount ?? null,
        presetName: parsedPreset?.presetName ?? null,
      },
      summary: `Arma 3 preset updated for ${campaign.title}.`,
    });
  }

  await queueDeploymentResourceNotification({
    actorUserId: actor.id,
    campaignId: input.campaignId,
    campaignTitle: campaign.title,
    resourceDisplayName: displayName,
    resourceType,
  });

  revalidateResourceRoutes(input.campaignId, input.eventId);

  return result.resource;
}

export async function archiveDeploymentResource(resourceId: string, reason?: string | null) {
  const actor = await requireAnyScopedPermission(["deployments.resources.delete", "deployments.edit"], []);
  const resource = await prisma.deploymentResource.update({
    data: {
      isArchived: true,
      versions: {
        updateMany: {
          data: {
            archivedAt: new Date(),
            isCurrent: false,
          },
          where: {},
        },
      },
    },
    where: { id: resourceId },
  });

  await createAuditLogEntry({
    action: "deployment.resource.deleted",
    actorUserId: actor.id,
    entityId: resource.id,
    entityType: "DeploymentResource",
    reason: normalizeOptionalString(reason),
    summary: `Deployment resource ${resource.displayName} archived.`,
  });

  revalidateResourceRoutes(resource.campaignId, resource.eventId);
}
