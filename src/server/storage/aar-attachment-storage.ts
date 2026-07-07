import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), "storage");
const aarAttachmentRoot = path.join(storageRoot, "aar-attachments");

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getAarAttachmentStoragePath(storageKey: string) {
  return path.join(aarAttachmentRoot, storageKey);
}

export async function putAarAttachmentFile(input: {
  aarId: string;
  bytes: Buffer;
  originalFileName: string;
}) {
  const safeName = sanitizeFileName(input.originalFileName);
  const storageKey = path.join(input.aarId, `${randomUUID()}-${safeName}`).replaceAll("\\", "/");
  const absolutePath = getAarAttachmentStoragePath(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.bytes);

  return {
    fileSizeBytes: input.bytes.byteLength,
    storageKey,
  };
}

export async function readAarAttachmentFile(storageKey: string) {
  const absolutePath = getAarAttachmentStoragePath(storageKey);
  const [bytes, fileStat] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);

  return {
    bytes,
    lastModified: fileStat.mtime,
    size: fileStat.size,
  };
}
