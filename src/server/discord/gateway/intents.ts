import type { DiscordGatewayIntentName } from "@/server/discord/gateway/types";

const intentBits: Record<DiscordGatewayIntentName, number> = {
  GuildMembers: 1 << 1,
  GuildMessages: 1 << 9,
  GuildScheduledEvents: 1 << 16,
  GuildVoiceStates: 1 << 7,
  Guilds: 1 << 0,
  MessageContent: 1 << 15,
};

export const gatewayIntentFeatureMatrix = [
  {
    features: ["guild availability", "role/channel resource observation", "thread metadata"],
    intent: "Guilds",
    privileged: false,
    requiredByDefault: true,
  },
  {
    features: ["member join", "member leave", "member identity update", "role observation"],
    intent: "GuildMembers",
    privileged: true,
    requiredByDefault: true,
  },
  {
    features: ["patrol voice suggestions", "voice-awareness widgets"],
    intent: "GuildVoiceStates",
    privileged: false,
    requiredByDefault: true,
  },
  {
    features: ["Discord-native scheduled event observation"],
    intent: "GuildScheduledEvents",
    privileged: false,
    requiredByDefault: false,
  },
  {
    features: ["scoped attachment continuation for active interaction sessions"],
    intent: "GuildMessages",
    privileged: false,
    requiredByDefault: false,
  },
  {
    features: ["reserved for future scoped text continuation only"],
    intent: "MessageContent",
    privileged: true,
    requiredByDefault: false,
  },
] as const satisfies Array<{
  features: string[];
  intent: DiscordGatewayIntentName;
  privileged: boolean;
  requiredByDefault: boolean;
}>;

export function calculateGatewayIntentBitmask(intents: string[]) {
  return intents.reduce((bitmask, intent) => bitmask | (intentBits[intent as DiscordGatewayIntentName] ?? 0), 0);
}

export function normalizeGatewayIntents(intents: string[]) {
  return intents.filter((intent): intent is DiscordGatewayIntentName => intent in intentBits);
}
