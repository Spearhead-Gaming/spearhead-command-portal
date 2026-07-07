import type { PortalUser } from "@/features/auth/types";
import { prisma } from "@/server/database/client";
import { can, requirePermission } from "@/server/permissions/access";
import { buildDocumentExcerpt, normalizeDocumentBodyFormat } from "@/server/documents/editor";
import type {
  DocumentCategorySummary,
  DocumentDetail,
  DocumentLibraryData,
  DocumentLibraryFilters,
  DocumentListItem,
  DocumentPermissionSummary,
  DocumentReadReceiptSummary,
  DocumentReferenceData,
  DocumentRevisionSummary,
  DocumentStatus,
  DocumentVisibility,
  DocumentVersionSummary,
} from "@/server/documents/types";

function normalizeFilterValue(value?: string) {
  return value?.trim() ? value.trim() : undefined;
}

function getActorDisplayName(actor: {
  displayName: string | null;
  name: string | null;
  email: string | null;
} | null) {
  return actor?.displayName ?? actor?.name ?? actor?.email ?? null;
}

function matchesUnitScopedPermission(
  user: PortalUser,
  permissionKey: string,
  unitId?: string | null,
) {
  if (!unitId) {
    return can(user, permissionKey);
  }

  return can(user, permissionKey, { unitId }) || can(user, permissionKey);
}

type DocumentPermissionWithUnit = {
  permissionKey: string;
  unitId: string | null;
};

type AccessCheckDocument = {
  id: string;
  authorUserId: string | null;
  ownerUserId: string | null;
  unitId: string | null;
  visibility: string;
  permissions: DocumentPermissionWithUnit[];
};

function canReadDocument(user: PortalUser, document: AccessCheckDocument) {
  const visibility = document.visibility as DocumentVisibility;

  if (!matchesUnitScopedPermission(user, "documents.view", document.unitId)) {
    return false;
  }

  if (visibility === "public" || visibility === "members") {
    return true;
  }

  if (visibility === "unit") {
    return matchesUnitScopedPermission(user, "documents.view", document.unitId);
  }

  if (
    document.authorUserId === user.id ||
    document.ownerUserId === user.id ||
    matchesUnitScopedPermission(user, "documents.restrict", document.unitId) ||
    matchesUnitScopedPermission(user, "documents.permissions.manage", document.unitId) ||
    can(user, "admin.users.manage")
  ) {
    return true;
  }

  return document.permissions.some((permission) =>
    matchesUnitScopedPermission(user, permission.permissionKey, permission.unitId),
  );
}

function mapRevisionTone(action: string): DocumentRevisionSummary["badgeTone"] {
  switch (action) {
    case "documents.created":
    case "documents.published":
    case "documents.version.created":
    case "documents.read.acknowledged":
      return "success";
    case "documents.archived":
    case "documents.attachment.removed":
      return "warning";
    case "documents.deleted":
      return "danger";
    default:
      return "info";
  }
}

function mapPermissionSummary(permission: {
  id: string;
  permissionKey: string;
  notes: string | null;
  unit: {
    id: string;
    shortName: string;
  } | null;
}): DocumentPermissionSummary {
  return {
    id: permission.id,
    permissionKey: permission.permissionKey,
    unitId: permission.unit?.id ?? null,
    unitShortName: permission.unit?.shortName ?? null,
    notes: permission.notes,
  };
}

function mapVersionSummary(version: {
  id: string;
  versionNumber: number;
  titleSnapshot: string;
  descriptionSnapshot: string | null;
  bodyFormat: string;
  changeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    displayName: string | null;
    name: string | null;
    email: string | null;
  } | null;
}): DocumentVersionSummary {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    titleSnapshot: version.titleSnapshot,
    descriptionSnapshot: version.descriptionSnapshot,
    bodyFormat: normalizeDocumentBodyFormat(version.bodyFormat),
    changeSummary: version.changeSummary,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    createdByDisplayName: getActorDisplayName(version.createdBy),
  };
}

function mapDocumentListItem(
  document: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    ownerUserId: string | null;
    authorUserId: string | null;
    unitId: string | null;
    status: string;
    visibility: string;
    currentVersionNumber: number;
    isPinned: boolean;
    publishedAt: Date | null;
    lastReviewedAt: Date | null;
    nextReviewAt: Date | null;
    archivedAt: Date | null;
    updatedAt: Date;
    category: {
      id: string;
      key: string;
      label: string;
    } | null;
    owner: {
      displayName: string | null;
      name: string | null;
      email: string | null;
    } | null;
    author: {
      displayName: string | null;
      name: string | null;
      email: string | null;
    } | null;
    unit: {
    shortName: string;
      id: string;
    } | null;
    currentVersion: {
      id: string;
      body: string | null;
    } | null;
    tags: {
      label: string;
    }[];
    readReceipts: {
      documentVersionId: string;
    }[];
    _count: {
      attachments: number;
    };
  },
): DocumentListItem {
  return {
    id: document.id,
    title: document.title,
    slug: document.slug,
    description: document.description,
    ownerUserId: document.ownerUserId,
    authorUserId: document.authorUserId,
    unitId: document.unitId,
    status: document.status as DocumentStatus,
    visibility: document.visibility as DocumentVisibility,
    category: document.category,
    ownerDisplayName: getActorDisplayName(document.owner),
    authorDisplayName: getActorDisplayName(document.author),
    unitShortName: document.unit?.shortName ?? null,
    currentVersionNumber: document.currentVersionNumber,
    isPinned: document.isPinned,
    publishedAt: document.publishedAt,
    lastReviewedAt: document.lastReviewedAt,
    nextReviewAt: document.nextReviewAt,
    archivedAt: document.archivedAt,
    updatedAt: document.updatedAt,
    excerpt: buildDocumentExcerpt(document.currentVersion?.body ?? document.description),
    tagLabels: document.tags.map((tag) => tag.label),
    attachmentCount: document._count.attachments,
    unread: document.currentVersion
      ? !document.readReceipts.some(
          (receipt) => receipt.documentVersionId === document.currentVersion?.id,
        )
      : false,
  };
}

function filterAccessibleDocuments<T extends AccessCheckDocument>(
  user: PortalUser,
  documents: T[],
) {
  return documents.filter((document): document is T => canReadDocument(user, document));
}

function filterDocumentLibraryItems(
  documents: DocumentListItem[],
  filters: DocumentLibraryFilters,
  user: PortalUser,
) {
  const q = normalizeFilterValue(filters.q)?.toLowerCase();
  const tag = normalizeFilterValue(filters.tag)?.toLowerCase();

  return documents.filter((document) => {
    if (filters.categoryId && document.category?.id !== filters.categoryId) {
      return false;
    }

    if (filters.status && document.status !== filters.status) {
      return false;
    }

    if (filters.visibility && document.visibility !== filters.visibility) {
      return false;
    }

    if (
      filters.ownerId &&
      document.ownerUserId !== filters.ownerId &&
      !(filters.ownerId === "me" && document.ownerUserId === user.id)
    ) {
      return false;
    }

    if (filters.unitId && document.unitId !== filters.unitId) {
      return false;
    }

    if (
      filters.mine &&
      document.authorUserId !== user.id &&
      document.ownerUserId !== user.id
    ) {
      return false;
    }

    if (filters.unreadOnly && !document.unread) {
      return false;
    }

    if (filters.pinnedOnly && !document.isPinned) {
      return false;
    }

    if (filters.reviewState === "pending") {
      if (!document.nextReviewAt) {
        return false;
      }
    }

    if (filters.reviewState === "overdue") {
      if (!document.nextReviewAt || document.nextReviewAt > new Date()) {
        return false;
      }
    }

    if (
      q &&
      ![
        document.title,
        document.slug,
        document.description ?? "",
        document.excerpt,
        document.category?.label ?? "",
        document.ownerDisplayName ?? "",
        document.authorDisplayName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    ) {
      return false;
    }

    if (
      tag &&
      !document.tagLabels.some((label) => label.toLowerCase().includes(tag))
    ) {
      return false;
    }

    return true;
  });
}

export async function getDocumentReferenceData(): Promise<DocumentReferenceData> {
  await requirePermission("documents.view");

  const [categories, owners, units, permissions] = await Promise.all([
    prisma.documentCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
      select: {
        id: true,
        displayName: true,
        email: true,
        name: true,
      },
      take: 100,
    }),
    prisma.unit.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        shortName: true,
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { key: "asc" }],
      select: {
        id: true,
        key: true,
        label: true,
        module: true,
      },
    }),
  ]);

  return {
    categories: categories.map((category) => ({
      id: category.id,
      label: category.label,
      key: category.key,
    })),
    owners: owners.map((owner) => ({
      id: owner.id,
      label: getActorDisplayName(owner) ?? "Portal User",
    })),
    units: units.map((unit) => ({
      id: unit.id,
      label: unit.name,
      key: unit.key,
      hint: unit.shortName,
    })),
    permissionKeys: permissions.map((permission) => ({
      id: permission.key,
      label: permission.label,
      key: permission.key,
      hint: permission.module,
    })),
  };
}

export async function listDocumentCategories(): Promise<DocumentCategorySummary[]> {
  await requirePermission("documents.view");

  const categories = await prisma.documentCategory.findMany({
    include: {
      _count: {
        select: {
          documents: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return categories.map((category) => ({
    id: category.id,
    key: category.key,
    label: category.label,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    documentCount: category._count.documents,
  }));
}

export async function listDocuments(
  filters: DocumentLibraryFilters = {},
): Promise<DocumentLibraryData> {
  const user = await requirePermission("documents.view");

  const documents = await prisma.document.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      category: true,
      owner: {
        select: {
          id: true,
          displayName: true,
          email: true,
          name: true,
        },
      },
      author: {
        select: {
          id: true,
          displayName: true,
          email: true,
          name: true,
        },
      },
      unit: {
        select: {
          id: true,
          shortName: true,
        },
      },
      currentVersion: {
        select: {
          id: true,
          body: true,
        },
      },
      tags: true,
      permissions: {
        select: {
          permissionKey: true,
          unitId: true,
        },
      },
      readReceipts: {
        where: {
          userId: user.id,
        },
        select: {
          documentVersionId: true,
        },
      },
      _count: {
        select: {
          attachments: true,
        },
      },
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });

  const accessibleDocuments = filterAccessibleDocuments(user, documents);
  const accessibleItems = accessibleDocuments.map(mapDocumentListItem);
  const filteredDocuments = filterDocumentLibraryItems(accessibleItems, filters, user);
  const now = new Date();

  const categoryCounts = new Map<string, number>();

  for (const document of accessibleDocuments) {
    if (!document.category) {
      continue;
    }

    categoryCounts.set(
      document.category.id,
      (categoryCounts.get(document.category.id) ?? 0) + 1,
    );
  }

  const categories = await prisma.documentCategory.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return {
    documents: filteredDocuments,
    categoryTree: categories.map((category) => ({
      id: category.id,
      key: category.key,
      label: category.label,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      documentCount: categoryCounts.get(category.id) ?? 0,
    })),
    recentDocuments: filteredDocuments
      .filter((document) => document.publishedAt)
      .sort(
        (left, right) =>
          (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0),
      )
      .slice(0, 5),
    recentlyUpdated: filteredDocuments
      .slice()
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, 5),
    myDocuments: filteredDocuments
      .filter(
        (document) =>
          document.authorUserId === user.id || document.ownerUserId === user.id,
      )
      .slice(0, 5),
    unreadDocuments: filteredDocuments.filter((document) => document.unread).slice(0, 5),
    summary: {
      totalDocuments: filteredDocuments.length,
      pendingReviews: filteredDocuments.filter((document) => Boolean(document.nextReviewAt)).length,
      overdueReviews: filteredDocuments.filter(
        (document) => document.nextReviewAt && document.nextReviewAt <= now,
      ).length,
      unreadDocuments: filteredDocuments.filter((document) => document.unread).length,
      myDocuments: filteredDocuments.filter(
        (document) =>
          document.authorUserId === user.id || document.ownerUserId === user.id,
      ).length,
      pinnedDocuments: filteredDocuments.filter((document) => document.isPinned).length,
    },
  };
}

export async function searchDocuments(filters: DocumentLibraryFilters = {}) {
  return listDocuments(filters);
}

export async function filterDocuments(filters: DocumentLibraryFilters = {}) {
  return listDocuments(filters);
}

export async function getDocument(
  identifier: string,
): Promise<DocumentDetail | null> {
  const user = await requirePermission("documents.view");

  const document = await prisma.document.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: identifier }, { slug: identifier }],
    },
    include: {
      category: true,
      owner: {
        select: {
          id: true,
          displayName: true,
          email: true,
          name: true,
        },
      },
      author: {
        select: {
          id: true,
          displayName: true,
          email: true,
          name: true,
        },
      },
      unit: {
        select: {
          id: true,
          shortName: true,
        },
      },
      currentVersion: {
        select: {
          id: true,
          body: true,
          bodyFormat: true,
        },
      },
      versions: {
        include: {
          createdBy: {
            select: {
              displayName: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: [{ versionNumber: "desc" }],
      },
      attachments: {
        include: {
          createdBy: {
            select: {
              displayName: true,
              email: true,
              name: true,
            },
          },
          documentVersion: {
            select: {
              versionNumber: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      },
      tags: true,
      permissions: {
        include: {
          unit: {
            select: {
              id: true,
              shortName: true,
            },
          },
        },
        orderBy: [{ permissionKey: "asc" }],
      },
      readReceipts: {
        include: {
          user: {
            select: {
              displayName: true,
              email: true,
              name: true,
            },
          },
          documentVersion: {
            select: {
              versionNumber: true,
            },
          },
        },
        orderBy: [{ readAt: "desc" }],
      },
      revisionHistory: {
        include: {
          actor: {
            select: {
              displayName: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
      },
      _count: {
        select: {
          attachments: true,
        },
      },
    },
  });

  if (!document || !canReadDocument(user, document)) {
    return null;
  }

  const relatedDocumentsSource =
    document.categoryId !== null
      ? await prisma.document.findMany({
          where: {
            deletedAt: null,
            categoryId: document.categoryId,
            id: {
              not: document.id,
            },
          },
          include: {
            category: true,
            owner: {
              select: {
                id: true,
                displayName: true,
                email: true,
                name: true,
              },
            },
            author: {
              select: {
                id: true,
                displayName: true,
                email: true,
                name: true,
              },
            },
            unit: {
              select: {
                id: true,
                shortName: true,
              },
            },
            currentVersion: {
              select: {
                id: true,
                body: true,
              },
            },
            tags: true,
            permissions: {
              select: {
                permissionKey: true,
                unitId: true,
              },
            },
            readReceipts: {
              where: {
                userId: user.id,
              },
              select: {
                documentVersionId: true,
              },
            },
            _count: {
              select: {
                attachments: true,
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }],
          take: 4,
        })
      : [];

  const relatedDocuments = filterAccessibleDocuments(user, relatedDocumentsSource).map(
    mapDocumentListItem,
  );
  const currentVersionReadReceipt = document.currentVersion
    ? document.readReceipts.find(
        (receipt) =>
          receipt.userId === user.id &&
          receipt.documentVersionId === document.currentVersion?.id,
      ) ?? null
    : null;

  const mapped: DocumentDetail = {
    ...mapDocumentListItem({
      ...document,
      readReceipts: document.readReceipts
        .filter((receipt) => receipt.userId === user.id)
        .map((receipt) => ({
          documentVersionId: receipt.documentVersionId,
        })),
    }),
    body: document.currentVersion?.body ?? null,
    bodyFormat: normalizeDocumentBodyFormat(document.currentVersion?.bodyFormat),
    versions: document.versions.map(mapVersionSummary),
    attachments: document.attachments.map((attachment) => ({
      id: attachment.id,
      label: attachment.label,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      storageKey: attachment.storageKey,
      sourceUrl: attachment.sourceUrl,
      sizeBytes: attachment.sizeBytes,
      description: attachment.description,
      createdAt: attachment.createdAt,
      createdByDisplayName: getActorDisplayName(attachment.createdBy),
      versionNumber: attachment.documentVersion?.versionNumber ?? null,
    })),
    permissions: document.permissions.map(mapPermissionSummary),
    readReceipts:
      can(user, "documents.readreceipts.view", document.unitId ? { unitId: document.unitId } : undefined) ||
      can(user, "documents.readreceipts.view")
        ? document.readReceipts.map((receipt): DocumentReadReceiptSummary => ({
            id: receipt.id,
            userDisplayName: getActorDisplayName(receipt.user),
            versionNumber: receipt.documentVersion.versionNumber,
            readAt: receipt.readAt,
          }))
        : null,
    revisionHistory: document.revisionHistory.map((entry) => ({
      id: entry.id,
      action: entry.action,
      summary: entry.summary,
      actorDisplayName: getActorDisplayName(entry.actor),
      createdAt: entry.createdAt,
      reason: entry.reason,
      badgeTone: mapRevisionTone(entry.action),
    })),
    tags: document.tags.map((tag) => ({
      id: tag.id,
      key: tag.key,
      label: tag.label,
    })),
    relatedDocumentsPlaceholder: relatedDocuments,
    readAcknowledgement: {
      hasReadCurrentVersion: Boolean(currentVersionReadReceipt),
      readAt: currentVersionReadReceipt?.readAt ?? null,
      currentVersionId: document.currentVersion?.id ?? null,
      readersForCurrentVersion: document.currentVersion
        ? document.readReceipts.filter(
            (receipt) => receipt.documentVersionId === document.currentVersion?.id,
          ).length
        : 0,
    },
    capability: {
      canEdit: matchesUnitScopedPermission(user, "documents.edit", document.unitId),
      canPublish: matchesUnitScopedPermission(user, "documents.publish", document.unitId),
      canArchive: matchesUnitScopedPermission(user, "documents.archive", document.unitId),
      canManageAttachments: matchesUnitScopedPermission(
        user,
        "documents.attachments.manage",
        document.unitId,
      ),
      canManagePermissions: matchesUnitScopedPermission(
        user,
        "documents.permissions.manage",
        document.unitId,
      ),
      canManageReviews: matchesUnitScopedPermission(
        user,
        "documents.review.manage",
        document.unitId,
      ),
      canViewReadReceipts:
        matchesUnitScopedPermission(user, "documents.readreceipts.view", document.unitId),
    },
  };

  return mapped;
}

export async function listVersions(documentId: string) {
  const detail = await getDocument(documentId);

  return detail?.versions ?? [];
}
