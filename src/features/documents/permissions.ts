export const documentPermissions = {
  documentsIndex: [
    "documents.view",
    "documents.create",
    "documents.edit",
    "documents.publish",
    "documents.restrict",
  ],
  documentDetail: [
    "documents.view",
    "documents.edit",
    "documents.publish",
    "documents.restrict",
  ],
} as const;
