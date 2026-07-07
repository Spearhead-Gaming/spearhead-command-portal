import type { DocumentBodyFormat } from "@/server/documents/editor";

export type DocumentStatus = "draft" | "published" | "archived";
export type DocumentVisibility =
  | "public"
  | "members"
  | "unit"
  | "restricted"
  | "admin";

export type DocumentLibraryFilters = {
  q?: string;
  categoryId?: string;
  status?: DocumentStatus | "";
  visibility?: DocumentVisibility | "";
  ownerId?: string;
  unitId?: string;
  reviewState?: "" | "pending" | "overdue";
  mine?: boolean;
  unreadOnly?: boolean;
  pinnedOnly?: boolean;
  tag?: string;
};

export type DocumentOption = {
  id: string;
  label: string;
  key?: string;
  hint?: string | null;
};

export type DocumentCategorySummary = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  documentCount: number;
};

export type DocumentListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  ownerUserId: string | null;
  authorUserId: string | null;
  unitId: string | null;
  status: DocumentStatus;
  visibility: DocumentVisibility;
  category: {
    id: string;
    key: string;
    label: string;
  } | null;
  ownerDisplayName: string | null;
  authorDisplayName: string | null;
  unitShortName: string | null;
  currentVersionNumber: number;
  isPinned: boolean;
  publishedAt: Date | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  archivedAt: Date | null;
  updatedAt: Date;
  excerpt: string;
  tagLabels: string[];
  attachmentCount: number;
  unread: boolean;
};

export type DocumentVersionSummary = {
  id: string;
  versionNumber: number;
  titleSnapshot: string;
  descriptionSnapshot: string | null;
  bodyFormat: DocumentBodyFormat;
  changeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdByDisplayName: string | null;
};

export type DocumentAttachmentSummary = {
  id: string;
  label: string;
  fileName: string;
  mimeType: string;
  storageKey: string | null;
  sourceUrl: string | null;
  sizeBytes: number | null;
  description: string | null;
  createdAt: Date;
  createdByDisplayName: string | null;
  versionNumber: number | null;
};

export type DocumentPermissionSummary = {
  id: string;
  permissionKey: string;
  unitId: string | null;
  unitShortName: string | null;
  notes: string | null;
};

export type DocumentReadReceiptSummary = {
  id: string;
  userDisplayName: string | null;
  versionNumber: number;
  readAt: Date;
};

export type DocumentRevisionSummary = {
  id: string;
  action: string;
  summary: string;
  actorDisplayName: string | null;
  createdAt: Date;
  reason: string | null;
  badgeTone: "info" | "success" | "warning" | "danger" | "muted";
};

export type DocumentDetail = DocumentListItem & {
  body: string | null;
  bodyFormat: DocumentBodyFormat;
  versions: DocumentVersionSummary[];
  attachments: DocumentAttachmentSummary[];
  permissions: DocumentPermissionSummary[];
  readReceipts: DocumentReadReceiptSummary[] | null;
  revisionHistory: DocumentRevisionSummary[];
  tags: Array<{
    id: string;
    key: string;
    label: string;
  }>;
  relatedDocumentsPlaceholder: DocumentListItem[];
  readAcknowledgement: {
    hasReadCurrentVersion: boolean;
    readAt: Date | null;
    currentVersionId: string | null;
    readersForCurrentVersion: number;
  };
  capability: {
    canEdit: boolean;
    canPublish: boolean;
    canArchive: boolean;
    canManageAttachments: boolean;
    canManagePermissions: boolean;
    canManageReviews: boolean;
    canViewReadReceipts: boolean;
  };
};

export type DocumentLibraryData = {
  documents: DocumentListItem[];
  categoryTree: DocumentCategorySummary[];
  recentDocuments: DocumentListItem[];
  recentlyUpdated: DocumentListItem[];
  myDocuments: DocumentListItem[];
  unreadDocuments: DocumentListItem[];
  summary: {
    totalDocuments: number;
    pendingReviews: number;
    overdueReviews: number;
    unreadDocuments: number;
    myDocuments: number;
    pinnedDocuments: number;
  };
};

export type DocumentReferenceData = {
  categories: DocumentOption[];
  owners: DocumentOption[];
  units: DocumentOption[];
  permissionKeys: DocumentOption[];
};
