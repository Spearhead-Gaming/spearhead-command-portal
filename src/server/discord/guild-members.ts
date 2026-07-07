import { revalidatePath } from "next/cache";

import {
  getDiscordIntegrationConfig,
  shouldSyncDiscordBotAccounts,
} from "@/server/discord/config";
import { prisma } from "@/server/database/client";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import { resolveDiscordCanonicalUser } from "@/server/discord/identity";

type DiscordGuildMemberInput = {
  avatarUrl?: string | null;
  discordServerId?: string | null;
  discordUserId: string;
  displayName?: string | null;
  globalName?: string | null;
  guildId?: string | null;
  isBot?: boolean | null;
  joinedAt?: Date | string | null;
  username?: string | null;
};

type DiscordApiGuildMember = {
  avatar?: string | null;
  joined_at?: string | null;
  nick?: string | null;
  user?: {
    avatar?: string | null;
    bot?: boolean;
    global_name?: string | null;
    id?: string;
    username?: string | null;
  };
};

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getSkippedBotMetadata(members: DiscordGuildMemberInput[]) {
  return members.slice(0, 10).map((member) => ({
    discordUserId: member.discordUserId,
    displayName: getDiscordDisplayName(member),
    username: normalizeOptionalString(member.username),
  }));
}

async function recordSkippedBotSyncLog(input: {
  actorUserId?: string | null;
  member: DiscordGuildMemberInput;
  server: NonNullable<Awaited<ReturnType<typeof resolveDiscordServer>>>;
  syncType: string;
}) {
  return prisma.discordSyncLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      completedAt: new Date(),
      discordServerId: input.server.id,
      metadata: {
        skippedBots: getSkippedBotMetadata([input.member]),
        syncDiscordBots: false,
      },
      scannedCount: 1,
      skippedBotCount: 1,
      status: "completed",
      syncType: input.syncType,
    },
  });
}

function getDiscordDisplayName(input: DiscordGuildMemberInput) {
  return (
    normalizeOptionalString(input.displayName) ??
    normalizeOptionalString(input.globalName) ??
    normalizeOptionalString(input.username) ??
    `Discord ${input.discordUserId}`
  );
}

function getDiscordAvatarUrl(input: {
  avatarHash?: string | null;
  avatarUrl?: string | null;
  discordUserId: string;
}) {
  if (input.avatarUrl) {
    return input.avatarUrl;
  }

  if (!input.avatarHash) {
    return null;
  }

  const extension = input.avatarHash.startsWith("a_") ? "gif" : "png";

  return `https://cdn.discordapp.com/avatars/${input.discordUserId}/${input.avatarHash}.${extension}`;
}

async function resolveDiscordServer(input: {
  discordServerId?: string | null;
  guildId?: string | null;
}) {
  if (input.discordServerId) {
    return prisma.discordServer.findUnique({
      where: {
        id: input.discordServerId,
      },
    });
  }

  if (input.guildId) {
    return prisma.discordServer.findUnique({
      where: {
        guildId: input.guildId,
      },
    });
  }

  return prisma.discordServer.findFirst({
    where: {
      isActive: true,
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

async function getDefaultProfileStatusId() {
  const configuredKey = normalizeOptionalString(
    process.env.DISCORD_MEMBER_SYNC_DEFAULT_STATUS_KEY,
  );
  const keys = configuredKey ? [configuredKey, "recruit", "applicant"] : ["recruit", "applicant"];

  for (const key of keys) {
    const status = await prisma.profileStatus.findUnique({
      where: {
        key,
      },
      select: {
        id: true,
      },
    });

    if (status) {
      return status.id;
    }
  }

  const fallback = await prisma.profileStatus.findFirst({
    orderBy: {
      sortOrder: "asc",
    },
    select: {
      id: true,
    },
  });

  if (!fallback) {
    throw new Error("A profile status is required before Discord member sync can import profiles.");
  }

  return fallback.id;
}

function revalidateDiscordMemberSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/administration/discord");
  revalidatePath("/personnel/members");
}

async function upsertDiscordMemberIdentity(input: {
  actorUserId?: string | null;
  member: DiscordGuildMemberInput;
  server: NonNullable<Awaited<ReturnType<typeof resolveDiscordServer>>>;
  source: "join" | "update" | "manual_sync";
}) {
  const displayName = getDiscordDisplayName(input.member);
  const username = normalizeOptionalString(input.member.username);
  const avatarUrl = normalizeOptionalString(input.member.avatarUrl);
  const joinedAt = normalizeDate(input.member.joinedAt);
  const now = new Date();
  const isBot = Boolean(input.member.isBot);

  const result = await prisma.$transaction(async (transaction) => {
    const existingUser = !isBot
      ? await resolveDiscordCanonicalUser({
          client: transaction,
          discordUserId: input.member.discordUserId,
        })
      : null;
    const user = isBot
      ? null
      : existingUser
        ? await transaction.user.update({
            where: {
              id: existingUser.id,
            },
            data: {
              avatarUrl,
              discordId: input.member.discordUserId,
              displayName,
              image: avatarUrl,
              name: username ?? displayName,
            },
            include: {
              memberProfile: true,
            },
          })
        : await transaction.user.create({
            data: {
              avatarUrl,
              discordId: input.member.discordUserId,
              displayName,
              image: avatarUrl,
              name: username ?? displayName,
            },
            include: {
              memberProfile: true,
            },
          });
    const memberProfile = !user
      ? null
      : user.memberProfile
        ? await transaction.memberProfile.update({
            where: {
              id: user.memberProfile.id,
            },
            data: {
              displayName,
            },
          })
        : await transaction.memberProfile.create({
            data: {
              displayName,
              joinDate: joinedAt ?? now,
              statusId: await getDefaultProfileStatusId(),
              userId: user.id,
            },
          });

    const link =
      user && !isBot
        ? await transaction.discordMemberLink.upsert({
            where: {
              discordUserId: input.member.discordUserId,
            },
            create: {
              avatarUrl,
              discordUserId: input.member.discordUserId,
              displayName,
              memberProfileId: memberProfile?.id ?? null,
              primaryGuildId: input.server.guildId,
              username,
              userId: user.id,
            },
            update: {
              avatarUrl,
              displayName,
              lastSeenAt: now,
              memberProfileId: memberProfile?.id ?? null,
              primaryGuildId: input.server.guildId,
              username,
              userId: user.id,
            },
          })
        : null;

    const state = await transaction.discordGuildMemberState.upsert({
      where: {
        discordServerId_discordUserId: {
          discordServerId: input.server.id,
          discordUserId: input.member.discordUserId,
        },
      },
      create: {
        avatarUrl,
        discordServerId: input.server.id,
        discordUserId: input.member.discordUserId,
        displayName,
        guildId: input.server.guildId,
        isBot,
        joinedAt,
        memberProfileId: memberProfile?.id ?? null,
        syncStatus: "present",
        username,
        userId: user?.id ?? null,
      },
      update: {
        avatarUrl,
        displayName,
        isBot,
        joinedAt,
        lastSyncedAt: now,
        leftAt: null,
        memberProfileId: memberProfile?.id ?? null,
        syncStatus: "present",
        username,
        userId: user?.id ?? null,
      },
    });

    return {
      isImported: Boolean(user && !existingUser),
      isProfileCreated: Boolean(user && !existingUser?.memberProfile && memberProfile),
      link,
      memberProfile,
      state,
      user,
    };
  });

  await recordAuditEvent({
    action: result.isImported
      ? "discord.member.auto_imported"
      : "discord.member.profile_updated",
    actorUserId: input.actorUserId ?? null,
    entityId: result.memberProfile?.id ?? result.state.id,
    entityType: result.memberProfile ? "MemberProfile" : "DiscordGuildMemberState",
    metadata: {
      discordUserId: input.member.discordUserId,
      guildId: input.server.guildId,
      source: input.source,
    },
    summary: result.isImported
      ? `${displayName} was imported from ${input.server.name}.`
      : `${displayName} Discord identity was synced from ${input.server.name}.`,
  });

  return result;
}

export async function recordDiscordGuildMemberJoin(input: {
  actorUserId?: string | null;
  member: DiscordGuildMemberInput;
}) {
  const server = await resolveDiscordServer({
    discordServerId: input.member.discordServerId,
    guildId: input.member.guildId,
  });

  if (!server) {
    throw new Error("No active Discord server mapping was found for the guild member event.");
  }

  if (input.member.isBot && !shouldSyncDiscordBotAccounts()) {
    const syncLog = await recordSkippedBotSyncLog({
      actorUserId: input.actorUserId ?? null,
      member: input.member,
      server,
      syncType: "guild_member_join",
    });

    await recordAuditEvent({
      action: "discord.member.bot_skipped",
      actorUserId: input.actorUserId ?? null,
      entityId: syncLog.id,
      entityType: "DiscordSyncLog",
      metadata: {
        discordUserId: input.member.discordUserId,
        guildId: server.guildId,
        syncLogId: syncLog.id,
      },
      summary: `${getDiscordDisplayName(input.member)} is a Discord bot and was skipped by member sync policy.`,
    });

    return null;
  }

  const result = await upsertDiscordMemberIdentity({
    actorUserId: input.actorUserId ?? null,
    member: input.member,
    server,
    source: "join",
  });

  revalidateDiscordMemberSurfaces();

  return result;
}

export async function recordDiscordGuildMemberUpdate(input: {
  actorUserId?: string | null;
  member: DiscordGuildMemberInput;
}) {
  const server = await resolveDiscordServer({
    discordServerId: input.member.discordServerId,
    guildId: input.member.guildId,
  });

  if (!server) {
    throw new Error("No active Discord server mapping was found for the guild member update.");
  }

  if (input.member.isBot && !shouldSyncDiscordBotAccounts()) {
    const syncLog = await recordSkippedBotSyncLog({
      actorUserId: input.actorUserId ?? null,
      member: input.member,
      server,
      syncType: "guild_member_update",
    });

    await recordAuditEvent({
      action: "discord.member.bot_skipped",
      actorUserId: input.actorUserId ?? null,
      entityId: syncLog.id,
      entityType: "DiscordSyncLog",
      metadata: {
        discordUserId: input.member.discordUserId,
        guildId: server.guildId,
        syncLogId: syncLog.id,
      },
      summary: `${getDiscordDisplayName(input.member)} is a Discord bot and was skipped by member sync policy.`,
    });

    return null;
  }

  const result = await upsertDiscordMemberIdentity({
    actorUserId: input.actorUserId ?? null,
    member: input.member,
    server,
    source: "update",
  });

  revalidateDiscordMemberSurfaces();

  return result;
}

export async function recordDiscordGuildMemberLeave(input: {
  actorUserId?: string | null;
  discordServerId?: string | null;
  discordUserId: string;
  guildId?: string | null;
}) {
  const server = await resolveDiscordServer({
    discordServerId: input.discordServerId,
    guildId: input.guildId,
  });

  if (!server) {
    throw new Error("No active Discord server mapping was found for the guild member leave event.");
  }

  const state = await prisma.discordGuildMemberState.upsert({
    where: {
      discordServerId_discordUserId: {
        discordServerId: server.id,
        discordUserId: input.discordUserId,
      },
    },
    create: {
      discordServerId: server.id,
      discordUserId: input.discordUserId,
      guildId: server.guildId,
      leftAt: new Date(),
      syncStatus: "left",
    },
    update: {
      leftAt: new Date(),
      lastSyncedAt: new Date(),
      syncStatus: "left",
    },
  });

  await recordAuditEvent({
    action: "discord.member.left_detected",
    actorUserId: input.actorUserId ?? null,
    entityId: state.memberProfileId ?? state.id,
    entityType: state.memberProfileId ? "MemberProfile" : "DiscordGuildMemberState",
    metadata: {
      discordUserId: input.discordUserId,
      guildId: server.guildId,
    },
    summary: `${state.displayName ?? input.discordUserId} left ${server.name}; portal profile was preserved.`,
  });

  revalidateDiscordMemberSurfaces();

  return state;
}

function mapDiscordApiMember(server: { guildId: string }, member: DiscordApiGuildMember) {
  const discordUserId = normalizeOptionalString(member.user?.id);

  if (!discordUserId) {
    return null;
  }

  return {
    avatarUrl: getDiscordAvatarUrl({
      avatarHash: member.avatar ?? member.user?.avatar ?? null,
      discordUserId,
    }),
    discordUserId,
    displayName: member.nick ?? member.user?.global_name ?? member.user?.username ?? null,
    globalName: member.user?.global_name ?? null,
    guildId: server.guildId,
    isBot: Boolean(member.user?.bot),
    joinedAt: member.joined_at ?? null,
    username: member.user?.username ?? null,
  } satisfies DiscordGuildMemberInput;
}

async function fetchDiscordGuildMembers(server: { guildId: string }) {
  const config = getDiscordIntegrationConfig();

  if (!config.botToken) {
    throw new Error("DISCORD_BOT_TOKEN is required before member sync can contact Discord.");
  }

  const members: DiscordGuildMemberInput[] = [];
  let after = "0";

  for (let page = 0; page < 10; page += 1) {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${server.guildId}/members?limit=1000&after=${after}`,
      {
        headers: {
          Authorization: `Bot ${config.botToken}`,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();

      if (response.status === 403) {
        throw new Error("The Discord bot lacks permission or Guild Members intent for member sync.");
      }

      if (response.status === 404) {
        throw new Error("The mapped Discord guild could not be found.");
      }

      throw new Error(body || `Discord member sync failed with status ${response.status}.`);
    }

    const pageMembers = (await response.json()) as DiscordApiGuildMember[];
    const mappedMembers: DiscordGuildMemberInput[] = [];

    for (const member of pageMembers) {
      const mappedMember = mapDiscordApiMember(server, member);

      if (mappedMember) {
        mappedMembers.push(mappedMember);
      }
    }

    members.push(...mappedMembers);

    if (mappedMembers.length < 1000) {
      break;
    }

    after = mappedMembers[mappedMembers.length - 1]?.discordUserId ?? after;
  }

  return members;
}

export async function runDiscordGuildMemberSync(input: {
  actorUserId?: string | null;
  discordServerId: string;
}) {
  const server = await prisma.discordServer.findUnique({
    where: {
      id: normalizeRequiredString(input.discordServerId, "Discord server"),
    },
  });

  if (!server || !server.isActive) {
    throw new Error("Select an active Discord server mapping before running member sync.");
  }

  const syncLog = await prisma.discordSyncLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      discordServerId: server.id,
      status: "running",
      syncType: "guild_member_sync",
    },
  });

  await recordAuditEvent({
    action: "discord.member_sync.started",
    actorUserId: input.actorUserId ?? null,
    entityId: syncLog.id,
    entityType: "DiscordSyncLog",
    summary: `Discord member sync started for ${server.name}.`,
  });

  try {
    const fetchedMembers = await fetchDiscordGuildMembers(server);
    const skippedBots = shouldSyncDiscordBotAccounts()
      ? []
      : fetchedMembers.filter((member) => Boolean(member.isBot));
    const members = shouldSyncDiscordBotAccounts()
      ? fetchedMembers
      : fetchedMembers.filter((member) => !member.isBot);
    let importedCount = 0;
    let updatedCount = 0;

    for (const member of members) {
      const result = await upsertDiscordMemberIdentity({
        actorUserId: input.actorUserId ?? null,
        member: {
          ...member,
          discordServerId: server.id,
        },
        server,
        source: "manual_sync",
      });

      if (result.isImported || result.isProfileCreated) {
        importedCount += 1;
      } else {
        updatedCount += 1;
      }
    }

    const presentDiscordUserIds = new Set(members.map((member) => member.discordUserId));
    const existingPresentStates = await prisma.discordGuildMemberState.findMany({
      where: {
        discordServerId: server.id,
        syncStatus: "present",
        ...(shouldSyncDiscordBotAccounts()
          ? {}
          : {
              isBot: false,
            }),
      },
    });
    const leftStates = existingPresentStates.filter(
      (state) => !presentDiscordUserIds.has(state.discordUserId),
    );

    for (const state of leftStates) {
      await recordDiscordGuildMemberLeave({
        actorUserId: input.actorUserId ?? null,
        discordServerId: server.id,
        discordUserId: state.discordUserId,
      });
    }

    const completedLog = await prisma.discordSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        completedAt: new Date(),
        importedCount,
        leftCount: leftStates.length,
        metadata: {
          skippedBots: getSkippedBotMetadata(skippedBots),
          syncDiscordBots: shouldSyncDiscordBotAccounts(),
        },
        scannedCount: fetchedMembers.length,
        skippedBotCount: skippedBots.length,
        status: "completed",
        updatedCount,
      },
    });

    await recordAuditEvent({
      action: "discord.member_sync.completed",
      actorUserId: input.actorUserId ?? null,
      entityId: completedLog.id,
      entityType: "DiscordSyncLog",
      metadata: {
        importedCount,
        leftCount: leftStates.length,
        scannedCount: fetchedMembers.length,
        skippedBotCount: skippedBots.length,
        updatedCount,
      },
      summary: `Discord member sync completed for ${server.name}.`,
    });

    revalidateDiscordMemberSurfaces();

    return completedLog;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord member sync failed.";
    const failedLog = await prisma.discordSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        completedAt: new Date(),
        errorMessage: message,
        status: "failed",
      },
    });

    await recordAuditEvent({
      action: "discord.member_sync.failed",
      actorUserId: input.actorUserId ?? null,
      entityId: failedLog.id,
      entityType: "DiscordSyncLog",
      reason: message,
      summary: `Discord member sync failed for ${server.name}.`,
    });

    revalidateDiscordMemberSurfaces();

    throw error;
  }
}

function getDiscordModerationErrorMessage(status: number, bodyText: string) {
  if (status === 403) {
    return "The Discord bot cannot moderate that member. Check bot permissions and role hierarchy.";
  }

  if (status === 404) {
    return "The target member is not present in the selected Discord server.";
  }

  if (status === 401) {
    return "The Discord bot token is invalid or missing required authorization.";
  }

  return bodyText || `Discord moderation request failed with status ${status}.`;
}

export async function kickDiscordGuildMember(input: {
  actorUserId: string;
  discordServerId: string;
  reason: string;
  targetDiscordUserId: string;
}) {
  const reason = normalizeRequiredString(input.reason, "Reason");
  const targetDiscordUserId = normalizeRequiredString(input.targetDiscordUserId, "Target Discord user");
  const server = await prisma.discordServer.findUnique({
    where: {
      id: normalizeRequiredString(input.discordServerId, "Discord server"),
    },
  });

  if (!server || !server.isActive) {
    throw new Error("Select an active Discord server before moderating a member.");
  }

  const config = getDiscordIntegrationConfig();

  if (!config.botToken) {
    throw new Error("DISCORD_BOT_TOKEN is required before moderation actions can contact Discord.");
  }

  const state = await prisma.discordGuildMemberState.findUnique({
    where: {
      discordServerId_discordUserId: {
        discordServerId: server.id,
        discordUserId: targetDiscordUserId,
      },
    },
  });
  const moderationAction = await prisma.discordModerationAction.create({
    data: {
      action: "kick",
      discordServerId: server.id,
      moderatorUserId: input.actorUserId,
      reason,
      result: "requested",
      targetDiscordUserId,
      targetMemberProfileId: state?.memberProfileId ?? null,
      targetUserId: state?.userId ?? null,
    },
  });

  await recordAuditEvent({
    action: "discord.moderation.kick_requested",
    actorUserId: input.actorUserId,
    entityId: moderationAction.id,
    entityType: "DiscordModerationAction",
    metadata: {
      discordServerId: server.id,
      targetDiscordUserId,
    },
    reason,
    summary: `Discord kick requested for ${state?.displayName ?? targetDiscordUserId} from ${server.name}.`,
  });

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${server.guildId}/members/${targetDiscordUserId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bot ${config.botToken}`,
          "X-Audit-Log-Reason": encodeURIComponent(reason),
        },
      },
    );

    if (!response.ok) {
      const bodyText = await response.text();

      throw new Error(getDiscordModerationErrorMessage(response.status, bodyText));
    }

    const updatedAction = await prisma.discordModerationAction.update({
      where: {
        id: moderationAction.id,
      },
      data: {
        result: "succeeded",
      },
    });

    await prisma.discordGuildMemberState.updateMany({
      data: {
        leftAt: new Date(),
        lastSyncedAt: new Date(),
        syncStatus: "left",
      },
      where: {
        discordServerId: server.id,
        discordUserId: targetDiscordUserId,
      },
    });

    await recordAuditEvent({
      action: "discord.moderation.kick_succeeded",
      actorUserId: input.actorUserId,
      entityId: updatedAction.id,
      entityType: "DiscordModerationAction",
      metadata: {
        discordServerId: server.id,
        targetDiscordUserId,
      },
      reason,
      summary: `Discord kick succeeded for ${state?.displayName ?? targetDiscordUserId} from ${server.name}.`,
    });

    revalidateDiscordMemberSurfaces();

    return updatedAction;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discord kick failed.";
    const updatedAction = await prisma.discordModerationAction.update({
      where: {
        id: moderationAction.id,
      },
      data: {
        errorMessage: message,
        result: "failed",
      },
    });

    await recordAuditEvent({
      action: "discord.moderation.kick_failed",
      actorUserId: input.actorUserId,
      entityId: updatedAction.id,
      entityType: "DiscordModerationAction",
      metadata: {
        discordServerId: server.id,
        targetDiscordUserId,
      },
      reason,
      summary: `Discord kick failed for ${state?.displayName ?? targetDiscordUserId} from ${server.name}.`,
    });

    revalidateDiscordMemberSurfaces();

    throw error;
  }
}

export async function listDiscordGuildMemberStates() {
  return prisma.discordGuildMemberState.findMany({
    where: shouldSyncDiscordBotAccounts()
      ? undefined
      : {
          isBot: false,
        },
    include: {
      discordServer: true,
      memberProfile: true,
      user: true,
    },
    orderBy: [
      {
        lastSyncedAt: "desc",
      },
      {
        displayName: "asc",
      },
    ],
    take: 25,
  });
}

export async function listDiscordSyncLogs() {
  return prisma.discordSyncLog.findMany({
    include: {
      actor: true,
      discordServer: true,
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 8,
  });
}

export async function listDiscordModerationActions() {
  return prisma.discordModerationAction.findMany({
    include: {
      discordServer: true,
      moderator: true,
      targetMemberProfile: true,
      targetUser: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });
}
