export const discordChannelMappingCatalog = [
  {
    key: "announcements",
    label: "Announcements",
    description: "Community-wide announcements and portal updates.",
    audience: "public",
  },
  {
    key: "events",
    label: "Events",
    description: "Event announcements, publication notices, and reminders.",
    audience: "public",
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Attendance reminders and follow-up notices.",
    audience: "public",
  },
  {
    key: "patrols",
    label: "Patrols",
    description: "Lightweight patrol starts, interest buttons, and patrol follow-up prompts.",
    audience: "public",
  },
  {
    key: "conops",
    label: "CONOPs",
    description: "Operation planning and CONOP publication notices.",
    audience: "staff",
  },
  {
    key: "intel",
    label: "Intel",
    description: "Staff-only operational intelligence placeholders.",
    audience: "staff",
  },
  {
    key: "staff-alerts",
    label: "Staff Alerts",
    description: "Internal staff coordination and review alerts.",
    audience: "staff",
  },
  {
    key: "admin-alerts",
    label: "Admin Alerts",
    description: "System alerts, delivery failures, and operator notices.",
    audience: "staff",
  },
  {
    key: "qualification-alerts",
    label: "Qualification Alerts",
    description: "Qualification award and requirement placeholders.",
    audience: "staff",
  },
  {
    key: "promotion-alerts",
    label: "Promotion Alerts",
    description: "Promotion and personnel milestone placeholders.",
    audience: "staff",
  },
  {
    key: "campaign-updates",
    label: "Deployment Updates",
    description: "Deployment timeline and phase change placeholders.",
    audience: "public",
  },
] as const;

export const discordMessageVisibilityCatalog = ["public", "staff", "ephemeral"] as const;
export const discordRoleMappingTypeCatalog = [
  "unit",
  "qualification",
  "portal_role",
  "rank",
] as const;

export type DiscordChannelMappingKey = (typeof discordChannelMappingCatalog)[number]["key"];
export type DiscordMessageVisibility = (typeof discordMessageVisibilityCatalog)[number];
export type DiscordRoleMappingType = (typeof discordRoleMappingTypeCatalog)[number];

const mappingDefinitionsByKey = new Map<string, (typeof discordChannelMappingCatalog)[number]>(
  discordChannelMappingCatalog.map((definition) => [definition.key, definition]),
);

export function isDiscordChannelMappingKey(value: string): value is DiscordChannelMappingKey {
  return discordChannelMappingCatalog.some((definition) => definition.key === value);
}

export function isDiscordRoleMappingType(value: string): value is DiscordRoleMappingType {
  return discordRoleMappingTypeCatalog.some((entry) => entry === value);
}

export function getDiscordChannelMappingDefinition(key: string) {
  return mappingDefinitionsByKey.get(key) ?? null;
}
