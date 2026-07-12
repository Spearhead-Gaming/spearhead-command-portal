import { NextResponse } from "next/server";

import { validateDiscordApplicationContinuation } from "@/server/discord/applications/service";
import { getPortalBaseUrl } from "@/server/discord/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session") ?? "";
  const token = url.searchParams.get("token") ?? "";

  try {
    const result = await validateDiscordApplicationContinuation({
      sessionId,
      token,
    });

    return NextResponse.redirect(new URL(result.redirectUrl, getPortalBaseUrl()));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Application continuation link could not be validated.";
    const redirectUrl = new URL("/applications", getPortalBaseUrl());

    redirectUrl.searchParams.set("error", message);

    return NextResponse.redirect(redirectUrl);
  }
}
