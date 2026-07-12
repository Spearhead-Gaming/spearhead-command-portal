import "dotenv/config";

import { validateDeploymentEnvironment } from "../src/server/deployment/env-validation";

function getArgValue(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);

  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function run() {
  const target = getArgValue("target") as "web" | "gateway" | "staging" | "production" | undefined;
  const checkFileSystem = process.argv.includes("--check-files");
  const result = await validateDeploymentEnvironment({ checkFileSystem, target });

  console.log(`Environment target: ${result.target}`);

  for (const warning of result.warnings) {
    console.warn(`[warn] ${warning.variable ? `${warning.variable}: ` : ""}${warning.message}`);
  }

  for (const error of result.errors) {
    console.error(`[error] ${error.variable ? `${error.variable}: ` : ""}${error.message}`);
  }

  if (!result.ok) {
    console.error("Environment validation failed. Secrets were checked for presence/shape only and were not printed.");
    process.exitCode = 1;
    return;
  }

  console.log("Environment validation passed. Secrets were not printed.");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Environment validation failed.");
  process.exitCode = 1;
});
