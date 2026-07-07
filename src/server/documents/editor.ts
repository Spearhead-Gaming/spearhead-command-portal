export const documentBodyFormats = [
  "markdown",
  "richtext",
  "blocks",
] as const;

export type DocumentBodyFormat = (typeof documentBodyFormats)[number];

export type DocumentEditorValue = {
  body: string;
  format: DocumentBodyFormat;
};

export function normalizeDocumentBodyFormat(
  value?: string | null,
): DocumentBodyFormat {
  if (value === "richtext" || value === "blocks") {
    return value;
  }

  return "markdown";
}

export function buildDocumentExcerpt(body?: string | null, maxLength = 180) {
  const normalized = body?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "No document body has been published yet.";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
