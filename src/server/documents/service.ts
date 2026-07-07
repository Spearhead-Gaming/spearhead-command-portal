import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories";
import {
  buildDocumentExcerpt,
  normalizeDocumentBodyFormat,
  type DocumentBodyFormat,
} from "@/server/documents/editor";
import { getDocument } from "@/server/documents/queries";
import {
  queueDocumentArchivedNotificationPlaceholder,
  queueDocumentPublishedNotificationPlaceholder,
  queueDocumentReviewOverdueNotificationPlaceholder,
  queueDocumentReviewRequiredNotificationPlaceholder,
} from "@/server/notifications/hooks";
import { can } from "@/server/permissions/access";

type DocumentStatus = "draft" | "published" | "archived";
type DocumentVisibility = "public" | "members" | "unit" | "restricted" | "admin";

type CreateDocumentInput = {
  title: string;
  slug?: string | null;
  description?: string | null;
  categoryId?: string | null;
  status?: DocumentStatus;
  visibility?: DocumentVisibility;
  ownerUserId?: string | null;
  unitId?: string | null;
  body?: string | null;
  bodyFormat?: DocumentBodyFormat;
  tags?: string[];
  isPinned?: boolean;
  nextReviewAt?: Date | null;
  lastReviewedAt?: Date | null;
  permissionRows?: Array<{
    permissionKey: string;
    unitId?: string | null;
    notes?: string | null;
  }>;
  reason?: string | null;
};

type UpdateDocumentInput = {
  documentId: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  categoryId?: string | null;
  visibility?: DocumentVisibility;
  ownerUserId?: string | null;
  unitId?: string | null;
  tags?: string[];
  isPinned?: boolean;
  nextReviewAt?: Date | null;
  lastReviewedAt?: Date | null;
  permissionRows?: Array<{
    permissionKey: string;
    unitId?: string | null;
    notes?: string | null;
  }>;
  reason?: string | null;
};

type CreateDocumentVersionInput = {
  documentId: string;
  body?: string | null;
  bodyFormat?: DocumentBodyFormat;
  changeSummary?: string | null;
  reason?: string | null;
};

type UploadDocumentAttachmentInput = {
  documentId: string;
  documentVersionId?: string | null;
  label: string;
  fileName: string;
  mimeType: string;
  storageKey?: string | null;
  sourceUrl?: string | null;
  sizeBytes?: number | null;
  description?: string | null;
  reason?: string | null;
};

type DeleteDocumentAttachmentInput = {
  attachmentId: string;
  reason?: string | null;
};

type ManageDocumentPermissionInput = {
  documentId: string;
  permissionKey: string;
  unitId?: string | null;
  notes?: string | null;
  reason?: string | null;
};

type UpdateDocumentCategoryInput = {
  categoryId: string;
  key: string;
  label: string;
  description?: string | null;
  sortOrder?: number | null;
  isActive?: boolean;
  reason?: string | null;
};

type CreateDocumentCategoryInput = {
  key: string;
  label: string;
  description?: string | null;
  sortOrder?: number | null;
  reason?: string | null;
};

function normalizeRequiredString(value: string, fieldLabel: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeDocumentVisibility(value?: string | null): DocumentVisibility {
  if (
    value === "public" ||
    value === "members" ||
    value === "unit" ||
    value === "restricted" ||
    value === "admin"
  ) {
    return value;
  }

  return "members";
}

function normalizeDocumentStatus(value?: string | null): DocumentStatus {
  if (value === "published" || value === "archived") {
    return value;
  }

  return "draft";
}

function normalizeTagKeys(tags?: string[]) {
  const unique = new Map<string, string>();

  for (const rawTag of tags ?? []) {
    const label = rawTag.trim();

    if (!label) {
      continue;
    }

    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!key) {
      continue;
    }

    unique.set(key, label);
  }

  return Array.from(unique.entries()).map(([key, label]) => ({
    key,
    label,
  }));
}

function buildDocumentSlug(input: string) {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "document";
}

async function ensureUniqueDocumentSlug(baseSlug: string, documentId?: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.document.findFirst({
      where: {
        slug: candidate,
        ...(documentId
          ? {
              id: {
                not: documentId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function revalidateDocumentRoutes(documentIdOrSlug?: string | null) {
  revalidatePath("/documents");

  if (documentIdOrSlug) {
    revalidatePath(`/documents/${documentIdOrSlug}`);
  }
}

async function requireScopedPermission(permissionKey: string, unitId?: string | null) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  if (
    !can(actor, permissionKey, unitId ? { unitId } : undefined) &&
    !can(actor, permissionKey)
  ) {
    throw new Error("You do not have permission to perform this document action.");
  }

  return actor;
}

async function createDocumentRevisionEntry(input: {
  documentId: string;
  documentVersionId?: string | null;
  actorUserId?: string | null;
  action: string;
  summary: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  reason?: string | null;
}) {
  await prisma.documentRevisionHistory.create({
    data: {
      documentId: input.documentId,
      documentVersionId: input.documentVersionId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      summary: input.summary,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      metadata: input.metadata ?? undefined,
      reason: input.reason ?? null,
    },
  });
}

async function resolveDocumentForMutation(documentId: string) {
  return prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      currentVersion: true,
      owner: {
        select: {
          id: true,
        },
      },
      author: {
        select: {
          id: true,
        },
      },
      permissions: true,
      tags: true,
    },
  });
}

function getDocumentRecipientUserIds(document: {
  owner: { id: string } | null;
  author: { id: string } | null;
}) {
  return Array.from(
    new Set([document.owner?.id, document.author?.id].filter((value): value is string => Boolean(value))),
  );
}

async function maybeQueueReviewNotifications(input: {
  actorUserId: string;
  title: string;
  nextReviewAt: Date | null;
  recipientUserIds: string[];
}) {
  if (!input.nextReviewAt) {
    return;
  }

  if (input.nextReviewAt <= new Date()) {
    await queueDocumentReviewOverdueNotificationPlaceholder({
      actorUserId: input.actorUserId,
      documentTitle: input.title,
      recipientUserIds: input.recipientUserIds,
    });
    return;
  }

  await queueDocumentReviewRequiredNotificationPlaceholder({
    actorUserId: input.actorUserId,
    documentTitle: input.title,
    recipientUserIds: input.recipientUserIds,
  });
}

export async function createDocument(input: CreateDocumentInput) {
  const visibility = normalizeDocumentVisibility(input.visibility);
  const status = normalizeDocumentStatus(input.status);
  const actor = await requireScopedPermission("documents.create", input.unitId);

  if (
    visibility !== "members" &&
    visibility !== "public" &&
    !(
      can(actor, "documents.restrict", input.unitId ? { unitId: input.unitId } : undefined) ||
      can(actor, "documents.restrict")
    )
  ) {
    throw new Error("You do not have permission to create restricted document visibility.");
  }

  if (
    (input.nextReviewAt || input.lastReviewedAt) &&
    !(
      can(actor, "documents.review.manage", input.unitId ? { unitId: input.unitId } : undefined) ||
      can(actor, "documents.review.manage")
    )
  ) {
    throw new Error("You do not have permission to manage document review dates.");
  }

  if (
    (input.permissionRows?.length ?? 0) > 0 &&
    !(
      can(actor, "documents.permissions.manage", input.unitId ? { unitId: input.unitId } : undefined) ||
      can(actor, "documents.permissions.manage")
    )
  ) {
    throw new Error("You do not have permission to manage document access rules.");
  }

  const title = normalizeRequiredString(input.title, "Document title");
  const slug = await ensureUniqueDocumentSlug(
    buildDocumentSlug(input.slug ?? title),
  );
  const bodyFormat = normalizeDocumentBodyFormat(input.bodyFormat);
  const tags = normalizeTagKeys(input.tags);

  const created = await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        title,
        slug,
        description: normalizeOptionalString(input.description),
        categoryId: input.categoryId ?? null,
        status,
        visibility,
        authorUserId: actor.id,
        ownerUserId: input.ownerUserId ?? actor.id,
        unitId: input.unitId ?? null,
        isPinned: input.isPinned ?? false,
        publishedAt: status === "published" ? new Date() : null,
        lastReviewedAt: input.lastReviewedAt ?? null,
        nextReviewAt: input.nextReviewAt ?? null,
        archivedAt: status === "archived" ? new Date() : null,
      },
    });

    const version = await tx.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        titleSnapshot: title,
        descriptionSnapshot: normalizeOptionalString(input.description),
        body: normalizeOptionalString(input.body),
        bodyFormat,
        changeSummary: "Initial version",
        createdByUserId: actor.id,
      },
    });

    await tx.document.update({
      where: { id: document.id },
      data: {
        currentVersionId: version.id,
        currentVersionNumber: 1,
      },
    });

    if (tags.length > 0) {
      await tx.documentTag.createMany({
        data: tags.map((tag) => ({
          documentId: document.id,
          key: tag.key,
          label: tag.label,
        })),
      });
    }

    if ((input.permissionRows?.length ?? 0) > 0) {
      await tx.documentPermission.createMany({
        data: (input.permissionRows ?? []).map((row) => ({
          documentId: document.id,
          permissionKey: normalizeRequiredString(row.permissionKey, "Permission key"),
          unitId: row.unitId ?? null,
          notes: normalizeOptionalString(row.notes),
        })),
      });
    }

    await tx.documentRevisionHistory.create({
      data: {
        documentId: document.id,
        documentVersionId: version.id,
        actorUserId: actor.id,
        action: "documents.created",
        summary: `${title} document created.`,
        newValue: {
          title,
          slug,
          status,
          visibility,
          excerpt: buildDocumentExcerpt(input.body),
        } satisfies Prisma.InputJsonObject,
        reason: input.reason ?? null,
      },
    });

    return { document, version };
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.created",
    entityType: "Document",
    entityId: created.document.id,
    summary: `${created.document.title} document created.`,
    newValue: {
      title: created.document.title,
      slug: created.document.slug,
      status: created.document.status,
      visibility: created.document.visibility,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  if (status === "published") {
    await queueDocumentPublishedNotificationPlaceholder({
      actorUserId: actor.id,
      documentTitle: created.document.title,
      recipientUserIds: getDocumentRecipientUserIds({
        owner: { id: created.document.ownerUserId ?? "" },
        author: { id: created.document.authorUserId ?? "" },
      }),
    });
  }

  await maybeQueueReviewNotifications({
    actorUserId: actor.id,
    title: created.document.title,
    nextReviewAt: created.document.nextReviewAt,
    recipientUserIds: [created.document.ownerUserId, created.document.authorUserId].filter(
      (value): value is string => Boolean(value),
    ),
  });

  revalidateDocumentRoutes(created.document.slug);

  return created.document;
}

export async function updateDocument(input: UpdateDocumentInput) {
  const existing = await resolveDocumentForMutation(input.documentId);
  const actor = await requireScopedPermission("documents.edit", existing.unitId);
  const visibility = normalizeDocumentVisibility(input.visibility ?? existing.visibility);
  const title = normalizeRequiredString(input.title, "Document title");
  const slug = await ensureUniqueDocumentSlug(
    buildDocumentSlug(input.slug ?? title),
    existing.id,
  );
  const tags = normalizeTagKeys(input.tags);

  if (
    visibility !== "members" &&
    visibility !== "public" &&
    !(
      can(actor, "documents.restrict", existing.unitId ? { unitId: existing.unitId } : undefined) ||
      can(actor, "documents.restrict")
    )
  ) {
    throw new Error("You do not have permission to set this document visibility.");
  }

  if (
    (input.nextReviewAt !== undefined || input.lastReviewedAt !== undefined) &&
    !(
      can(actor, "documents.review.manage", existing.unitId ? { unitId: existing.unitId } : undefined) ||
      can(actor, "documents.review.manage")
    )
  ) {
    throw new Error("You do not have permission to manage review dates for this document.");
  }

  if (
    input.permissionRows &&
    !(
      can(actor, "documents.permissions.manage", existing.unitId ? { unitId: existing.unitId } : undefined) ||
      can(actor, "documents.permissions.manage")
    )
  ) {
    throw new Error("You do not have permission to manage document-specific access rules.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const document = await tx.document.update({
      where: { id: existing.id },
      data: {
        title,
        slug,
        description:
          input.description === undefined
            ? existing.description
            : normalizeOptionalString(input.description),
        categoryId: input.categoryId === undefined ? existing.categoryId : input.categoryId ?? null,
        visibility,
        ownerUserId: input.ownerUserId === undefined ? existing.ownerUserId : input.ownerUserId ?? null,
        unitId: input.unitId === undefined ? existing.unitId : input.unitId ?? null,
        isPinned: input.isPinned ?? existing.isPinned,
        lastReviewedAt:
          input.lastReviewedAt === undefined ? existing.lastReviewedAt : input.lastReviewedAt ?? null,
        nextReviewAt:
          input.nextReviewAt === undefined ? existing.nextReviewAt : input.nextReviewAt ?? null,
      },
    });

    if (input.tags) {
      await tx.documentTag.deleteMany({
        where: {
          documentId: existing.id,
        },
      });

      if (tags.length > 0) {
        await tx.documentTag.createMany({
          data: tags.map((tag) => ({
            documentId: existing.id,
            key: tag.key,
            label: tag.label,
          })),
        });
      }
    }

    if (input.permissionRows) {
      await tx.documentPermission.deleteMany({
        where: {
          documentId: existing.id,
        },
      });

      if (input.permissionRows.length > 0) {
        await tx.documentPermission.createMany({
          data: input.permissionRows.map((row) => ({
            documentId: existing.id,
            permissionKey: normalizeRequiredString(row.permissionKey, "Permission key"),
            unitId: row.unitId ?? null,
            notes: normalizeOptionalString(row.notes),
          })),
        });
      }
    }

    await tx.documentRevisionHistory.create({
      data: {
        documentId: existing.id,
        documentVersionId: existing.currentVersionId,
        actorUserId: actor.id,
        action: "documents.updated",
        summary: `${title} document updated.`,
        oldValue: {
          title: existing.title,
          slug: existing.slug,
          description: existing.description,
          visibility: existing.visibility,
          unitId: existing.unitId,
          ownerUserId: existing.ownerUserId,
          lastReviewedAt: existing.lastReviewedAt?.toISOString() ?? null,
          nextReviewAt: existing.nextReviewAt?.toISOString() ?? null,
        } satisfies Prisma.InputJsonObject,
        newValue: {
          title: document.title,
          slug: document.slug,
          description: document.description,
          visibility: document.visibility,
          unitId: document.unitId,
          ownerUserId: document.ownerUserId,
          lastReviewedAt: document.lastReviewedAt?.toISOString() ?? null,
          nextReviewAt: document.nextReviewAt?.toISOString() ?? null,
        } satisfies Prisma.InputJsonObject,
        reason: input.reason ?? null,
      },
    });

    return document;
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.updated",
    entityType: "Document",
    entityId: updated.id,
    summary: `${updated.title} document updated.`,
    oldValue: {
      title: existing.title,
      slug: existing.slug,
      visibility: existing.visibility,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      title: updated.title,
      slug: updated.slug,
      visibility: updated.visibility,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  await maybeQueueReviewNotifications({
    actorUserId: actor.id,
    title: updated.title,
    nextReviewAt: updated.nextReviewAt,
    recipientUserIds: getDocumentRecipientUserIds(existing),
  });

  revalidateDocumentRoutes(updated.slug);

  return updated;
}

export async function publishDocument(documentId: string, reason?: string | null) {
  const existing = await resolveDocumentForMutation(documentId);
  const actor = await requireScopedPermission("documents.publish", existing.unitId);

  const published = await prisma.document.update({
    where: { id: existing.id },
    data: {
      status: "published",
      archivedAt: null,
      publishedAt: existing.publishedAt ?? new Date(),
    },
  });

  await createDocumentRevisionEntry({
    documentId: existing.id,
    documentVersionId: existing.currentVersionId,
    actorUserId: actor.id,
    action: "documents.published",
    summary: `${existing.title} document published.`,
    oldValue: {
      status: existing.status,
      publishedAt: existing.publishedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      status: published.status,
      publishedAt: published.publishedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.published",
    entityType: "Document",
    entityId: existing.id,
    summary: `${existing.title} document published.`,
    oldValue: {
      status: existing.status,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      status: published.status,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  await queueDocumentPublishedNotificationPlaceholder({
    actorUserId: actor.id,
    documentTitle: existing.title,
    recipientUserIds: getDocumentRecipientUserIds(existing),
  });

  revalidateDocumentRoutes(existing.slug);

  return published;
}

export async function archiveDocument(documentId: string, reason?: string | null) {
  const existing = await resolveDocumentForMutation(documentId);
  const actor = await requireScopedPermission("documents.archive", existing.unitId);

  const archived = await prisma.document.update({
    where: { id: existing.id },
    data: {
      status: "archived",
      archivedAt: new Date(),
    },
  });

  await createDocumentRevisionEntry({
    documentId: existing.id,
    documentVersionId: existing.currentVersionId,
    actorUserId: actor.id,
    action: "documents.archived",
    summary: `${existing.title} document archived.`,
    oldValue: {
      status: existing.status,
      archivedAt: existing.archivedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      status: archived.status,
      archivedAt: archived.archivedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.archived",
    entityType: "Document",
    entityId: existing.id,
    summary: `${existing.title} document archived.`,
    oldValue: {
      status: existing.status,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      status: archived.status,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  await queueDocumentArchivedNotificationPlaceholder({
    actorUserId: actor.id,
    documentTitle: existing.title,
    recipientUserIds: getDocumentRecipientUserIds(existing),
  });

  revalidateDocumentRoutes(existing.slug);

  return archived;
}

export async function restoreDocument(documentId: string, reason?: string | null) {
  const existing = await resolveDocumentForMutation(documentId);
  const actor = await requireScopedPermission("documents.archive", existing.unitId);

  const restored = await prisma.document.update({
    where: { id: existing.id },
    data: {
      status: existing.publishedAt ? "published" : "draft",
      archivedAt: null,
    },
  });

  await createDocumentRevisionEntry({
    documentId: existing.id,
    documentVersionId: existing.currentVersionId,
    actorUserId: actor.id,
    action: "documents.restored",
    summary: `${existing.title} document restored.`,
    oldValue: {
      status: existing.status,
      archivedAt: existing.archivedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      status: restored.status,
      archivedAt: restored.archivedAt?.toISOString() ?? null,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.restored",
    entityType: "Document",
    entityId: existing.id,
    summary: `${existing.title} document restored.`,
    oldValue: {
      status: existing.status,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      status: restored.status,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  revalidateDocumentRoutes(existing.slug);

  return restored;
}

export async function duplicateDocument(documentId: string, reason?: string | null) {
  const existing = await resolveDocumentForMutation(documentId);
  const actor = await requireScopedPermission("documents.create", existing.unitId);
  const duplicateSlug = await ensureUniqueDocumentSlug(
    buildDocumentSlug(`${existing.slug}-copy`),
  );
  const duplicateTitle = `Copy of ${existing.title}`;

  const duplicated = await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        title: duplicateTitle,
        slug: duplicateSlug,
        description: existing.description,
        categoryId: existing.categoryId,
        status: "draft",
        visibility: existing.visibility,
        authorUserId: actor.id,
        ownerUserId: existing.ownerUserId ?? actor.id,
        unitId: existing.unitId,
        isPinned: false,
        lastReviewedAt: existing.lastReviewedAt,
        nextReviewAt: existing.nextReviewAt,
      },
    });

    const version = await tx.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        titleSnapshot: duplicateTitle,
        descriptionSnapshot: existing.description,
        body: existing.currentVersion?.body ?? null,
        bodyFormat: normalizeDocumentBodyFormat(existing.currentVersion?.bodyFormat),
        changeSummary: "Duplicated from existing document",
        createdByUserId: actor.id,
      },
    });

    await tx.document.update({
      where: { id: document.id },
      data: {
        currentVersionId: version.id,
      },
    });

    if (existing.tags.length > 0) {
      await tx.documentTag.createMany({
        data: existing.tags.map((tag) => ({
          documentId: document.id,
          key: tag.key,
          label: tag.label,
        })),
      });
    }

    if (existing.permissions.length > 0) {
      await tx.documentPermission.createMany({
        data: existing.permissions.map((permission) => ({
          documentId: document.id,
          permissionKey: permission.permissionKey,
          unitId: permission.unitId,
          notes: permission.notes,
        })),
      });
    }

    await tx.documentRevisionHistory.create({
      data: {
        documentId: document.id,
        documentVersionId: version.id,
        actorUserId: actor.id,
        action: "documents.duplicated",
        summary: `${duplicateTitle} document duplicated.`,
        metadata: {
          sourceDocumentId: existing.id,
        } satisfies Prisma.InputJsonObject,
        reason,
      },
    });

    return document;
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.duplicated",
    entityType: "Document",
    entityId: duplicated.id,
    summary: `${duplicateTitle} document duplicated.`,
    metadata: {
      sourceDocumentId: existing.id,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  revalidateDocumentRoutes(duplicated.slug);

  return duplicated;
}

export async function createVersion(input: CreateDocumentVersionInput) {
  const existing = await resolveDocumentForMutation(input.documentId);
  const actor = await requireScopedPermission("documents.edit", existing.unitId);
  const nextVersionNumber = existing.currentVersionNumber + 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId: existing.id,
      versionNumber: nextVersionNumber,
      titleSnapshot: existing.title,
      descriptionSnapshot: existing.description,
      body: normalizeOptionalString(input.body),
      bodyFormat: normalizeDocumentBodyFormat(input.bodyFormat),
      changeSummary: normalizeOptionalString(input.changeSummary),
      createdByUserId: actor.id,
    },
  });

  await prisma.document.update({
    where: { id: existing.id },
    data: {
      currentVersionId: version.id,
      currentVersionNumber: nextVersionNumber,
    },
  });

  await createDocumentRevisionEntry({
    documentId: existing.id,
    documentVersionId: version.id,
    actorUserId: actor.id,
    action: "documents.version.created",
    summary: `${existing.title} version ${nextVersionNumber} created.`,
    metadata: {
      versionNumber: nextVersionNumber,
      excerpt: buildDocumentExcerpt(input.body),
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.version.created",
    entityType: "DocumentVersion",
    entityId: version.id,
    summary: `${existing.title} version ${nextVersionNumber} created.`,
    metadata: {
      documentId: existing.id,
      versionNumber: nextVersionNumber,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateDocumentRoutes(existing.slug);

  return version;
}

export async function uploadAttachment(input: UploadDocumentAttachmentInput) {
  const existing = await resolveDocumentForMutation(input.documentId);
  const actor = await requireScopedPermission(
    "documents.attachments.manage",
    existing.unitId,
  );

  const attachment = await prisma.documentAttachment.create({
    data: {
      documentId: existing.id,
      documentVersionId: input.documentVersionId ?? existing.currentVersionId,
      label: normalizeRequiredString(input.label, "Attachment label"),
      fileName: normalizeRequiredString(input.fileName, "File name"),
      mimeType: normalizeRequiredString(input.mimeType, "MIME type"),
      storageKey: normalizeOptionalString(input.storageKey),
      sourceUrl: normalizeOptionalString(input.sourceUrl),
      sizeBytes: input.sizeBytes ?? null,
      description: normalizeOptionalString(input.description),
      createdByUserId: actor.id,
    },
  });

  await createDocumentRevisionEntry({
    documentId: existing.id,
    documentVersionId: attachment.documentVersionId,
    actorUserId: actor.id,
    action: "documents.attachment.added",
    summary: `${attachment.label} attachment added to ${existing.title}.`,
    metadata: {
      attachmentId: attachment.id,
      fileName: attachment.fileName,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.attachment.added",
    entityType: "DocumentAttachment",
    entityId: attachment.id,
    summary: `${attachment.label} attachment added.`,
    metadata: {
      documentId: existing.id,
      fileName: attachment.fileName,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateDocumentRoutes(existing.slug);

  return attachment;
}

export async function deleteAttachment(input: DeleteDocumentAttachmentInput) {
  const attachment = await prisma.documentAttachment.findUniqueOrThrow({
    where: { id: input.attachmentId },
    include: {
      document: true,
    },
  });
  const actor = await requireScopedPermission(
    "documents.attachments.manage",
    attachment.document.unitId,
  );

  await prisma.documentAttachment.delete({
    where: { id: attachment.id },
  });

  await createDocumentRevisionEntry({
    documentId: attachment.documentId,
    documentVersionId: attachment.documentVersionId,
    actorUserId: actor.id,
    action: "documents.attachment.removed",
    summary: `${attachment.label} attachment removed from ${attachment.document.title}.`,
    metadata: {
      attachmentId: attachment.id,
      fileName: attachment.fileName,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.attachment.removed",
    entityType: "DocumentAttachment",
    entityId: attachment.id,
    summary: `${attachment.label} attachment removed.`,
    metadata: {
      documentId: attachment.documentId,
      fileName: attachment.fileName,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateDocumentRoutes(attachment.document.slug);
}

export async function recordReadReceipt(documentId: string, reason?: string | null) {
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const document = await getDocument(documentId);

  if (!document || !document.readAcknowledgement.currentVersionId) {
    throw new Error("Document not found or does not have a current version.");
  }

  const receipt = await prisma.documentReadReceipt.upsert({
    where: {
      documentId_documentVersionId_userId: {
        documentId: document.id,
        documentVersionId: document.readAcknowledgement.currentVersionId,
        userId: actor.id,
      },
    },
    update: {
      readAt: new Date(),
    },
    create: {
      documentId: document.id,
      documentVersionId: document.readAcknowledgement.currentVersionId,
      userId: actor.id,
      readAt: new Date(),
    },
  });

  await createDocumentRevisionEntry({
    documentId: document.id,
    documentVersionId: document.readAcknowledgement.currentVersionId,
    actorUserId: actor.id,
    action: "documents.read.acknowledged",
    summary: `${actor.displayName} acknowledged ${document.title}.`,
    reason,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.read.acknowledged",
    entityType: "DocumentReadReceipt",
    entityId: receipt.id,
    summary: `${actor.displayName} acknowledged ${document.title}.`,
    metadata: {
      documentId: document.id,
      versionId: document.readAcknowledgement.currentVersionId,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  revalidateDocumentRoutes(document.slug);

  return receipt;
}

export async function manageDocumentPermission(input: ManageDocumentPermissionInput) {
  const existing = await resolveDocumentForMutation(input.documentId);
  const actor = await requireScopedPermission(
    "documents.permissions.manage",
    existing.unitId,
  );

  const permission = await prisma.documentPermission.create({
    data: {
      documentId: existing.id,
      permissionKey: normalizeRequiredString(input.permissionKey, "Permission key"),
      unitId: input.unitId ?? null,
      notes: normalizeOptionalString(input.notes),
    },
  });

  await createDocumentRevisionEntry({
    documentId: existing.id,
    actorUserId: actor.id,
    action: "documents.permission.added",
    summary: `${existing.title} document permission added.`,
    metadata: {
      permissionKey: permission.permissionKey,
      unitId: permission.unitId,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.permission.added",
    entityType: "DocumentPermission",
    entityId: permission.id,
    summary: `${existing.title} document permission added.`,
    metadata: {
      documentId: existing.id,
      permissionKey: permission.permissionKey,
      unitId: permission.unitId,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateDocumentRoutes(existing.slug);

  return permission;
}

export async function removeDocumentPermission(permissionId: string, reason?: string | null) {
  const permission = await prisma.documentPermission.findUniqueOrThrow({
    where: { id: permissionId },
    include: {
      document: true,
    },
  });
  const actor = await requireScopedPermission(
    "documents.permissions.manage",
    permission.document.unitId,
  );

  await prisma.documentPermission.delete({
    where: { id: permission.id },
  });

  await createDocumentRevisionEntry({
    documentId: permission.documentId,
    actorUserId: actor.id,
    action: "documents.permission.removed",
    summary: `${permission.document.title} document permission removed.`,
    metadata: {
      permissionKey: permission.permissionKey,
      unitId: permission.unitId,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.permission.removed",
    entityType: "DocumentPermission",
    entityId: permission.id,
    summary: `${permission.document.title} document permission removed.`,
    metadata: {
      documentId: permission.documentId,
      permissionKey: permission.permissionKey,
      unitId: permission.unitId,
    } satisfies Prisma.InputJsonObject,
    reason,
  });

  revalidateDocumentRoutes(permission.document.slug);
}

export async function createDocumentCategory(input: CreateDocumentCategoryInput) {
  const actor = await requireScopedPermission("documents.categories.manage");

  const category = await prisma.documentCategory.create({
    data: {
      key: buildDocumentSlug(normalizeRequiredString(input.key, "Category key")),
      label: normalizeRequiredString(input.label, "Category label"),
      description: normalizeOptionalString(input.description),
      sortOrder: input.sortOrder ?? 0,
      isActive: true,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.category.created",
    entityType: "DocumentCategory",
    entityId: category.id,
    summary: `${category.label} document category created.`,
    newValue: {
      key: category.key,
      label: category.label,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateDocumentRoutes();

  return category;
}

export async function updateDocumentCategory(input: UpdateDocumentCategoryInput) {
  const actor = await requireScopedPermission("documents.categories.manage");
  const existing = await prisma.documentCategory.findUniqueOrThrow({
    where: { id: input.categoryId },
  });

  const category = await prisma.documentCategory.update({
    where: { id: input.categoryId },
    data: {
      key: buildDocumentSlug(normalizeRequiredString(input.key, "Category key")),
      label: normalizeRequiredString(input.label, "Category label"),
      description:
        input.description === undefined
          ? existing.description
          : normalizeOptionalString(input.description),
      sortOrder: input.sortOrder ?? existing.sortOrder,
      isActive: input.isActive ?? existing.isActive,
    },
  });

  await createAuditLogEntry({
    actorUserId: actor.id,
    action: "documents.category.updated",
    entityType: "DocumentCategory",
    entityId: category.id,
    summary: `${category.label} document category updated.`,
    oldValue: {
      key: existing.key,
      label: existing.label,
      isActive: existing.isActive,
    } satisfies Prisma.InputJsonObject,
    newValue: {
      key: category.key,
      label: category.label,
      isActive: category.isActive,
    } satisfies Prisma.InputJsonObject,
    reason: input.reason ?? null,
  });

  revalidateDocumentRoutes();

  return category;
}
