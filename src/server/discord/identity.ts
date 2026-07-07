import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/database/client";
import { can } from "@/server/permissions/access";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import { getPreferredMemberDisplayName } from "@/server/personnel";
import type { PortalUser } from "@/features/auth/types";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const identityUserInclude = {
  accounts: {
    where: {
      provider: "discord",
    },
    select: {
      id: true,
      providerAccountId: true,
    },
  },
  memberProfile: true,
} satisfies Prisma.UserInclude;

type IdentityUser = Prisma.UserGetPayload<{
  include: typeof identityUserInclude;
}>;

type DiscordIdentityPayload = {
  avatarUrl?: string | null;
  discordUserId: string;
  displayName?: string | null;
  email?: string | null;
  guildId?: string | null;
  username?: string | null;
};

type DiscordIdentityCandidate = {
  source: string;
  user: IdentityUser | null;
};

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function uniqueById(users: DiscordIdentityCandidate[]) {
  const seen = new Set<string>();

  return users.filter((candidate) => {
    if (!candidate.user || seen.has(candidate.user.id)) {
      return false;
    }

    seen.add(candidate.user.id);

    return true;
  });
}

function getIdentityDisplayName(input: DiscordIdentityPayload) {
  return getPreferredMemberDisplayName({
    discordDisplayName: input.displayName,
    discordUsername: input.username,
    email: input.email,
  });
}

async function getDefaultProfileStatusId(client: PrismaExecutor) {
  const configuredKey = normalizeOptionalString(
    process.env.DISCORD_MEMBER_SYNC_DEFAULT_STATUS_KEY,
  );
  const keys = configuredKey ? [configuredKey, "recruit", "applicant"] : ["recruit", "applicant"];

  for (const key of keys) {
    const status = await client.profileStatus.findUnique({
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

  const fallback = await client.profileStatus.findFirst({
    orderBy: {
      sortOrder: "asc",
    },
    select: {
      id: true,
    },
  });

  if (!fallback) {
    throw new Error("A profile status is required before Discord identities can create profiles.");
  }

  return fallback.id;
}

async function getEmailForCanonicalUser(input: {
  client: PrismaExecutor;
  canonicalUserId: string;
  currentEmail?: string | null;
  email?: string | null;
}) {
  const email = normalizeOptionalString(input.email);

  if (input.currentEmail || !email) {
    return undefined;
  }

  const existing = await input.client.user.findFirst({
    where: {
      email,
      id: {
        not: input.canonicalUserId,
      },
    },
    select: {
      id: true,
    },
  });

  return existing ? undefined : email;
}

async function getDiscordIdentityCandidates(input: {
  client: PrismaExecutor;
  discordUserId: string;
  transientUserId?: string | null;
}) {
  const [account, userByDiscordId, link, states, transientUser] = await Promise.all([
    input.client.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "discord",
          providerAccountId: input.discordUserId,
        },
      },
      include: {
        user: {
          include: identityUserInclude,
        },
      },
    }),
    input.client.user.findUnique({
      where: {
        discordId: input.discordUserId,
      },
      include: identityUserInclude,
    }),
    input.client.discordMemberLink.findUnique({
      where: {
        discordUserId: input.discordUserId,
      },
      include: {
        memberProfile: {
          include: {
            user: {
              include: identityUserInclude,
            },
          },
        },
        user: {
          include: identityUserInclude,
        },
      },
    }),
    input.client.discordGuildMemberState.findMany({
      where: {
        discordUserId: input.discordUserId,
      },
      include: {
        memberProfile: {
          include: {
            user: {
              include: identityUserInclude,
            },
          },
        },
        user: {
          include: identityUserInclude,
        },
      },
      orderBy: {
        lastSyncedAt: "desc",
      },
    }),
    input.transientUserId
      ? input.client.user.findUnique({
          where: {
            id: input.transientUserId,
          },
          include: identityUserInclude,
        })
      : Promise.resolve(null),
  ]);

  const stateCandidates = states.flatMap((state) => [
    {
      source: "guild_state_user",
      user: state.user,
    },
    {
      source: "guild_state_profile_user",
      user: state.memberProfile?.user ?? null,
    },
  ]);

  return uniqueById([
    {
      source: "oauth_account",
      user: account?.user ?? null,
    },
    {
      source: "user_discord_id",
      user: userByDiscordId,
    },
    {
      source: "member_link_user",
      user: link?.user ?? null,
    },
    {
      source: "member_link_profile_user",
      user: link?.memberProfile?.user ?? null,
    },
    ...stateCandidates,
    {
      source: "auth_transient_user",
      user: transientUser,
    },
  ]);
}

function pickCanonicalUser(
  candidates: DiscordIdentityCandidate[],
  transientUserId?: string | null,
) {
  const findCandidate = (source: string, options?: { allowTransient?: boolean }) =>
    candidates.find((candidate) => {
      if (candidate.source !== source || !candidate.user) {
        return false;
      }

      return options?.allowTransient || candidate.user.id !== transientUserId;
    })?.user ?? null;

  return (
    findCandidate("oauth_account") ??
    findCandidate("user_discord_id") ??
    findCandidate("member_link_user") ??
    findCandidate("member_link_profile_user") ??
    findCandidate("guild_state_user") ??
    findCandidate("guild_state_profile_user") ??
    findCandidate("oauth_account", { allowTransient: true }) ??
    findCandidate("auth_transient_user", { allowTransient: true }) ??
    null
  );
}

async function ensureCanonicalMemberProfile(input: {
  client: PrismaExecutor;
  canonicalUser: IdentityUser;
  displayName: string;
  discordUserId: string;
}) {
  if (input.canonicalUser.memberProfile) {
    return input.client.memberProfile.update({
      where: {
        id: input.canonicalUser.memberProfile.id,
      },
      data: {
        displayName: input.displayName,
      },
    });
  }

  const linkedProfile = await input.client.memberProfile.findFirst({
    where: {
      OR: [
        {
          discordMemberLinks: {
            some: {
              discordUserId: input.discordUserId,
            },
          },
        },
        {
          discordGuildStates: {
            some: {
              discordUserId: input.discordUserId,
            },
          },
        },
      ],
      userId: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (linkedProfile) {
    return input.client.memberProfile.update({
      where: {
        id: linkedProfile.id,
      },
      data: {
        displayName: input.displayName,
        userId: input.canonicalUser.id,
      },
    });
  }

  return input.client.memberProfile.create({
    data: {
      displayName: input.displayName,
      joinDate: new Date(),
      statusId: await getDefaultProfileStatusId(input.client),
      userId: input.canonicalUser.id,
    },
  });
}

async function syncCanonicalIdentity(input: {
  client: PrismaExecutor;
  canonicalUser: IdentityUser;
  payload: DiscordIdentityPayload;
}) {
  const displayName = getIdentityDisplayName(input.payload);
  const email = await getEmailForCanonicalUser({
    canonicalUserId: input.canonicalUser.id,
    client: input.client,
    currentEmail: input.canonicalUser.email,
    email: input.payload.email,
  });

  const user = await input.client.user.update({
    where: {
      id: input.canonicalUser.id,
    },
    data: {
      avatarUrl: normalizeOptionalString(input.payload.avatarUrl) ?? undefined,
      discordId: input.payload.discordUserId,
      displayName,
      email,
      image: normalizeOptionalString(input.payload.avatarUrl) ?? undefined,
      isActive: true,
      name: normalizeOptionalString(input.payload.username) ?? displayName,
    },
    include: identityUserInclude,
  });
  const memberProfile = await ensureCanonicalMemberProfile({
    canonicalUser: user,
    client: input.client,
    discordUserId: input.payload.discordUserId,
    displayName,
  });

  await input.client.discordMemberLink.upsert({
    where: {
      discordUserId: input.payload.discordUserId,
    },
    create: {
      avatarUrl: normalizeOptionalString(input.payload.avatarUrl),
      discordUserId: input.payload.discordUserId,
      displayName,
      memberProfileId: memberProfile.id,
      primaryGuildId: normalizeOptionalString(input.payload.guildId),
      username: normalizeOptionalString(input.payload.username),
      userId: user.id,
    },
    update: {
      avatarUrl: normalizeOptionalString(input.payload.avatarUrl),
      displayName,
      lastSeenAt: new Date(),
      memberProfileId: memberProfile.id,
      primaryGuildId: normalizeOptionalString(input.payload.guildId) ?? undefined,
      username: normalizeOptionalString(input.payload.username),
      userId: user.id,
    },
  });

  await input.client.discordGuildMemberState.updateMany({
    where: {
      discordUserId: input.payload.discordUserId,
    },
    data: {
      avatarUrl: normalizeOptionalString(input.payload.avatarUrl),
      displayName,
      memberProfileId: memberProfile.id,
      username: normalizeOptionalString(input.payload.username),
      userId: user.id,
    },
  });

  return {
    memberProfile,
    user,
  };
}

async function archiveTransientDuplicate(input: {
  client: Prisma.TransactionClient;
  canonicalUserId: string;
  duplicateUserId?: string | null;
  discordUserId: string;
}) {
  if (!input.duplicateUserId || input.duplicateUserId === input.canonicalUserId) {
    return false;
  }

  await input.client.account.updateMany({
    where: {
      userId: input.duplicateUserId,
      NOT: {
        provider: "discord",
      },
    },
    data: {
      userId: input.canonicalUserId,
    },
  });
  await input.client.userRole.updateMany({
    where: {
      userId: input.duplicateUserId,
    },
    data: {
      userId: input.canonicalUserId,
    },
  });
  await input.client.notificationDelivery.updateMany({
    where: {
      recipientUserId: input.duplicateUserId,
    },
    data: {
      recipientUserId: input.canonicalUserId,
    },
  });
  await input.client.patrolRsvp.updateMany({
    where: {
      userId: input.duplicateUserId,
    },
    data: {
      userId: input.canonicalUserId,
    },
  });

  await input.client.user.update({
    where: {
      id: input.duplicateUserId,
    },
    data: {
      deletedAt: new Date(),
      discordId: null,
      email: null,
      isActive: false,
      name: "Merged Discord duplicate",
    },
  });

  return true;
}

export async function linkDiscordOAuthIdentity(input: DiscordIdentityPayload & {
  transientUserId?: string | null;
}) {
  const result = await prisma.$transaction(async (transaction) => {
    const candidates = await getDiscordIdentityCandidates({
      client: transaction,
      discordUserId: input.discordUserId,
      transientUserId: input.transientUserId,
    });
    const canonicalUser = pickCanonicalUser(candidates, input.transientUserId);

    if (!canonicalUser) {
      throw new Error("Discord OAuth completed but no portal user could be resolved.");
    }

    if (canonicalUser.id !== input.transientUserId) {
      await transaction.user.updateMany({
        where: {
          discordId: input.discordUserId,
          id: {
            not: canonicalUser.id,
          },
        },
        data: {
          discordId: null,
        },
      });
      await transaction.account.updateMany({
        where: {
          provider: "discord",
          providerAccountId: input.discordUserId,
        },
        data: {
          userId: canonicalUser.id,
        },
      });
    }

    const linked = await syncCanonicalIdentity({
      canonicalUser,
      client: transaction,
      payload: input,
    });

    await transaction.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "discord",
          providerAccountId: input.discordUserId,
        },
      },
      create: {
        provider: "discord",
        providerAccountId: input.discordUserId,
        type: "oauth",
        userId: linked.user.id,
      },
      update: {
        userId: linked.user.id,
      },
    });

    const archivedTransient = await archiveTransientDuplicate({
      canonicalUserId: linked.user.id,
      client: transaction,
      discordUserId: input.discordUserId,
      duplicateUserId: input.transientUserId,
    });

    return {
      archivedTransient,
      canonicalUserId: linked.user.id,
      duplicateUserIds: candidates
        .map((candidate) => candidate.user?.id)
        .filter((id): id is string => Boolean(id && id !== linked.user.id)),
      memberProfileId: linked.memberProfile.id,
      user: linked.user,
    };
  });

  await recordAuditEvent({
    action: "discord.identity.oauth_linked",
    actorUserId: result.canonicalUserId,
    entityId: result.canonicalUserId,
    entityType: "User",
    metadata: {
      archivedTransient: result.archivedTransient,
      discordUserId: input.discordUserId,
      duplicateUserIds: result.duplicateUserIds,
      memberProfileId: result.memberProfileId,
    },
    summary: result.duplicateUserIds.length
      ? "Discord OAuth was linked to an existing imported identity."
      : "Discord OAuth identity was synced to the portal user.",
  });

  return result.user;
}

export async function resolveDiscordCanonicalUser(input: {
  client?: PrismaExecutor;
  discordUserId: string;
}) {
  const client = input.client ?? prisma;
  const candidates = await getDiscordIdentityCandidates({
    client,
    discordUserId: input.discordUserId,
  });

  return pickCanonicalUser(candidates);
}

export async function syncImportedDiscordIdentity(input: DiscordIdentityPayload & {
  client?: PrismaExecutor;
}) {
  const client = input.client ?? prisma;
  const candidates = await getDiscordIdentityCandidates({
    client,
    discordUserId: input.discordUserId,
  });
  const canonicalUser = pickCanonicalUser(candidates);

  if (!canonicalUser) {
    return null;
  }

  return syncCanonicalIdentity({
    canonicalUser,
    client,
    payload: input,
  });
}

export type DiscordIdentityDiagnosticUser = {
  discordId: string | null;
  displayName: string;
  email: string | null;
  id: string;
  isActive: boolean;
  memberProfileId: string | null;
  memberProfileLabel: string | null;
  sources: string[];
};

export type DiscordIdentityDuplicateGroup = {
  discordUserId: string;
  suggestedCanonicalUserId: string | null;
  users: DiscordIdentityDiagnosticUser[];
};

export type DiscordIdentityDiagnostics = {
  duplicateDiscordIdentities: DiscordIdentityDuplicateGroup[];
  importedButNotLinked: Array<{
    discordUserId: string;
    displayName: string;
    id: string;
    lastSyncedAt: Date;
    serverName: string;
  }>;
  loggedInUsersWithoutProfile: Array<{
    discordUserId: string;
    displayName: string;
    id: string;
  }>;
  profilesWithoutDiscordIdentity: Array<{
    displayName: string;
    id: string;
    userId: string | null;
  }>;
  likelyDisplayNameDuplicates: Array<{
    displayName: string;
    profiles: Array<{
      id: string;
      userId: string | null;
    }>;
  }>;
};

function getDiagnosticUserLabel(user: {
  displayName?: string | null;
  email?: string | null;
  name?: string | null;
}) {
  return user.displayName ?? user.name ?? user.email ?? "Unknown User";
}

export async function listDiscordIdentityDiagnostics(
  user: Pick<PortalUser, "permissionGrants" | "permissions">,
): Promise<DiscordIdentityDiagnostics | null> {
  if (
    !can(user, "admin.users.view") &&
    !can(user, "discord.identity.view") &&
    !can(user, "discord.members.sync")
  ) {
    return null;
  }

  const [users, links, states, profilesWithoutDiscordIdentity, displayNameGroups] =
    await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            {
              discordId: {
                not: null,
              },
            },
            {
              accounts: {
                some: {
                  provider: "discord",
                },
              },
            },
            {
              discordMemberLinks: {
                some: {},
              },
            },
            {
              discordGuildStates: {
                some: {
                  isBot: false,
                },
              },
            },
          ],
        },
        include: {
          accounts: {
            where: {
              provider: "discord",
            },
          },
          discordGuildStates: {
            where: {
              isBot: false,
            },
          },
          discordMemberLinks: true,
          memberProfile: true,
        },
      }),
      prisma.discordMemberLink.findMany({
        include: {
          memberProfile: true,
          user: {
            include: {
              memberProfile: true,
            },
          },
        },
      }),
      prisma.discordGuildMemberState.findMany({
        where: {
          isBot: false,
        },
        include: {
          discordServer: true,
          memberProfile: true,
          user: {
            include: {
              memberProfile: true,
            },
          },
        },
      }),
      prisma.memberProfile.findMany({
        where: {
          OR: [
            {
              userId: null,
            },
            {
              user: {
                discordId: null,
                accounts: {
                  none: {
                    provider: "discord",
                  },
                },
              },
            },
          ],
          discordMemberLinks: {
            none: {},
          },
          discordGuildStates: {
            none: {},
          },
          isActive: true,
        },
        select: {
          displayName: true,
          id: true,
          userId: true,
        },
        take: 25,
      }),
      prisma.memberProfile.groupBy({
        by: ["displayName"],
        having: {
          displayName: {
            _count: {
              gt: 1,
            },
          },
        },
        orderBy: {
          displayName: "asc",
        },
        take: 10,
      }),
    ]);

  const groups = new Map<string, Map<string, DiscordIdentityDiagnosticUser>>();

  function addUserToGroup(input: {
    discordUserId: string | null | undefined;
    source: string;
    user: (typeof users)[number] | typeof links[number]["user"] | typeof states[number]["user"] | null;
  }) {
    if (!input.discordUserId || !input.user) {
      return;
    }

    const byUser = groups.get(input.discordUserId) ?? new Map<string, DiscordIdentityDiagnosticUser>();
    const existing = byUser.get(input.user.id);
    const sources = new Set(existing?.sources ?? []);
    sources.add(input.source);
    byUser.set(input.user.id, {
      discordId: input.user.discordId ?? null,
      displayName: getDiagnosticUserLabel(input.user),
      email: input.user.email ?? null,
      id: input.user.id,
      isActive: input.user.isActive,
      memberProfileId: input.user.memberProfile?.id ?? null,
      memberProfileLabel: input.user.memberProfile?.displayName ?? null,
      sources: Array.from(sources).sort(),
    });
    groups.set(input.discordUserId, byUser);
  }

  for (const item of users) {
    addUserToGroup({
      discordUserId: item.discordId,
      source: "user.discordId",
      user: item,
    });

    for (const account of item.accounts) {
      addUserToGroup({
        discordUserId: account.providerAccountId,
        source: "oauth.account",
        user: item,
      });
    }

    for (const link of item.discordMemberLinks) {
      addUserToGroup({
        discordUserId: link.discordUserId,
        source: "discord.member_link",
        user: item,
      });
    }

    for (const state of item.discordGuildStates) {
      addUserToGroup({
        discordUserId: state.discordUserId,
        source: "discord.guild_state",
        user: item,
      });
    }
  }

  for (const link of links) {
    addUserToGroup({
      discordUserId: link.discordUserId,
      source: "discord.member_link",
      user: link.user,
    });
  }

  for (const state of states) {
    addUserToGroup({
      discordUserId: state.discordUserId,
      source: "discord.guild_state",
      user: state.user,
    });
  }

  const duplicateDiscordIdentities = Array.from(groups.entries())
    .map(([discordUserId, byUser]) => {
      const usersForIdentity = Array.from(byUser.values());

      return {
        discordUserId,
        suggestedCanonicalUserId:
          usersForIdentity.find((candidate) => candidate.sources.includes("oauth.account"))?.id ??
          usersForIdentity.find((candidate) => candidate.sources.includes("user.discordId"))?.id ??
          usersForIdentity.find((candidate) => candidate.isActive)?.id ??
          usersForIdentity[0]?.id ??
          null,
        users: usersForIdentity,
      };
    })
    .filter((group) => group.users.length > 1);

  const importedButNotLinked = states
    .filter((state) => !state.userId || !state.memberProfileId)
    .map((state) => ({
      discordUserId: state.discordUserId,
      displayName:
        state.displayName ??
        state.username ??
        state.memberProfile?.displayName ??
        "Unknown Discord Member",
      id: state.id,
      lastSyncedAt: state.lastSyncedAt,
      serverName: state.discordServer.name,
    }));

  const loggedInUsersWithoutProfile = users
    .filter((item) => item.accounts.length > 0 && !item.memberProfile)
    .map((item) => ({
      discordUserId: item.accounts[0]?.providerAccountId ?? item.discordId ?? "unknown",
      displayName: getDiagnosticUserLabel(item),
      id: item.id,
    }));

  const likelyDisplayNameDuplicates = await Promise.all(
    displayNameGroups.map(async (group) => ({
      displayName: group.displayName,
      profiles: await prisma.memberProfile.findMany({
        where: {
          displayName: group.displayName,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          userId: true,
        },
      }),
    })),
  );

  return {
    duplicateDiscordIdentities,
    importedButNotLinked,
    likelyDisplayNameDuplicates,
    loggedInUsersWithoutProfile,
    profilesWithoutDiscordIdentity,
  };
}

async function transferMemberProfileRelations(input: {
  canonicalProfileId: string;
  duplicateProfileId: string;
  transaction: Prisma.TransactionClient;
}) {
  if (input.canonicalProfileId === input.duplicateProfileId) {
    return {
      conflicts: 0,
      transferred: 0,
    };
  }

  let conflicts = 0;
  let transferred = 0;

  await input.transaction.rosterAssignment.updateMany({
    where: {
      memberProfileId: input.duplicateProfileId,
    },
    data: {
      memberProfileId: input.canonicalProfileId,
    },
  });
  await input.transaction.memberQualification.updateMany({
    where: {
      memberProfileId: input.duplicateProfileId,
    },
    data: {
      memberProfileId: input.canonicalProfileId,
    },
  });
  await input.transaction.discordModerationAction.updateMany({
    where: {
      targetMemberProfileId: input.duplicateProfileId,
    },
    data: {
      targetMemberProfileId: input.canonicalProfileId,
    },
  });
  transferred += 3;

  const attendanceRecords = await input.transaction.attendanceRecord.findMany({
    where: {
      memberProfileId: input.duplicateProfileId,
    },
    select: {
      eventId: true,
      id: true,
    },
  });

  for (const record of attendanceRecords) {
    const existing = await input.transaction.attendanceRecord.findUnique({
      where: {
        eventId_memberProfileId: {
          eventId: record.eventId,
          memberProfileId: input.canonicalProfileId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      conflicts += 1;
      continue;
    }

    await input.transaction.attendanceRecord.update({
      where: {
        id: record.id,
      },
      data: {
        memberProfileId: input.canonicalProfileId,
      },
    });
    transferred += 1;
  }

  const patrolParticipants = await input.transaction.patrolParticipant.findMany({
    where: {
      memberProfileId: input.duplicateProfileId,
    },
    select: {
      eventId: true,
      id: true,
    },
  });

  for (const participant of patrolParticipants) {
    const existing = await input.transaction.patrolParticipant.findUnique({
      where: {
        eventId_memberProfileId: {
          eventId: participant.eventId,
          memberProfileId: input.canonicalProfileId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      conflicts += 1;
      continue;
    }

    await input.transaction.patrolParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        memberProfileId: input.canonicalProfileId,
      },
    });
    transferred += 1;
  }

  await input.transaction.patrolRsvp.updateMany({
    where: {
      memberProfileId: input.duplicateProfileId,
    },
    data: {
      memberProfileId: input.canonicalProfileId,
    },
  });

  await input.transaction.memberProfile.update({
    where: {
      id: input.duplicateProfileId,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
      userId: null,
    },
  });

  return {
    conflicts,
    transferred,
  };
}

async function transferUserOwnedOperationalRecords(input: {
  canonicalUserId: string;
  duplicateUserId: string;
  transaction: Prisma.TransactionClient;
}) {
  if (input.canonicalUserId === input.duplicateUserId) {
    return 0;
  }

  const updateResults = await Promise.all([
    input.transaction.formSubmission.updateMany({
      where: {
        submittedByUserId: input.duplicateUserId,
      },
      data: {
        submittedByUserId: input.canonicalUserId,
      },
    }),
    input.transaction.formSubmission.updateMany({
      where: {
        reviewerUserId: input.duplicateUserId,
      },
      data: {
        reviewerUserId: input.canonicalUserId,
      },
    }),
    input.transaction.submissionComment.updateMany({
      where: {
        authorUserId: input.duplicateUserId,
      },
      data: {
        authorUserId: input.canonicalUserId,
      },
    }),
    input.transaction.approvalDecision.updateMany({
      where: {
        decidedByUserId: input.duplicateUserId,
      },
      data: {
        decidedByUserId: input.canonicalUserId,
      },
    }),
    input.transaction.attendanceRecord.updateMany({
      where: {
        recordedByUserId: input.duplicateUserId,
      },
      data: {
        recordedByUserId: input.canonicalUserId,
      },
    }),
    input.transaction.memberQualification.updateMany({
      where: {
        awardedByUserId: input.duplicateUserId,
      },
      data: {
        awardedByUserId: input.canonicalUserId,
      },
    }),
    input.transaction.aar.updateMany({
      where: {
        submittedByUserId: input.duplicateUserId,
      },
      data: {
        submittedByUserId: input.canonicalUserId,
      },
    }),
    input.transaction.aar.updateMany({
      where: {
        reviewedByUserId: input.duplicateUserId,
      },
      data: {
        reviewedByUserId: input.canonicalUserId,
      },
    }),
    input.transaction.pendingDiscordAarSubmission.updateMany({
      where: {
        submittedByUserId: input.duplicateUserId,
      },
      data: {
        submittedByUserId: input.canonicalUserId,
      },
    }),
  ]);

  return updateResults.reduce((total, result) => total + result.count, 0);
}

export async function mergeDiscordIdentityDuplicates(input: {
  actorUserId: string;
  discordUserId: string;
}) {
  const diagnostics = await listDiscordIdentityDiagnostics({
    permissionGrants: [
      {
        key: "admin.users.view",
        roleId: "system",
        roleLabel: "System",
        unitId: null,
        unitName: null,
      },
      {
        key: "discord.identity.merge",
        roleId: "system",
        roleLabel: "System",
        unitId: null,
        unitName: null,
      },
    ],
    permissions: ["admin.users.view", "discord.identity.merge"],
  });
  const group = diagnostics?.duplicateDiscordIdentities.find(
    (item) => item.discordUserId === input.discordUserId,
  );

  if (!group?.suggestedCanonicalUserId || group.users.length < 2) {
    throw new Error("No exact Discord ID duplicate group was found to merge.");
  }

  await recordAuditEvent({
    action: "discord.identity.duplicate_detected",
    actorUserId: input.actorUserId,
    entityId: input.discordUserId,
    entityType: "DiscordIdentity",
    metadata: {
      discordUserId: input.discordUserId,
      userIds: group.users.map((item) => item.id),
    },
    summary: `Exact Discord ID duplicate detected for ${input.discordUserId}.`,
  });

  let result: {
    canonicalProfileId: string;
    canonicalUserId: string;
    conflictCount: number;
    duplicateUserIds: string[];
    transferredCount: number;
  };

  try {
    result = await prisma.$transaction(async (transaction) => {
    const canonical = await transaction.user.findUnique({
      where: {
        id: group.suggestedCanonicalUserId ?? "",
      },
      include: identityUserInclude,
    });

    if (!canonical) {
      throw new Error("The suggested canonical user no longer exists.");
    }

    const canonicalProfile = canonical.memberProfile
      ? canonical.memberProfile
      : await ensureCanonicalMemberProfile({
          canonicalUser: canonical,
          client: transaction,
          discordUserId: input.discordUserId,
          displayName: getDiagnosticUserLabel(canonical),
        });
    let conflictCount = 0;
    let transferredCount = 0;
    const duplicateUserIds = group.users
      .map((item) => item.id)
      .filter((userId) => userId !== canonical.id);

    for (const duplicateUserId of duplicateUserIds) {
      const duplicate = await transaction.user.findUnique({
        where: {
          id: duplicateUserId,
        },
        include: identityUserInclude,
      });

      if (!duplicate) {
        continue;
      }

      if (duplicate.memberProfile) {
        const transfer = await transferMemberProfileRelations({
          canonicalProfileId: canonicalProfile.id,
          duplicateProfileId: duplicate.memberProfile.id,
          transaction,
        });
        conflictCount += transfer.conflicts;
        transferredCount += transfer.transferred;
      }

      transferredCount += await transferUserOwnedOperationalRecords({
        canonicalUserId: canonical.id,
        duplicateUserId: duplicate.id,
        transaction,
      });

      await transaction.account.updateMany({
        where: {
          userId: duplicate.id,
          NOT: {
            provider: "discord",
          },
        },
        data: {
          userId: canonical.id,
        },
      });
      await transaction.account.updateMany({
        where: {
          provider: "discord",
          providerAccountId: input.discordUserId,
        },
        data: {
          userId: canonical.id,
        },
      });
      await transaction.userRole.updateMany({
        where: {
          userId: duplicate.id,
        },
        data: {
          userId: canonical.id,
        },
      });
      await transaction.discordGuildMemberState.updateMany({
        where: {
          discordUserId: input.discordUserId,
        },
        data: {
          memberProfileId: canonicalProfile.id,
          userId: canonical.id,
        },
      });
      await transaction.discordMemberLink.updateMany({
        where: {
          discordUserId: input.discordUserId,
        },
        data: {
          memberProfileId: canonicalProfile.id,
          userId: canonical.id,
        },
      });

      await archiveTransientDuplicate({
        canonicalUserId: canonical.id,
        client: transaction,
        discordUserId: input.discordUserId,
        duplicateUserId: duplicate.id,
      });
    }

    await transaction.user.update({
      where: {
        id: canonical.id,
      },
      data: {
        discordId: input.discordUserId,
        isActive: true,
      },
    });

    return {
      canonicalProfileId: canonicalProfile.id,
      canonicalUserId: canonical.id,
      conflictCount,
      duplicateUserIds,
      transferredCount,
    };
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Discord identity duplicate merge failed.";

    await recordAuditEvent({
      action: "discord.identity.profile_merge_failed",
      actorUserId: input.actorUserId,
      entityId: input.discordUserId,
      entityType: "DiscordIdentity",
      metadata: {
        discordUserId: input.discordUserId,
        userIds: group.users.map((item) => item.id),
      },
      reason: message,
      summary: `Failed to merge duplicate portal identities for Discord user ${input.discordUserId}.`,
    });

    throw error;
  }

  await recordAuditEvent({
    action: "discord.identity.duplicate_merged",
    actorUserId: input.actorUserId,
    entityId: result.canonicalUserId,
    entityType: "User",
    metadata: {
      canonicalProfileId: result.canonicalProfileId,
      conflictCount: result.conflictCount,
      discordUserId: input.discordUserId,
      duplicateUserIds: result.duplicateUserIds,
      transferredCount: result.transferredCount,
    },
    summary: `Merged duplicate portal identities for Discord user ${input.discordUserId}.`,
  });

  return result;
}
