import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), "storage");
const deploymentResourceRoot = path.join(storageRoot, "deployment-resources");

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export function getDeploymentResourceStoragePath(storageKey: string) {
  return path.join(deploymentResourceRoot, storageKey);
}

export async function putDeploymentResourceFile(input: {
  bytes: Buffer;
  originalFileName: string;
  resourceId?: string | null;
}) {
  const safeName = sanitizeFileName(input.originalFileName);
  const resourceFolder = input.resourceId ?? "unassigned";
  const storageKey = path.join(resourceFolder, `${randomUUID()}-${safeName}`).replaceAll("\\", "/");
  const absolutePath = getDeploymentResourceStoragePath(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.bytes);

  return {
    checksum: createHash("sha256").update(input.bytes).digest("hex"),
    fileSizeBytes: input.bytes.byteLength,
    storageKey,
  };
}

export async function readDeploymentResourceFile(storageKey: string) {
  const absolutePath = getDeploymentResourceStoragePath(storageKey);
  const [bytes, fileStat] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);

  return {
    bytes,
    lastModified: fileStat.mtime,
    size: fileStat.size,
  };
}
