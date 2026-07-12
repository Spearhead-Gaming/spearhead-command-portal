import "dotenv/config";

function getBaseUrl() {
  const value =
    process.env.STAGING_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "http://127.0.0.1:3000";

  return value.replace(/\/+$/, "");
}

async function checkEndpoint(baseUrl: string, path: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}.`);
  }

  return response.json() as Promise<{ status?: string }>;
}

async function run() {
  const baseUrl = getBaseUrl();

  console.log(`Verifying staging target: ${baseUrl}`);

  const live = await checkEndpoint(baseUrl, "/api/health/live");
  console.log(`/api/health/live: ${live.status ?? "ok"}`);

  const ready = await checkEndpoint(baseUrl, "/api/health/ready");
  console.log(`/api/health/ready: ${ready.status ?? "ok"}`);

  console.log("Staging verification passed.");
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Staging verification failed.");
  process.exitCode = 1;
});
