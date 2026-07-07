import { handleDiscordInteractionRequest } from "@/server/discord/interactions/handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleDiscordInteractionRequest(request);
}
