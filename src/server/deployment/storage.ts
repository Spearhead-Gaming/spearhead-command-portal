import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function getFileStorageRoot() {
  return process.env.FILE_STORAGE_ROOT ?? process.env.FILE_STORAGE_PATH ?? path.join(process.cwd(), "storage");
}

export async function ensureFileStorageRoot() {
  const storageRoot = getFileStorageRoot();

  await mkdir(storageRoot, { recursive: true });

  return storageRoot;
}

export async function checkFileStorageWritable() {
  const storageRoot = await ensureFileStorageRoot();
  const probePath = path.join(storageRoot, `.healthcheck-${process.pid}-${Date.now()}`);

  await writeFile(probePath, "ok", { encoding: "utf8" });
  await access(probePath);
  await rm(probePath, { force: true });

  return storageRoot;
}
