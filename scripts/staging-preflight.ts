import "dotenv/config";

import { spawnSync } from "node:child_process";

import { prisma } from "../src/server/database/client";
import { validateDeploymentEnvironment } from "../src/server/deployment/env-validation";

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
}

async function run() {
  const validation = await validateDeploymentEnvironment({
    checkFileSystem: true,
    target: "staging",
  });

  for (const warning of validation.warnings) {
    console.warn(`[warn] ${warning.variable ? `${warning.variable}: ` : ""}${warning.message}`);
  }

  if (!validation.ok) {
    for (const error of validation.errors) {
      console.error(`[error] ${error.variable ? `${error.variable}: ` : ""}${error.message}`);
    }

    throw new Error("Staging environment validation failed.");
  }

  runCommand("npx", ["prisma", "validate"]);

  await prisma.$queryRaw`SELECT 1`;
  await prisma.$disconnect();

  console.log("Staging preflight passed: env, Prisma schema, database, and file storage are ready.");
}

run().catch(async (error) => {
  await prisma.$disconnect().catch(() => undefined);
  console.error(error instanceof Error ? error.message : "Staging preflight failed.");
  process.exitCode = 1;
});
