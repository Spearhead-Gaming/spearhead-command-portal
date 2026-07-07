import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { resolveDiscordCanonicalUser } from "@/server/discord/identity";
import {
  getDiscordInteractionSessionExpiration,
  type DiscordInteractionWorkflowType,
} from "@/server/discord/interactions/sessions/constants";

type SessionJsonPayload = Prisma.InputJsonValue | null;

type InteractionSessionRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.discordInteractionSession.findUnique>>
>;

type InteractionSessionIdentity = {
  memberProfileId?: string | null;
  portalUserId?: string | null;
};

export type CreateDiscordInteractionSessionInput = InteractionSessionIdentity & {
  channelId?: string | null;
  commandName: string;
  currentStep?: string;
  discordUserId: string;
  expiresAt?: Date;
  guildId?: string | null;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  requireLinkedUser?: boolean;
  temporaryPayload?: SessionJsonPayload;
  ttlMinutes?: number;
  workflowType: DiscordInteractionWorkflowType;
};

export type UpdateDiscordInteractionSessionPayloadInput = {
  id: string;
  merge?: boolean;
  temporaryPayload: SessionJsonPayload;
};

export type InteractionSessionDiagnostics = {
  activeCount: number;
  expiredCount: number;
  failedCount: number;
  recentFailed: Array<{
    commandName: string;
    currentStep: string;
    discordUserId: string;
    id: string;
    updatedAt: Date;
    workflowType: string;
  }>;
};

function isRecordPayload(value: Prisma.JsonValue | SessionJsonPayload): value is Prisma.JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function auditInteractionSession(input: {
  action: string;
  actorUserId?: string | null;
  reason?: string | null;
  session: Pick<
    InteractionSessionRecord,
    | "commandName"
    | "discordUserId"
    | "guildId"
    | "id"
    | "relatedEntityId"
    | "relatedEntityType"
    | "status"
    | "workflowType"
  >;
  summary: string;
}) {
  await createAuditLogEntry({
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    entityId: input.session.id,
    entityType: "DiscordInteractionSession",
    metadata: {
      commandName: input.session.commandName,
      discordUserId: input.session.discordUserId,
      guildId: input.session.guildId,
      relatedEntityId: input.session.relatedEntityId,
      relatedEntityType: input.session.relatedEntityType,
      status: input.session.status,
      workflowType: input.session.workflowType,
    },
    reason: input.reason ?? null,
    summary: input.summary,
  });
}

async function resolveSessionIdentity(input: CreateDiscordInteractionSessionInput) {
  if (input.portalUserId) {
    const user = await prisma.user.findUnique({
      where: {
        id: input.portalUserId,
      },
      include: {
        memberProfile: true,
      },
    });

    if (!user && input.requireLinkedUser) {
      throw new Error("Discord interaction requires a linked portal user.");
    }

    return {
      memberProfileId: input.memberProfileId ?? user?.memberProfile?.id ?? null,
      portalUserId: user?.id ?? input.portalUserId,
    };
  }

  const canonicalUser = await resolveDiscordCanonicalUser({
    discordUserId: input.discordUserId,
  });

  if (!canonicalUser && input.requireLinkedUser) {
    throw new Error(
      "Discord interaction requires a linked portal user. Sign in to the portal first, then try again.",
    );
  }

  return {
    memberProfileId: input.memberProfileId ?? canonicalUser?.memberProfile?.id ?? null,
    portalUserId: canonicalUser?.id ?? null,
  };
}

async function expireSession(session: InteractionSessionRecord, reason?: string | null) {
  if (session.status !== "ACTIVE") {
    return session;
  }

  const expired = await prisma.discordInteractionSession.update({
    where: {
      id: session.id,
    },
    data: {
      status: "EXPIRED",
    },
  });

  await auditInteractionSession({
    action: "discord.interaction_session.expired",
    actorUserId: expired.portalUserId,
    reason,
    session: expired,
    summary: `Discord interaction session expired for ${expired.workflowType}.`,
  });

  return expired;
}

export async function expireSessionById(id: string, reason?: string | null) {
  const session = await getSession(id);

  if (!session) {
    throw new Error("Discord interaction session was not found.");
  }

  return expireSession(session, reason);
}

async function assertSessionCanContinue(session: InteractionSessionRecord) {
  if (session.status !== "ACTIVE") {
    throw new Error(`Discord interaction session is ${session.status.toLowerCase()}.`);
  }

  if (session.expiresAt <= new Date()) {
    await expireSession(session, "Session expiration elapsed before continuation.");
    throw new Error("Discord interaction session has expired.");
  }
}

export async function createSession(input: CreateDiscordInteractionSessionInput) {
  const identity = await resolveSessionIdentity(input);
  const session = await prisma.discordInteractionSession.create({
    data: {
      channelId: input.channelId ?? null,
      commandName: input.commandName,
      currentStep: input.currentStep ?? "STARTED",
      discordUserId: input.discordUserId,
      expiresAt:
        input.expiresAt ?? getDiscordInteractionSessionExpiration(input.ttlMinutes),
      guildId: input.guildId ?? null,
      memberProfileId: identity.memberProfileId,
      portalUserId: identity.portalUserId,
      relatedEntityId: input.relatedEntityId ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      status: "ACTIVE",
      temporaryPayload: input.temporaryPayload ?? undefined,
      workflowType: input.workflowType,
    },
  });

  await auditInteractionSession({
    action: "discord.interaction_session.created",
    actorUserId: session.portalUserId,
    session,
    summary: `Discord interaction session created for ${session.workflowType}.`,
  });

  return session;
}

export async function getSession(id: string) {
  return prisma.discordInteractionSession.findUnique({
    where: {
      id,
    },
  });
}

export async function findActiveSessionForUser(input: {
  commandName?: string;
  discordUserId: string;
  workflowType?: DiscordInteractionWorkflowType;
}) {
  await expireOldSessions();

  return prisma.discordInteractionSession.findFirst({
    where: {
      commandName: input.commandName,
      discordUserId: input.discordUserId,
      status: "ACTIVE",
      workflowType: input.workflowType,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function updateSessionStep(input: {
  currentStep: string;
  id: string;
  temporaryPayload?: SessionJsonPayload;
}) {
  const session = await getSession(input.id);

  if (!session) {
    throw new Error("Discord interaction session was not found.");
  }

  await assertSessionCanContinue(session);

  return prisma.discordInteractionSession.update({
    where: {
      id: input.id,
    },
    data: {
      currentStep: input.currentStep,
      temporaryPayload: input.temporaryPayload ?? undefined,
    },
  });
}

export async function updateSessionPayload(
  input: UpdateDiscordInteractionSessionPayloadInput,
) {
  const session = await getSession(input.id);

  if (!session) {
    throw new Error("Discord interaction session was not found.");
  }

  await assertSessionCanContinue(session);

  const nextPayload =
    input.merge && isRecordPayload(session.temporaryPayload) && isRecordPayload(input.temporaryPayload)
      ? {
          ...session.temporaryPayload,
          ...input.temporaryPayload,
        }
      : input.temporaryPayload;

  return prisma.discordInteractionSession.update({
    where: {
      id: input.id,
    },
    data: {
      temporaryPayload: nextPayload ?? undefined,
    },
  });
}

export async function completeSession(input: {
  id: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  temporaryPayload?: SessionJsonPayload;
}) {
  const session = await getSession(input.id);

  if (!session) {
    throw new Error("Discord interaction session was not found.");
  }

  await assertSessionCanContinue(session);

  const completed = await prisma.discordInteractionSession.update({
    where: {
      id: input.id,
    },
    data: {
      completedAt: new Date(),
      relatedEntityId: input.relatedEntityId ?? session.relatedEntityId,
      relatedEntityType: input.relatedEntityType ?? session.relatedEntityType,
      status: "COMPLETED",
      temporaryPayload: input.temporaryPayload ?? undefined,
    },
  });

  await auditInteractionSession({
    action: "discord.interaction_session.completed",
    actorUserId: completed.portalUserId,
    session: completed,
    summary: `Discord interaction session completed for ${completed.workflowType}.`,
  });

  return completed;
}

export async function cancelSession(input: {
  id: string;
  reason?: string | null;
}) {
  const session = await getSession(input.id);

  if (!session) {
    throw new Error("Discord interaction session was not found.");
  }

  const cancelled = await prisma.discordInteractionSession.update({
    where: {
      id: input.id,
    },
    data: {
      cancelledAt: new Date(),
      status: "CANCELLED",
    },
  });

  await auditInteractionSession({
    action: "discord.interaction_session.cancelled",
    actorUserId: cancelled.portalUserId,
    reason: input.reason,
    session: cancelled,
    summary: `Discord interaction session cancelled for ${cancelled.workflowType}.`,
  });

  return cancelled;
}

export async function expireOldSessions(limit = 100) {
  const expiredCandidates = await prisma.discordInteractionSession.findMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
      status: "ACTIVE",
    },
    orderBy: {
      expiresAt: "asc",
    },
    take: limit,
  });

  const expiredSessions = [];

  for (const session of expiredCandidates) {
    expiredSessions.push(await expireSession(session));
  }

  return expiredSessions;
}

export async function failSession(input: {
  id: string;
  reason?: string | null;
  temporaryPayload?: SessionJsonPayload;
}) {
  const session = await getSession(input.id);

  if (!session) {
    throw new Error("Discord interaction session was not found.");
  }

  const failed = await prisma.discordInteractionSession.update({
    where: {
      id: input.id,
    },
    data: {
      status: "FAILED",
      temporaryPayload: input.temporaryPayload ?? undefined,
    },
  });

  await auditInteractionSession({
    action: "discord.interaction_session.failed",
    actorUserId: failed.portalUserId,
    reason: input.reason,
    session: failed,
    summary: `Discord interaction session failed for ${failed.workflowType}.`,
  });

  return failed;
}

export async function getInteractionSessionDiagnostics(): Promise<InteractionSessionDiagnostics> {
  const [activeCount, expiredCount, failedCount, recentFailed] = await Promise.all([
    prisma.discordInteractionSession.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.discordInteractionSession.count({
      where: {
        status: "EXPIRED",
      },
    }),
    prisma.discordInteractionSession.count({
      where: {
        status: "FAILED",
      },
    }),
    prisma.discordInteractionSession.findMany({
      where: {
        status: "FAILED",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        commandName: true,
        currentStep: true,
        discordUserId: true,
        id: true,
        updatedAt: true,
        workflowType: true,
      },
      take: 5,
    }),
  ]);

  return {
    activeCount,
    expiredCount,
    failedCount,
    recentFailed,
  };
}
