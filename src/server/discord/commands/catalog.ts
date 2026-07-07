import { getDiscordIntegrationConfig } from "@/server/discord/config";

export const discordSlashCommandCatalog = [
  {
    name: "help",
    description: "Show quick help for portal-linked Discord commands.",
    linkedMemberOnly: false,
    defaultEphemeral: true,
    requiredPortalPermission: null,
    options: [],
  },
  {
    name: "profile",
    description: "View your linked portal profile or inspect a permitted member.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: null,
    options: [
      {
        name: "member",
        description: "Optional member name or callsign to inspect.",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "quals",
    description: "Review your linked qualifications or inspect a permitted member.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: null,
    options: [
      {
        name: "member",
        description: "Optional member name or callsign to inspect.",
        type: 3,
        required: false,
      },
      {
        name: "category",
        description: "Optional qualification category filter.",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "events",
    description: "List upcoming operations and event placeholders.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "events.view",
    options: [
      {
        name: "unit",
        description: "Optional unit key or label filter.",
        type: 3,
        required: false,
      },
      {
        name: "deployment",
        description: "Optional deployment key or title filter.",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "rsvp",
    description: "Update RSVP for a linked event record.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "attendance.rsvp.view",
    options: [
      {
        name: "event",
        description: "Portal event identifier or slug placeholder.",
        type: 3,
        required: true,
      },
      {
        name: "status",
        description: "RSVP response: yes, no, or maybe.",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "myunit",
    description: "Summarize the linked member's current unit and readiness context.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "units.view",
    options: [],
  },
  {
    name: "aar",
    description: "Submit a patrol AAR through a portal-backed Discord modal.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "aars.submit",
    options: [],
  },
  {
    name: "patrol",
    description: "Start, list, inspect, complete, or submit AAR follow-up for lightweight patrols.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "patrols.view",
    options: [
      {
        name: "create",
        description: "Start a lightweight patrol through a portal-backed modal.",
        type: 1,
        options: [],
      },
      {
        name: "list",
        description: "List active patrols and patrols awaiting AAR.",
        type: 1,
        options: [],
      },
      {
        name: "info",
        description: "Show a patrol summary.",
        type: 1,
        options: [
          {
            name: "patrol",
            description: "Patrol ID, callsign, or title fragment.",
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: "end",
        description: "Complete one of your running patrols and prompt AAR follow-up.",
        type: 1,
        options: [
          {
            name: "patrol",
            description: "Optional patrol ID, callsign, or title fragment.",
            type: 3,
            required: false,
          },
        ],
      },
      {
        name: "aar",
        description: "Submit Patrol AAR text, then upload the required map screenshot.",
        type: 1,
        options: [],
      },
      {
        name: "screenshot",
        description: "Upload the required map screenshot for your pending Patrol AAR.",
        type: 1,
        options: [
          {
            name: "image",
            description: "PNG, JPG, JPEG, or WEBP map screenshot.",
            type: 11,
            required: true,
          },
          {
            name: "patrol",
            description: "Optional patrol ID, callsign, or title if you have multiple pending AARs.",
            type: 3,
            required: false,
          },
        ],
      },
    ],
  },
  {
    name: "attendance",
    description: "Staff attendance summary for a portal event.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "attendance.view",
    options: [
      {
        name: "event",
        description: "Portal event identifier or title fragment.",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "announce",
    description: "Staff announcement workflow placeholder.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "notifications.send",
    options: [],
  },
  {
    name: "member",
    description: "Staff member lookup shortcut.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "personnel.profile.view",
    options: [
      {
        name: "member",
        description: "Portal member display name or callsign.",
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: "syncroles",
    description: "Preview managed Discord role sync for a mapped server.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "discord.sync.view",
    options: [
      {
        name: "server",
        description: "Optional Discord server name, ID, or guild ID.",
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: "kick",
    description: "Kick a Discord member through portal-audited moderation.",
    linkedMemberOnly: true,
    defaultEphemeral: true,
    requiredPortalPermission: "discord.moderation.kick",
    options: [
      {
        name: "member",
        description: "Target Discord user ID, mention, or portal display name.",
        type: 3,
        required: true,
      },
      {
        name: "reason",
        description: "Required moderation reason.",
        type: 3,
        required: true,
      },
      {
        name: "server",
        description: "Optional Discord server name, ID, or guild ID.",
        type: 3,
        required: false,
      },
    ],
  },
] as const;

export type DiscordSlashCommandDefinition = (typeof discordSlashCommandCatalog)[number];

export function getDiscordSlashCommandDefinition(commandName: string) {
  return discordSlashCommandCatalog.find((command) => command.name === commandName) ?? null;
}

export function buildDiscordSlashCommandRegistrationPayload() {
  return discordSlashCommandCatalog.map((command) => ({
    description: command.description,
    dm_permission: false,
    name: command.name,
    options: command.options,
  }));
}

export function getDiscordCommandRegistrationPlan() {
  const config = getDiscordIntegrationConfig();

  return {
    applicationId: config.applicationId,
    commandCount: discordSlashCommandCatalog.length,
    mode: config.registerMode,
    payload: buildDiscordSlashCommandRegistrationPayload(),
    registrationScopeId: config.registerMode === "guild" ? config.devGuildId || null : null,
  };
}
