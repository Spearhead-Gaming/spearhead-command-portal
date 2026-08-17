import { NextResponse } from "next/server";

import { getSystemInfo } from "@/server/system/config";

export function GET() {
  return NextResponse.json(getSystemInfo());
}