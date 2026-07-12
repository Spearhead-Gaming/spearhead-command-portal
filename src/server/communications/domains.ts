import type { DiscordChannelMappingKey, DiscordMessageVisibility } from "@/server/discord/constants";

export const communicationDomainCatalog = [
  {
    defaultMappingKey: "campaign-updates",
    description: "Deployment releases, amendments, corrections, and cancellations.",
    domain: "operational_releases",
    label: "Operational Releases",
    visibility: "public",
  },
  {
    defaultMappingKey: "events",
    description: "Weekend operation announcements, reminders, updates, and cancellations.",
    domain: "weekend_operations",
    label: "Weekend Operations",
    visibility: "public",
  },
  {
    defaultMappingKey: "patrols",
    description: "Patrol starts, updates, completion notices, and AAR prompts.",
    domain: "patrols",
    label: "Patrols",
    visibility: "public",
  },
  {
    defaultMappingKey: "qualification-alerts",
    description: "Qualification awards, expirations, training notices, and course updates.",
    domain: "training",
    label: "Training",
    visibility: "staff",
  },
  {
    defaultMappingKey: "staff-alerts",
    description: "Applications, requests, approvals, denials, and needs-information notices.",
    domain: "applications",
    label: "Applications",
    visibility: "staff",
  },
  {
    defaultMappingKey: "announcements",
    description: "Recruiting-facing application and onboarding communications.",
    domain: "recruitment",
    label: "Recruitment",
    visibility: "public",
  },
  {
    defaultMappingKey: "promotion-alerts",
    description: "Personnel changes, member status changes, and staff-facing roster notices.",
    domain: "personnel",
    label: "Personnel",
    visibility: "staff",
  },
  {
    defaultMappingKey: "qualification-alerts",
    description: "Qualification-specific member, staff, and automation notices.",
    domain: "qualifications",
    label: "Qualifications",
    visibility: "staff",
  },
  {
    defaultMappingKey: "attendance",
    description: "Attendance reminders, finalization, issues, and RSVP follow-up.",
    domain: "attendance",
    label: "Attendance",
    visibility: "public",
  },
  {
    defaultMappingKey: "staff-alerts",
    description: "Community management and staff coordination.",
    domain: "community",
    label: "Community",
    visibility: "staff",
  },
  {
    defaultMappingKey: "staff-alerts",
    description: "Moderation alerts, cases, warnings, appeals, and sensitive staff actions.",
    domain: "moderation",
    label: "Moderation",
    visibility: "staff",
  },
  {
    defaultMappingKey: "admin-alerts",
    description: "Administrator notices, permission changes, delivery failures, and system state.",
    domain: "administration",
    label: "Administration",
    visibility: "staff",
  },
  {
    defaultMappingKey: "admin-alerts",
    description: "Developer bootstrap, diagnostics, and maintenance notices.",
    domain: "developer",
    label: "Developer",
    visibility: "staff",
  },
  {
    defaultMappingKey: "admin-alerts",
    description: "Health checks, degraded subsystems, and recovery notices.",
    domain: "health",
    label: "Health",
    visibility: "staff",
  },
  {
    defaultMappingKey: "admin-alerts",
    description: "Diagnostic output and operational troubleshooting signals.",
    domain: "diagnostics",
    label: "Diagnostics",
    visibility: "staff",
  },
  {
    defaultMappingKey: "announcements",
    description: "Community-wide announcement traffic.",
    domain: "announcements",
    label: "Announcements",
    visibility: "public",
  },
  {
    defaultMappingKey: "staff-alerts",
    description: "Staff-facing alerts and time-sensitive operational notices.",
    domain: "alerts",
    label: "Alerts",
    visibility: "staff",
  },
  {
    defaultMappingKey: "announcements",
    description: "Emergency communications. Use sparingly and review before delivery.",
    domain: "emergency",
    label: "Emergency",
    visibility: "public",
  },
] as const satisfies Array<{
  defaultMappingKey: DiscordChannelMappingKey;
  description: string;
  domain: string;
  label: string;
  visibility: DiscordMessageVisibility;
}>;

export type CommunicationDomain = (typeof communicationDomainCatalog)[number]["domain"];

const domainsByKey = new Map<string, (typeof communicationDomainCatalog)[number]>(
  communicationDomainCatalog.map((definition) => [definition.domain, definition]),
);

export function getCommunicationDomainDefinition(domain: string) {
  return domainsByKey.get(domain) ?? null;
}

export function getCommunicationDomainDefinitions() {
  return communicationDomainCatalog;
}
