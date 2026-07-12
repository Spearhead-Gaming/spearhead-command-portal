import { NextResponse } from "next/server";

import { getReadinessReport } from "@/server/deployment/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getReadinessReport();
  const status = report.status === "error" ? 503 : 200;

  return NextResponse.json(report, { status });
}
