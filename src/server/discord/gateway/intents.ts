import type { DiscordGatewayIntentName } from "@/server/discord/gateway/types";

const intentBits: Record<DiscordGatewayIntentName, number> = {
  GuildMembers: 1 << 1,
  GuildMessages: 1 << 9,
  GuildVoiceStates: 1 << 7,
  Guilds: 1 << 0,
  MessageContent: 1 << 15,
};

export function calculateGatewayIntentBitmask(intents: string[]) {
  return intents.reduce((bitmask, intent) => bitmask | (intentBits[intent as DiscordGatewayIntentName] ?? 0), 0);
}

export function normalizeGatewayIntents(intents: string[]) {
  return intents.filter((intent): intent is DiscordGatewayIntentName => intent in intentBits);
}
