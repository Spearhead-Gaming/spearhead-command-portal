"use server";

import { redirect } from "next/navigation";

import {
  archiveDocument,
  createDocument,
  createDocumentCategory,
  createVersion,
  deleteAttachment,
  duplicateDocument,
  manageDocumentPermission,
  publishDocument,
  recordReadReceipt,
  removeDocumentPermission,
  restoreDocument,
  updateDocument,
  updateDocumentCategory,
  uploadAttachment,
} from "@/server/documents/service";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? new Date(value) : null;
}

function getBoolean(formData: FormData, key: string) {
  return getRequiredString(formData, key) === "true";
}

function getTags(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getPermissionRows(formData: FormData) {
  const permissionKey = getOptionalString(formData, "permissionKey");

  if (!permissionKey) {
    return [];
  }

  return [
    {
      permissionKey,
      unitId: getOptionalString(formData, "permissionUnitId"),
      notes: getOptionalString(formData, "permissionNotes"),
    },
  ];
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
  const returnTo = getRequiredString(formData, "returnTo") || "/documents";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function createDocumentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createDocument({
        title: getRequiredString(formData, "title"),
        slug: getOptionalString(formData, "slug"),
        description: getOptionalString(formData, "description"),
        categoryId: getOptionalString(formData, "categoryId"),
        status: getRequiredString(formData, "status") as "draft" | "published" | "archived",
        visibility: getRequiredString(formData, "visibility") as
          | "public"
          | "members"
          | "unit"
          | "restricted"
          | "admin",
        ownerUserId: getOptionalString(formData, "ownerUserId"),
        unitId: getOptionalString(formData, "unitId"),
        body: getOptionalString(formData, "body"),
        bodyFormat: (getOptionalString(formData, "bodyFormat") ?? "markdown") as
          | "markdown"
          | "richtext"
          | "blocks",
        tags: getTags(formData, "tags"),
        isPinned: getBoolean(formData, "isPinned"),
        lastReviewedAt: getOptionalDate(formData, "lastReviewedAt"),
        nextReviewAt: getOptionalDate(formData, "nextReviewAt"),
        permissionRows: getPermissionRows(formData),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Document created.",
  );
}

export async function updateDocumentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      const permissionRows = getPermissionRows(formData);

      await updateDocument({
        documentId: getRequiredString(formData, "documentId"),
        title: getRequiredString(formData, "title"),
        slug: getOptionalString(formData, "slug"),
        description: getOptionalString(formData, "description"),
        categoryId: getOptionalString(formData, "categoryId"),
        visibility: getRequiredString(formData, "visibility") as
          | "public"
          | "members"
          | "unit"
          | "restricted"
          | "admin",
        ownerUserId: getOptionalString(formData, "ownerUserId"),
        unitId: getOptionalString(formData, "unitId"),
        tags: getTags(formData, "tags"),
        isPinned: getBoolean(formData, "isPinned"),
        lastReviewedAt: getOptionalDate(formData, "lastReviewedAt"),
        nextReviewAt: getOptionalDate(formData, "nextReviewAt"),
        permissionRows: permissionRows.length > 0 ? permissionRows : undefined,
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Document updated.",
  );
}

export async function publishDocumentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await publishDocument(
        getRequiredString(formData, "documentId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Document published.",
  );
}

export async function archiveDocumentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await archiveDocument(
        getRequiredString(formData, "documentId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Document archived.",
  );
}

export async function restoreDocumentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await restoreDocument(
        getRequiredString(formData, "documentId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Document restored.",
  );
}

export async function duplicateDocumentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await duplicateDocument(
        getRequiredString(formData, "documentId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Document duplicated.",
  );
}

export async function createVersionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createVersion({
        documentId: getRequiredString(formData, "documentId"),
        body: getOptionalString(formData, "body"),
        bodyFormat: (getOptionalString(formData, "bodyFormat") ?? "markdown") as
          | "markdown"
          | "richtext"
          | "blocks",
        changeSummary: getOptionalString(formData, "changeSummary"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Version created.",
  );
}

export async function uploadAttachmentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await uploadAttachment({
        documentId: getRequiredString(formData, "documentId"),
        documentVersionId: getOptionalString(formData, "documentVersionId"),
        label: getRequiredString(formData, "label"),
        fileName: getRequiredString(formData, "fileName"),
        mimeType: getRequiredString(formData, "mimeType"),
        storageKey: getOptionalString(formData, "storageKey"),
        sourceUrl: getOptionalString(formData, "sourceUrl"),
        sizeBytes: getOptionalNumber(formData, "sizeBytes"),
        description: getOptionalString(formData, "description"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Attachment added.",
  );
}

export async function deleteAttachmentAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await deleteAttachment({
        attachmentId: getRequiredString(formData, "attachmentId"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Attachment removed.",
  );
}

export async function recordReadReceiptAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await recordReadReceipt(
        getRequiredString(formData, "documentId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Read acknowledgement recorded.",
  );
}

export async function manageDocumentPermissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await manageDocumentPermission({
        documentId: getRequiredString(formData, "documentId"),
        permissionKey: getRequiredString(formData, "permissionKey"),
        unitId: getOptionalString(formData, "unitId"),
        notes: getOptionalString(formData, "notes"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Document access rule saved.",
  );
}

export async function removeDocumentPermissionAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await removeDocumentPermission(
        getRequiredString(formData, "documentPermissionId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Document access rule removed.",
  );
}

export async function createDocumentCategoryAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createDocumentCategory({
        key: getRequiredString(formData, "key"),
        label: getRequiredString(formData, "label"),
        description: getOptionalString(formData, "description"),
        sortOrder: getOptionalNumber(formData, "sortOrder"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Category created.",
  );
}

export async function updateDocumentCategoryAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await updateDocumentCategory({
        categoryId: getRequiredString(formData, "categoryId"),
        key: getRequiredString(formData, "key"),
        label: getRequiredString(formData, "label"),
        description: getOptionalString(formData, "description"),
        sortOrder: getOptionalNumber(formData, "sortOrder"),
        isActive: getRequiredString(formData, "isActive") !== "false",
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Category updated.",
  );
}
