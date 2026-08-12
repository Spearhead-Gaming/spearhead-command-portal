import { NextResponse } from "next/server";

import { getApplicationVersion } from "@/server/system/version";

export function GET() {
  return NextResponse.json(getApplicationVersion());
}
