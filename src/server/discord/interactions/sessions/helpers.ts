import type { Prisma } from "@prisma/client";

import {
  cancelSession,
  completeSession,
  createSession,
  expireSessionById,
  findActiveSessionForUser,
  getSession,
  updateSessionPayload,
  updateSessionStep,
  type CreateDiscordInteractionSessionInput,
} from "@/server/discord/interactions/sessions/service";
import type { DiscordInteractionWorkflowType } from "@/server/discord/interactions/sessions/constants";

type SessionPayload = Prisma.InputJsonValue | null;

export async function startInteractionSession(
  input: CreateDiscordInteractionSessionInput,
) {
  return createSession(input);
}

export async function requireActiveSession(input: {
  commandName?: string;
  discordUserId?: string;
  id?: string;
  workflowType?: DiscordInteractionWorkflowType;
}) {
  const session = input.id
    ? await getSession(input.id)
    : input.discordUserId
      ? await findActiveSessionForUser({
          commandName: input.commandName,
          discordUserId: input.discordUserId,
          workflowType: input.workflowType,
        })
      : null;

  if (!session) {
    throw new Error("No active Discord interaction session was found.");
  }

  if (session.status !== "ACTIVE") {
    throw new Error(`Discord interaction session is ${session.status.toLowerCase()}.`);
  }

  if (session.expiresAt <= new Date()) {
    await expireSessionById(
      session.id,
      "Session was already expired when required by a handler.",
    );
    throw new Error("Discord interaction session has expired.");
  }

  return session;
}

export async function continueInteractionSession(input: {
  currentStep?: string;
  id: string;
  mergePayload?: boolean;
  temporaryPayload?: SessionPayload;
}) {
  if (input.currentStep) {
    return updateSessionStep({
      currentStep: input.currentStep,
      id: input.id,
      temporaryPayload: input.temporaryPayload,
    });
  }

  if (input.temporaryPayload !== undefined) {
    return updateSessionPayload({
      id: input.id,
      merge: input.mergePayload,
      temporaryPayload: input.temporaryPayload,
    });
  }

  return requireActiveSession({
    id: input.id,
  });
}

export async function completeInteractionSession(input: {
  id: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  temporaryPayload?: SessionPayload;
}) {
  return completeSession(input);
}

export async function cancelInteractionSession(input: {
  id: string;
  reason?: string | null;
}) {
  return cancelSession(input);
}
