#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 3000;
const DEFAULT_SCAN_LIMIT = 50;

function readPositiveInteger(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isAutoIncrementEnabled() {
  return process.env.PORT_AUTO_INCREMENT !== "false";
}

function canListen(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error && ["EADDRINUSE", "EACCES"].includes(error.code)) {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen({ host, port });
  });
}

async function findAvailablePort(startPort, host, scanLimit) {
  const maxPort = Math.min(65535, startPort + Math.max(scanLimit, 1) - 1);

  for (let port = startPort; port <= maxPort; port += 1) {
    if (await canListen(port, host)) {
      return port;
    }

    if (!isAutoIncrementEnabled()) {
      break;
    }
  }

  throw new Error(
    isAutoIncrementEnabled()
      ? `No available port found from ${startPort} through ${maxPort}.`
      : `Configured port ${startPort} is not available.`,
  );
}

async function main() {
  const host = process.env.WEB_BIND || process.env.HOST || "0.0.0.0";
  const startPort = readPositiveInteger(process.env.PORT || process.env.WEB_PORT, DEFAULT_PORT);
  const scanLimit = readPositiveInteger(process.env.PORT_SCAN_LIMIT, DEFAULT_SCAN_LIMIT);
  const selectedPort = await findAvailablePort(startPort, host, scanLimit);
  const nextBin = fileURLToPath(import.meta.resolve("next/dist/bin/next"));

  if (selectedPort !== startPort) {
    console.warn(
      `[start] Port ${startPort} is unavailable on ${host}; using next available port ${selectedPort}.`,
    );
  } else {
    console.log(`[start] Starting Spearhead Command Portal on ${host}:${selectedPort}.`);
  }

  if (process.env.START_NEXT_DRY_RUN === "true") {
    console.log(`[start] Dry run selected ${host}:${selectedPort}.`);
    return;
  }

  const child = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", String(selectedPort)], {
    env: {
      ...process.env,
      PORT: String(selectedPort),
      WEB_PORT: String(selectedPort),
    },
    stdio: "inherit",
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`[start] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
