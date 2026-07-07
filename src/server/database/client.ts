import { PrismaClient } from "@prisma/client";

declare global {
  var __spearheadPrisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Future auth, domain services, and Discord integration entry points should all
// share this singleton client instead of constructing their own Prisma instances.
export const prisma = globalThis.__spearheadPrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__spearheadPrisma__ = prisma;
}
