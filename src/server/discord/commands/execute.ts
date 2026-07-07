import { prisma } from "@/server/database/client";
import { getPortalUserByDiscordId } from "@/server/auth/current-user";
import { can } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel";
import { getPortalBaseUrl } from "@/server/discord/config";
import { kickDiscordGuildMember } from "@/server/discord/guild-members";
import { completeInteractionSession } from "@/server/discord/interactions/sessions";
import { findActiveSessionForUser } from "@/server/discord/interactions/sessions/service";
import { previewDiscordRoleSync } from "@/server/discord/role-sync";
import { updateRsvpFromDiscord } from "@/server/attendance/service";
import { getEventStatusLabel, getEventTypeLabel, isRsvpStatus } from "@/server/events/utils";
import { completePatrolAsActor } from "@/server/patrols/service";
import { attachAarMapScreenshotAsActor } from "@/server/s3/service";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import type { PortalUser } from "@/features/auth/types";

type DiscordCommandOption = {
  name?: string;
  options?: DiscordCommandOption[];
  type?: number;
  value?: boolean | number | string;
};

type DiscordResolvedAttachment = {
  content_type?: string;
  filename: string;
  id: string;
  proxy_url?: string;
  size?: number;
  url: string;
};

type DiscordCommandExecutionContext = {
  commandName: string;
  discordUserId: string;
  options?: DiscordCommandOption[];
  resolvedAttachments?: Record<string, DiscordResolvedAttachment>;
};

type DiscordCommandResponse = {
  actions?: Array<{
    customId?: string;
    label: string;
    style: "danger" | "link" | "primary" | "secondary" | "success";
    url?: string;
  }>;
  content: string;
  ephemeral?: boolean;
};

function getOptionValue(options: DiscordCommandOption[] | undefined, name: string) {
  const option = options?.find((entry) => entry.name === name);
  const value = option?.value;

  return typeof value === "string" ? value.trim() : "";
}

function getSubcommand(options: DiscordCommandOption[] | undefined) {
  return options?.find((entry) => entry.type === 1) ?? null;
}

function getSubcommandOptionValue(
  subcommand: DiscordCommandOption | null,
  name: string,
) {
  return getOptionValue(subcommand?.options, name);
}

function getSubcommandAttachment(
  input: {
    resolvedAttachments?: Record<string, DiscordResolvedAttachment>;
    subcommand: DiscordCommandOption | null;
  },
  name: string,
) {
  const attachmentId = getSubcommandOptionValue(input.subcommand, name);

  return attachmentId ? input.resolvedAttachments?.[attachmentId] ?? null : null;
}

async function downloadDiscordAttachment(attachment: DiscordResolvedAttachment) {
  if (attachment.size && attachment.size > 10 * 1024 * 1024) {
    throw new Error("Map screenshots must be 10 MB or smaller.");
  }

  const response = await fetch(attachment.url);

  if (!response.ok) {
    throw new Error("Discord attachment could not be downloaded.");
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  return {
    bytes,
    name: attachment.filename,
    type: attachment.content_type ?? response.headers.get("content-type"),
  };
}

function normalizeDiscordMention(value: string) {
  const match = value.match(/^<@!?(\d+)>$/);

  return match?.[1] ?? value;
}

function buildLinkedAccountMessage() {
  return "Your Discord account is not linked to a portal user yet. Sign in to the portal first, then try again.";
}

function buildNoLinkedProfileMessage() {
  return "Your portal account is authenticated, but it is not linked to a member profile yet.";
}

function hasAnyPermissionGrant(user: PortalUser, permissionKey: string) {
  return user.permissionGrants.some((grant) => grant.key === permissionKey);
}

async function requireLinkedPortalUser(discordUserId: string) {
  const user = await getPortalUserByDiscordId(discordUserId);

  if (!user) {
    return {
      error: buildLinkedAccountMessage(),
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

async function resolveMemberProfileForCommand(input: {
  actor: PortalUser;
  memberQuery: string;
}) {
  const query = input.memberQuery.trim();

  if (!query) {
    if (!input.actor.memberProfileId) {
      throw new Error(buildNoLinkedProfileMessage());
    }

    return prisma.memberProfile.findUnique({
      where: {
        id: input.actor.memberProfileId,
      },
      include: {
        currentPosition: true,
        currentRank: true,
        currentUnit: true,
        status: true,
        user: true,
      },
    });
  }

  if (!hasAnyPermissionGrant(input.actor, "personnel.profile.view")) {
    throw new Error("You do not have permission to inspect other member profiles.");
  }

  return prisma.memberProfile.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        {
          id: query,
        },
        {
          displayName: {
            contains: query,
          },
        },
        {
          callsign: {
            contains: query,
          },
        },
        {
          user: {
            is: {
              displayName: {
                contains: query,
              },
            },
          },
        },
      ],
    },
    include: {
      currentPosition: true,
      currentRank: true,
      currentUnit: true,
      status: true,
      user: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

function formatProfileResponse(member: NonNullable<Awaited<ReturnType<typeof resolveMemberProfileForCommand>>>) {
  return [
    `Profile: ${getMemberDisplayName(member)}`,
    `Status: ${member.status.label}`,
    `Unit: ${member.currentUnit?.name ?? "Unassigned"}`,
    `Position: ${member.currentPosition?.title ?? "Unassigned"}`,
    `Rank: ${member.currentRank?.abbreviation ?? "Not used"}`,
    `Discord: ${member.user?.discordId ? "Linked" : "Not linked"}`,
  ].join("\n");
}

async function executeHelpCommand(input: {
  actor: PortalUser | null;
}): Promise<DiscordCommandResponse> {
  const commandLines = [
    "/help - Show portal command help",
    "/profile - View your linked service record summary",
    "/quals - Review your qualification summary",
    "/events - List upcoming portal events",
    "/rsvp - Update RSVP for a published event",
    "/myunit - Show your current unit snapshot",
    "/patrol create/list/info/end/aar/screenshot - Manage lightweight patrols",
    "/aar - Submit a patrol AAR through a secure modal",
  ];

  if (input.actor && (hasAnyPermissionGrant(input.actor, "attendance.view") || hasAnyPermissionGrant(input.actor, "attendance.record"))) {
    commandLines.push("/attendance - Staff attendance summary");
  }

  if (input.actor && hasAnyPermissionGrant(input.actor, "personnel.profile.view")) {
    commandLines.push("/member - Staff member lookup");
  }

  if (input.actor && hasAnyPermissionGrant(input.actor, "notifications.send")) {
    commandLines.push("/announce - Staff announcement placeholder");
  }

  if (input.actor && (hasAnyPermissionGrant(input.actor, "discord.sync.view") || hasAnyPermissionGrant(input.actor, "discord.sync.run"))) {
    commandLines.push("/syncroles - Preview mapped Discord role sync");
  }

  if (input.actor && hasAnyPermissionGrant(input.actor, "discord.moderation.kick")) {
    commandLines.push("/kick - Kick a Discord member through portal-audited moderation");
  }

  return {
    content: `Spearhead C2 Bot commands\n${commandLines.join("\n")}\nPortal remains the source of truth.`,
    ephemeral: true,
  };
}

async function executeProfileCommand(actor: PortalUser, options: DiscordCommandOption[] | undefined) {
  const member = await resolveMemberProfileForCommand({
    actor,
    memberQuery: getOptionValue(options, "member"),
  });

  if (!member) {
    throw new Error("Member profile not found.");
  }

  return {
    content: formatProfileResponse(member),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executeQualificationsCommand(
  actor: PortalUser,
  options: DiscordCommandOption[] | undefined,
) {
  const member = await resolveMemberProfileForCommand({
    actor,
    memberQuery: getOptionValue(options, "member"),
  });

  if (!member) {
    throw new Error("Member profile not found.");
  }

  const scope = member.currentUnitId ? { unitId: member.currentUnitId } : undefined;
  const isSelf = actor.memberProfileId === member.id;

  if (!isSelf && !can(actor, "qualifications.record.view", scope) && !can(actor, "qualifications.record.view")) {
    throw new Error("You do not have permission to inspect that member's qualifications.");
  }

  const categoryQuery = getOptionValue(options, "category");
  const qualificationRecords = await prisma.memberQualification.findMany({
    where: {
      memberProfileId: member.id,
      revokedAt: null,
      ...(categoryQuery
        ? {
            qualification: {
              category: {
                OR: [
                  {
                    key: categoryQuery,
                  },
                  {
                    label: {
                      contains: categoryQuery,
                    },
                  },
                ],
              },
            },
          }
        : {}),
    },
    include: {
      qualification: {
        include: {
          category: true,
        },
      },
    },
    orderBy: [
      {
        awardedAt: "desc",
      },
    ],
    take: 6,
  });

  const lines = [
    `Qualifications: ${getMemberDisplayName(member)}`,
    `Active records: ${qualificationRecords.length}`,
  ];

  if (qualificationRecords.length === 0) {
    lines.push("No active qualifications found.");
  } else {
    for (const record of qualificationRecords) {
      lines.push(
        `- ${record.qualification.label} (${record.qualification.category.label}) • ${record.status}`,
      );
    }
  }

  return {
    content: lines.join("\n"),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executeEventsCommand(actor: PortalUser, options: DiscordCommandOption[] | undefined) {
  if (!hasAnyPermissionGrant(actor, "events.view")) {
    throw new Error("You do not have permission to view portal events.");
  }

  const unitQuery = getOptionValue(options, "unit");
  const campaignQuery = getOptionValue(options, "deployment") ?? getOptionValue(options, "campaign");
  const accessibleUnitIds = Array.from(
    new Set(
      actor.permissionGrants
        .filter((grant) => grant.key === "events.view" && grant.unitId)
        .map((grant) => grant.unitId!),
    ),
  );
  const events = await prisma.event.findMany({
    where: {
      status: {
        in: ["published", "draft", "completed"],
      },
      startsAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      ...(can(actor, "events.view")
        ? {}
        : {
            hostUnitId: {
              in: accessibleUnitIds.length > 0 ? accessibleUnitIds : ["__no-access__"],
            },
          }),
      ...(unitQuery
        ? {
            hostUnit: {
              OR: [
                {
                  key: unitQuery,
                },
                {
                  name: {
                    contains: unitQuery,
                  },
                },
                {
                  shortName: {
                    contains: unitQuery,
                  },
                },
              ],
            },
          }
        : {}),
      ...(campaignQuery
        ? {
            campaign: {
              OR: [
                {
                  key: campaignQuery,
                },
                {
                  title: {
                    contains: campaignQuery,
                  },
                },
              ],
            },
          }
        : {}),
    },
    include: {
      campaign: true,
      hostUnit: true,
    },
    orderBy: {
      startsAt: "asc",
    },
    take: 5,
  });

  const lines = ["Upcoming Events"];

  if (events.length === 0) {
    lines.push("No matching events found.");
  } else {
    for (const event of events) {
      lines.push(
        `- ${event.title} • ${getEventTypeLabel(event.eventType)} • ${getEventStatusLabel(event.status)} • ${event.hostUnit?.shortName ?? "Community"} • ${event.startsAt.toLocaleString("en-US")}`,
      );
    }
  }

  return {
    content: lines.join("\n"),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function resolveEventForRsvp(eventQuery: string) {
  const query = eventQuery.trim();

  if (!query) {
    throw new Error("Event is required.");
  }

  return prisma.event.findFirst({
    where: {
      OR: [
        {
          id: query,
        },
        {
          title: {
            contains: query,
          },
        },
      ],
    },
    orderBy: {
      startsAt: "asc",
    },
  });
}

async function executeRsvpCommand(actor: PortalUser, options: DiscordCommandOption[] | undefined) {
  if (!actor.discordId) {
    throw new Error(buildLinkedAccountMessage());
  }

  if (!actor.memberProfileId) {
    throw new Error(buildNoLinkedProfileMessage());
  }

  const event = await resolveEventForRsvp(getOptionValue(options, "event"));

  if (!event) {
    throw new Error("Event not found.");
  }

  const status = getOptionValue(options, "status").toLowerCase();

  if (!isRsvpStatus(status)) {
    throw new Error("RSVP status must be yes, no, or maybe.");
  }

  const result = await updateRsvpFromDiscord({
    discordUserId: actor.discordId,
    eventId: event.id,
    reason: "RSVP updated from Discord slash command.",
    rsvpStatus: status,
  });

  return {
    content: `RSVP updated: ${result.event.title} is now ${status.toUpperCase()}.`,
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executeMyUnitCommand(actor: PortalUser) {
  if (!hasAnyPermissionGrant(actor, "units.view")) {
    throw new Error("You do not have permission to inspect unit summaries.");
  }

  if (!actor.memberProfileId) {
    throw new Error(buildNoLinkedProfileMessage());
  }

  const member = await prisma.memberProfile.findUnique({
    where: {
      id: actor.memberProfileId,
    },
    include: {
      currentPosition: true,
      currentUnit: {
        include: {
          currentMembers: {
            where: {
              deletedAt: null,
              isActive: true,
            },
            select: {
              id: true,
            },
          },
          positions: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
            },
          },
        },
      },
      qualifications: {
        where: {
          revokedAt: null,
          status: "qualified",
        },
        select: {
          id: true,
        },
      },
      status: true,
    },
  });

  if (!member?.currentUnit) {
    throw new Error("You do not currently have a unit assignment.");
  }

  return {
    content: [
      `Unit: ${member.currentUnit.name}`,
      `Status: ${member.status.label}`,
      `Position: ${member.currentPosition?.title ?? "Unassigned"}`,
      `Active roster: ${member.currentUnit.currentMembers.length}`,
      `Tracked positions: ${member.currentUnit.positions.length}`,
      `Qualified records: ${member.qualifications.length}`,
    ].join("\n"),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executeAttendanceCommand(actor: PortalUser, options: DiscordCommandOption[] | undefined) {
  if (!hasAnyPermissionGrant(actor, "attendance.view") && !hasAnyPermissionGrant(actor, "attendance.record")) {
    throw new Error("You do not have permission to inspect attendance summaries.");
  }

  const event = await resolveEventForRsvp(getOptionValue(options, "event"));

  if (!event) {
    throw new Error("Event not found.");
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      eventId: event.id,
    },
  });

  await recordAuditEvent({
    action: "discord.command.attendance",
    actorUserId: actor.id,
    entityId: event.id,
    entityType: "Event",
    summary: `Discord staff attendance command used for ${event.title}.`,
  });

  return {
    content: [
      `Attendance: ${event.title}`,
      `RSVP Yes: ${records.filter((record) => record.rsvpStatus === "yes").length}`,
      `RSVP No: ${records.filter((record) => record.rsvpStatus === "no").length}`,
      `RSVP Maybe: ${records.filter((record) => record.rsvpStatus === "maybe").length}`,
      `Present: ${records.filter((record) => record.finalStatus === "present").length}`,
      `Locked: ${records.every((record) => record.lockedAt !== null) ? "Yes" : "No"}`,
    ].join("\n"),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executeAnnounceCommand(actor: PortalUser) {
  if (!hasAnyPermissionGrant(actor, "notifications.send")) {
    throw new Error("You do not have permission to send managed announcements.");
  }

  await recordAuditEvent({
    action: "discord.command.announce",
    actorUserId: actor.id,
    entityType: "DiscordCommand",
    summary: "Discord announce staff command placeholder used.",
  });

  return {
    content:
      "Managed announcement posting remains portal-first. Use the portal event, deployment, or notification workflows so delivery tracking and audit records stay complete.",
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executeMemberCommand(actor: PortalUser, options: DiscordCommandOption[] | undefined) {
  if (!hasAnyPermissionGrant(actor, "personnel.profile.view")) {
    throw new Error("You do not have permission to inspect member records.");
  }

  const member = await resolveMemberProfileForCommand({
    actor,
    memberQuery: getOptionValue(options, "member"),
  });

  if (!member) {
    throw new Error("Member profile not found.");
  }

  await recordAuditEvent({
    action: "discord.command.member",
    actorUserId: actor.id,
    entityId: member.id,
    entityType: "MemberProfile",
    summary: `Discord staff member lookup used for ${getMemberDisplayName(member)}.`,
  });

  return {
    content: formatProfileResponse(member),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executeSyncRolesCommand(actor: PortalUser, options: DiscordCommandOption[] | undefined) {
  if (!hasAnyPermissionGrant(actor, "discord.sync.view") && !hasAnyPermissionGrant(actor, "discord.sync.run")) {
    throw new Error("You do not have permission to preview Discord role sync.");
  }

  const serverQuery = getOptionValue(options, "server");
  const server = await prisma.discordServer.findFirst({
    where: {
      isActive: true,
      ...(serverQuery
        ? {
            OR: [
              {
                id: serverQuery,
              },
              {
                name: {
                  contains: serverQuery,
                },
              },
              {
                guildId: serverQuery,
              },
            ],
          }
        : {}),
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  if (!server) {
    throw new Error("No active Discord server mapping is available for sync preview.");
  }

  const preview = await previewDiscordRoleSync({
    actorUserId: actor.id,
    discordServerId: server.id,
  });

  return {
    content: [
      `Role Sync Preview: ${preview.serverName}`,
      `Members evaluated: ${preview.summary.membersEvaluated}`,
      `Members touched: ${preview.summary.touchedMembers}`,
      `Roles to add: ${preview.summary.addOperations}`,
      `Roles to remove: ${preview.summary.removeOperations}`,
      preview.changes[0]
        ? `First change: ${preview.changes[0].displayName} (+${preview.changes[0].addRoleLabels.join(", ") || "none"} / -${preview.changes[0].removeRoleLabels.join(", ") || "none"})`
        : "No managed role changes are pending.",
    ].join("\n"),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function resolveDiscordModerationServer(serverQuery: string) {
  return prisma.discordServer.findFirst({
    where: {
      isActive: true,
      ...(serverQuery
        ? {
            OR: [
              {
                id: serverQuery,
              },
              {
                guildId: serverQuery,
              },
              {
                name: {
                  contains: serverQuery,
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        name: "asc",
      },
    ],
  });
}

async function resolveDiscordKickTarget(input: {
  memberQuery: string;
  serverId: string;
}) {
  const query = normalizeDiscordMention(input.memberQuery.trim());

  if (!query) {
    throw new Error("A target member is required.");
  }

  const state = await prisma.discordGuildMemberState.findFirst({
    where: {
      discordServerId: input.serverId,
      OR: [
        {
          discordUserId: query,
        },
        {
          displayName: {
            contains: query,
          },
        },
        {
          username: {
            contains: query,
          },
        },
        {
          memberProfile: {
            is: {
              displayName: {
                contains: query,
              },
            },
          },
        },
      ],
    },
    orderBy: [
      {
        syncStatus: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });

  return state?.discordUserId ?? query;
}

async function executeKickCommand(actor: PortalUser, options: DiscordCommandOption[] | undefined) {
  if (!hasAnyPermissionGrant(actor, "discord.moderation.kick")) {
    throw new Error("You do not have permission to kick Discord members.");
  }

  const reason = getOptionValue(options, "reason");

  if (!reason) {
    throw new Error("A moderation reason is required.");
  }

  const server = await resolveDiscordModerationServer(getOptionValue(options, "server"));

  if (!server) {
    throw new Error("No active Discord server mapping is available for moderation.");
  }

  const targetDiscordUserId = await resolveDiscordKickTarget({
    memberQuery: getOptionValue(options, "member"),
    serverId: server.id,
  });
  const action = await kickDiscordGuildMember({
    actorUserId: actor.id,
    discordServerId: server.id,
    reason,
    targetDiscordUserId,
  });

  await recordAuditEvent({
    action: "discord.command.kick",
    actorUserId: actor.id,
    entityId: action.id,
    entityType: "DiscordModerationAction",
    reason,
    summary: `Discord /kick command used against ${targetDiscordUserId}.`,
  });

  return {
    content: `Kick processed for ${targetDiscordUserId} in ${server.name}. Result: ${action.result}.`,
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

function formatPatrolDuration(minutes: number | null) {
  if (!minutes) {
    return "duration TBD";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

async function resolvePatrolForCommand(input: {
  actor: PortalUser;
  query: string;
  requireLeaderActiveFallback?: boolean;
}) {
  const query = input.query.trim();

  if (!query && input.requireLeaderActiveFallback) {
    const patrols = await prisma.event.findMany({
      where: {
        deletedAt: null,
        eventType: "patrol",
        patrolLeaderUserId: input.actor.id,
        patrolStatus: "running",
      },
      orderBy: {
        startsAt: "desc",
      },
      take: 3,
    });

    if (patrols.length > 1) {
      throw new Error(
        `You have multiple running patrols. Use /patrol end patrol:<id or callsign>. Options: ${patrols
          .map((patrol) => patrol.patrolCallsign ?? patrol.title)
          .join(", ")}`,
      );
    }

    return patrols[0] ?? null;
  }

  if (!query) {
    throw new Error("A patrol ID, callsign, or title is required.");
  }

  return prisma.event.findFirst({
    where: {
      deletedAt: null,
      eventType: "patrol",
      OR: [
        { id: query },
        { patrolCallsign: query },
        {
          title: {
            contains: query,
          },
        },
      ],
    },
    orderBy: {
      startsAt: "desc",
    },
  });
}

async function getPatrolDetails(patrolId: string) {
  return prisma.event.findUnique({
    where: {
      id: patrolId,
    },
    include: {
      aars: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          submittedAt: "desc",
        },
        take: 1,
      },
      campaign: true,
      patrolLeader: true,
      patrolParticipants: {
        include: {
          memberProfile: true,
        },
      },
      patrolRsvps: true,
    },
  });
}

function getAarStatusLabel(input: {
  aars?: Array<{ status: string }> | null;
  patrolStatus?: string | null;
}) {
  const aarStatus = input.aars?.[0]?.status;

  if (aarStatus === "reviewed") {
    return "Reviewed";
  }

  if (aarStatus === "submitted") {
    return "Awaiting Review";
  }

  if (aarStatus === "pending-map") {
    return "Awaiting Screenshot";
  }

  if (input.patrolStatus === "awaiting-aar") {
    return "AAR Required";
  }

  return "Not Submitted";
}

function getPatrolPortalUrl(patrolId: string) {
  return `${getPortalBaseUrl()}/operations/patrols?inspect=${patrolId}`;
}

async function executePatrolListCommand(actor: PortalUser) {
  if (!can(actor, "patrols.view") && !can(actor, "events.view")) {
    throw new Error("You do not have permission to view patrols.");
  }

  const patrols = await prisma.event.findMany({
    where: {
      deletedAt: null,
      eventType: "patrol",
      patrolStatus: {
        in: ["running", "awaiting-aar"],
      },
    },
    include: {
      campaign: true,
      patrolLeader: true,
      patrolParticipants: true,
      patrolRsvps: true,
    },
    orderBy: {
      startsAt: "desc",
    },
    take: 8,
  });

  if (patrols.length === 0) {
    return {
      content: "No active patrols or patrols awaiting AAR right now.",
      ephemeral: true,
    } satisfies DiscordCommandResponse;
  }

  return {
    content: [
      "Current Patrols",
      ...patrols.map((patrol) =>
        [
          `- ${patrol.patrolCallsign ?? patrol.id}: ${patrol.title}`,
          `Leader ${patrol.patrolLeader?.displayName ?? patrol.patrolLeader?.name ?? "TBD"}`,
          patrol.campaign?.title ?? "No deployment",
          patrol.deploymentWeek ? `Week ${patrol.deploymentWeek}` : "Current week",
          `${patrol.patrolStatus ?? "planning"}`,
          `${patrol.patrolRsvps.length} interested`,
          `${patrol.patrolParticipants.length} participants`,
          `AAR ${patrol.patrolStatus === "awaiting-aar" ? "required" : "not due"}`,
        ].join(" - "),
      ),
    ].join("\n"),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executePatrolInfoCommand(
  actor: PortalUser,
  subcommand: DiscordCommandOption | null,
) {
  if (!can(actor, "patrols.view") && !can(actor, "events.view")) {
    throw new Error("You do not have permission to view patrols.");
  }

  const patrol = await resolvePatrolForCommand({
    actor,
    query: getSubcommandOptionValue(subcommand, "patrol"),
  });

  if (!patrol) {
    throw new Error("Patrol not found.");
  }

  const details = await getPatrolDetails(patrol.id);

  if (!details) {
    throw new Error("Patrol not found.");
  }

  return {
    content: [
      `Patrol: ${details.title}`,
      `Callsign: ${details.patrolCallsign ?? "Not assigned"}`,
      `Leader: ${details.patrolLeader?.displayName ?? details.patrolLeader?.name ?? "TBD"}`,
      `Deployment: ${details.campaign?.title ?? "No deployment"}`,
      `Week: ${details.deploymentWeek ?? "current"}`,
      `Type: ${details.patrolType ?? "other"}`,
      `Started: ${details.startsAt.toLocaleString("en-US")}`,
      `Estimated: ${formatPatrolDuration(details.estimatedDurationMinutes)}`,
      `Status: ${details.patrolStatus ?? details.status}`,
      `Interested: ${details.patrolRsvps.length}`,
      `Confirmed Participants: ${details.patrolParticipants.length ? details.patrolParticipants.map((participant) => participant.memberProfile.displayName).slice(0, 8).join(", ") : "None yet"}`,
      `AAR: ${getAarStatusLabel(details)}`,
    ].join("\n"),
    actions: [
      {
        label: "View Portal",
        style: "link",
        url: getPatrolPortalUrl(details.id),
      },
      {
        customId: `patrol-end:${details.id}`,
        label: "End Patrol",
        style: "danger",
      },
      {
        customId: `patrol-aar:${details.id}`,
        label: "Submit AAR",
        style: "primary",
      },
    ],
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executePatrolEndCommand(
  actor: PortalUser,
  subcommand: DiscordCommandOption | null,
) {
  const patrol = await resolvePatrolForCommand({
    actor,
    query: getSubcommandOptionValue(subcommand, "patrol"),
    requireLeaderActiveFallback: true,
  });

  if (!patrol) {
    throw new Error("No running patrol found for you. Provide a patrol ID/callsign if staff is completing another patrol.");
  }

  const updated = await completePatrolAsActor(
    {
      patrolId: patrol.id,
      reason: "Patrol completed from Discord /patrol end.",
      source: "discord",
    },
    actor,
  );

  return {
    actions: [
      {
        customId: `patrol-aar:${updated.id}`,
        label: "Submit AAR",
        style: "primary",
      },
      {
        label: "View Patrol",
        style: "link",
        url: getPatrolPortalUrl(updated.id),
      },
    ],
    content: `Patrol completed: ${updated.title}.\nPlease submit your AAR and upload the required map screenshot.`,
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function resolvePendingAarForScreenshot(input: {
  actor: PortalUser;
  discordUserId: string;
  patrolQuery: string;
}) {
  const patrol = input.patrolQuery
    ? await resolvePatrolForCommand({
        actor: input.actor,
        query: input.patrolQuery,
      })
    : null;

  if (input.patrolQuery && !patrol) {
    throw new Error("Patrol not found for screenshot upload.");
  }

  const pending = await prisma.pendingDiscordAarSubmission.findFirst({
    where: {
      discordUserId: input.discordUserId,
      status: "awaiting-screenshot",
      ...(patrol
        ? {
            eventId: patrol.id,
          }
        : {}),
      OR: [
        {
          expiresAt: null,
        },
        {
          expiresAt: {
            gt: new Date(),
          },
        },
      ],
    },
    include: {
      aar: true,
      event: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (pending?.aarId) {
    return {
      ...pending,
      interactionSessionId: null,
    };
  }

  const activeSession = await findActiveSessionForUser({
    discordUserId: input.discordUserId,
    workflowType: "AAR_SCREENSHOT_UPLOAD",
  });

  if (activeSession?.relatedEntityId) {
    const sessionAar = await prisma.aar.findUnique({
      where: {
        id: activeSession.relatedEntityId,
      },
      include: {
        event: true,
      },
    });

    if (sessionAar?.event) {
      return {
        aar: sessionAar,
        aarId: sessionAar.id,
        event: sessionAar.event,
        eventId: sessionAar.event.id,
        id: null,
        interactionSessionId: activeSession.id,
      };
    }
  }

  throw new Error(
    "No pending Patrol AAR screenshot is waiting for you. Submit /patrol aar first, then use /patrol screenshot.",
  );
}

async function executePatrolScreenshotCommand(input: {
  actor: PortalUser;
  discordUserId: string;
  resolvedAttachments?: Record<string, DiscordResolvedAttachment>;
  subcommand: DiscordCommandOption | null;
}) {
  const attachment = getSubcommandAttachment(
    {
      resolvedAttachments: input.resolvedAttachments,
      subcommand: input.subcommand,
    },
    "image",
  );

  if (!attachment) {
    throw new Error("Attach a PNG, JPG, JPEG, or WEBP map screenshot.");
  }

  const pending = await resolvePendingAarForScreenshot({
    actor: input.actor,
    discordUserId: input.discordUserId,
    patrolQuery: getSubcommandOptionValue(input.subcommand, "patrol"),
  });
  const aarId = pending.aarId;

  if (!aarId) {
    throw new Error("Pending Patrol AAR is missing its portal AAR record.");
  }

  const file = await downloadDiscordAttachment(attachment);
  const result = await attachAarMapScreenshotAsActor(
    {
      aarId,
      file,
      reason: `Patrol AAR map screenshot uploaded from Discord by ${input.discordUserId}.`,
      source: "discord",
    },
    input.actor,
  );

  if (pending.interactionSessionId) {
    await completeInteractionSession({
      id: pending.interactionSessionId,
      relatedEntityId: result.attachment.id,
      relatedEntityType: "AarAttachment",
      temporaryPayload: {
        aarId: result.aar.id,
        attachmentId: result.attachment.id,
        eventId: result.event.id,
        fileName: result.attachment.fileName,
      },
    }).catch(() => null);
  }

  return {
    actions: [
      {
        label: "View Patrol",
        style: "link",
        url: getPatrolPortalUrl(result.event.id),
      },
    ],
    content: [
      `Map screenshot uploaded for ${result.event.title}.`,
      "Patrol AAR is now awaiting S3 review.",
    ].join("\n"),
    ephemeral: true,
  } satisfies DiscordCommandResponse;
}

async function executePatrolCommand(
  actor: PortalUser,
  options: DiscordCommandOption[] | undefined,
  context: {
    discordUserId: string;
    resolvedAttachments?: Record<string, DiscordResolvedAttachment>;
  },
) {
  const subcommand = getSubcommand(options);

  switch (subcommand?.name) {
    case "list":
      return executePatrolListCommand(actor);
    case "info":
      return executePatrolInfoCommand(actor, subcommand);
    case "end":
      return executePatrolEndCommand(actor, subcommand);
    case "screenshot":
      return executePatrolScreenshotCommand({
        actor,
        discordUserId: context.discordUserId,
        resolvedAttachments: context.resolvedAttachments,
        subcommand,
      });
    case "create":
    case "aar":
      return {
        content: `/${subcommand.name} is opened as a Discord modal by the interaction handler. Try again if the modal did not appear.`,
        ephemeral: true,
      } satisfies DiscordCommandResponse;
    default:
      return {
        content: "Use /patrol create, /patrol list, /patrol info, /patrol end, /patrol aar, or /patrol screenshot.",
        ephemeral: true,
      } satisfies DiscordCommandResponse;
  }
}

export async function executeDiscordSlashCommand(
  input: DiscordCommandExecutionContext,
): Promise<DiscordCommandResponse> {
  const actorResult = await requireLinkedPortalUser(input.discordUserId);
  const actor = actorResult.user;

  if (input.commandName === "help") {
    return executeHelpCommand({
      actor,
    });
  }

  if (!actor) {
    return {
      content: actorResult.error ?? buildLinkedAccountMessage(),
      ephemeral: true,
    };
  }

  try {
    switch (input.commandName) {
      case "profile":
        return executeProfileCommand(actor, input.options);
      case "quals":
        return executeQualificationsCommand(actor, input.options);
      case "events":
        return executeEventsCommand(actor, input.options);
      case "rsvp":
        return executeRsvpCommand(actor, input.options);
      case "myunit":
        return executeMyUnitCommand(actor);
      case "patrol":
        return executePatrolCommand(actor, input.options, {
          discordUserId: input.discordUserId,
          resolvedAttachments: input.resolvedAttachments,
        });
      case "attendance":
        return executeAttendanceCommand(actor, input.options);
      case "announce":
        return executeAnnounceCommand(actor);
      case "member":
        return executeMemberCommand(actor, input.options);
      case "syncroles":
        return executeSyncRolesCommand(actor, input.options);
      case "kick":
        return executeKickCommand(actor, input.options);
      default:
        return {
          content: `/${input.commandName} is not implemented in the portal command handler yet.`,
          ephemeral: true,
        };
    }
  } catch (error) {
    return {
      content:
        error instanceof Error
          ? error.message
          : "The Discord command could not be completed right now.",
      ephemeral: true,
    };
  }
}
