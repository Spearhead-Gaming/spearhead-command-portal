import { NextResponse } from "next/server";

import { getLivenessReport } from "@/server/deployment/health";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getLivenessReport());
}
