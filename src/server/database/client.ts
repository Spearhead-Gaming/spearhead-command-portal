import { PrismaClient } from "@prisma/client";

import { getSystemRuntimeConfig } from "@/server/system/runtime-config";

declare global {
  var __spearheadPrisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  const runtime = getSystemRuntimeConfig();

  return new PrismaClient({
    log:
      runtime.nodeEnv === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

// Future auth, domain services, and Discord integration entry points should all
// share this singleton client instead of constructing their own Prisma instances.
export const prisma =
  globalThis.__spearheadPrisma__ ?? createPrismaClient();

const runtime = getSystemRuntimeConfig();

if (runtime.nodeEnv !== "production") {
  globalThis.__spearheadPrisma__ = prisma;
}
