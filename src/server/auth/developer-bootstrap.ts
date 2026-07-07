import { createHash, timingSafeEqual } from "node:crypto";

import type { User } from "next-auth";

import { prisma } from "@/server/database/client";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import { getDeveloperBootstrapConfig } from "@/server/auth/runtime-config";

// WARNING: This file implements bootstrap-only recovery access. Keep the route
// hidden, keep it environment-gated, and disable it in production unless an
// operator is actively restoring administrator access.

type RateLimitState = {
  blockedUntil: number | null;
  count: number;
  windowStartedAt: number;
};

const DEV_LOGIN_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const DEV_LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const DEV_LOGIN_MAX_ATTEMPTS = 5;
const DEVELOPER_BOOTSTRAP_ROLE_NAME = "system-administrator";

export type DeveloperBootstrapReadiness =
  | { ready: true }
  | {
      ready: false;
      reason:
        | "disabled"
        | "database_unavailable"
        | "system_role_missing";
    };

declare global {
  var __spearheadDevLoginAttempts__: Map<string, RateLimitState> | undefined;
}

const devLoginAttempts = globalThis.__spearheadDevLoginAttempts__ ?? new Map<string, RateLimitState>();

if (!globalThis.__spearheadDevLoginAttempts__) {
  globalThis.__spearheadDevLoginAttempts__ = devLoginAttempts;
}

function getClientIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip")?.trim() ?? request.headers.get("cf-connecting-ip")?.trim() ?? null;
}

function getAttemptKey(ipAddress: string | null) {
  return ipAddress ?? "unknown";
}

function getRateLimitState(attemptKey: string, now: number) {
  const current = devLoginAttempts.get(attemptKey);

  if (!current) {
    return {
      blockedUntil: null,
      count: 0,
      windowStartedAt: now,
    };
  }

  if (current.blockedUntil && current.blockedUntil > now) {
    return current;
  }

  if (now - current.windowStartedAt > DEV_LOGIN_ATTEMPT_WINDOW_MS) {
    return {
      blockedUntil: null,
      count: 0,
      windowStartedAt: now,
    };
  }

  if (current.blockedUntil && current.blockedUntil <= now) {
    return {
      blockedUntil: null,
      count: 0,
      windowStartedAt: now,
    };
  }

  return current;
}

function registerFailedAttempt(attemptKey: string, now: number) {
  const current = getRateLimitState(attemptKey, now);
  const nextCount = current.count + 1;
  const blockedUntil =
    nextCount >= DEV_LOGIN_MAX_ATTEMPTS ? now + DEV_LOGIN_LOCKOUT_MS : current.blockedUntil;
  const nextState = {
    blockedUntil,
    count: nextCount,
    windowStartedAt: current.windowStartedAt,
  };

  devLoginAttempts.set(attemptKey, nextState);

  return nextState;
}

function clearFailedAttempts(attemptKey: string) {
  devLoginAttempts.delete(attemptKey);
}

function isSecretMatch(submittedSecret: string, expectedSecret: string) {
  if (!submittedSecret || !expectedSecret) {
    return false;
  }

  const submittedHash = createHash("sha256").update(submittedSecret).digest();
  const expectedHash = createHash("sha256").update(expectedSecret).digest();

  return timingSafeEqual(submittedHash, expectedHash);
}

async function ensureDeveloperBootstrapAccess(email: string) {
  const role = await prisma.role.findUnique({
    where: {
      name: DEVELOPER_BOOTSTRAP_ROLE_NAME,
    },
    select: {
      id: true,
      label: true,
    },
  });

  if (!role) {
    throw new Error(
      "The System Administrator starter role is missing. Run the Prisma seed before using developer bootstrap login.",
    );
  }

  const now = new Date();
  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      deletedAt: null,
      displayName: "Developer Bootstrap",
      emailVerified: now,
      isActive: true,
      name: "Developer Bootstrap",
    },
    create: {
      displayName: "Developer Bootstrap",
      email,
      emailVerified: now,
      isActive: true,
      name: "Developer Bootstrap",
    },
    select: {
      avatarUrl: true,
      discordId: true,
      displayName: true,
      email: true,
      id: true,
      image: true,
      name: true,
    },
  });

  const existingRoleAssignment = await prisma.userRole.findFirst({
    where: {
      roleId: role.id,
      unitId: null,
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (existingRoleAssignment) {
    await prisma.userRole.update({
      where: {
        id: existingRoleAssignment.id,
      },
      data: {
        endsAt: null,
        isActive: true,
        startsAt: null,
      },
    });
  } else {
    await prisma.userRole.create({
      data: {
        roleId: role.id,
        userId: user.id,
      },
    });
  }

  return {
    ...user,
    roleLabel: role.label,
  };
}

export async function getDeveloperBootstrapReadiness(): Promise<DeveloperBootstrapReadiness> {
  const config = getDeveloperBootstrapConfig();

  if (!config.enabled) {
    return {
      ready: false,
      reason: "disabled",
    };
  }

  try {
    const role = await prisma.role.findUnique({
      where: {
        name: DEVELOPER_BOOTSTRAP_ROLE_NAME,
      },
      select: {
        id: true,
      },
    });

    if (!role) {
      return {
        ready: false,
        reason: "system_role_missing",
      };
    }

    return {
      ready: true,
    };
  } catch {
    return {
      ready: false,
      reason: "database_unavailable",
    };
  }
}

function getSecretFromCredentials(credentials: Partial<Record<string, unknown>> | undefined) {
  const secret = credentials?.secret;

  return typeof secret === "string" ? secret.trim() : "";
}

export async function authorizeDeveloperBootstrap(
  credentials: Partial<Record<string, unknown>> | undefined,
  request: Request,
): Promise<User | null> {
  const config = getDeveloperBootstrapConfig();

  if (!config.enabled) {
    return null;
  }

  const ipAddress = getClientIpAddress(request);
  const attemptKey = getAttemptKey(ipAddress);
  const now = Date.now();
  const rateLimitState = getRateLimitState(attemptKey, now);

  if (rateLimitState.blockedUntil && rateLimitState.blockedUntil > now) {
    await recordAuditEvent({
      action: "auth.dev_login.failed",
      entityId: config.email || null,
      entityType: "Authentication",
      ipAddress,
      metadata: {
        attemptKey,
        provider: "developer-bootstrap",
        retryAfterMs: rateLimitState.blockedUntil - now,
      },
      reason: "rate_limited",
      summary: "Developer bootstrap login attempt blocked by rate limiting.",
    });

    return null;
  }

  const submittedSecret = getSecretFromCredentials(credentials);

  if (!isSecretMatch(submittedSecret, config.secret)) {
    const nextState = registerFailedAttempt(attemptKey, now);

    await recordAuditEvent({
      action: "auth.dev_login.failed",
      entityId: config.email || null,
      entityType: "Authentication",
      ipAddress,
      metadata: {
        attemptKey,
        attemptsInWindow: nextState.count,
        lockoutActive: Boolean(nextState.blockedUntil),
        provider: "developer-bootstrap",
      },
      reason: submittedSecret ? "invalid_secret" : "missing_secret",
      summary: "Developer bootstrap login failed due to invalid credentials.",
    });

    return null;
  }

  try {
    const user = await ensureDeveloperBootstrapAccess(config.email);

    clearFailedAttempts(attemptKey);

    await recordAuditEvent({
      action: "auth.dev_login.succeeded",
      actorUserId: user.id,
      entityId: user.id,
      entityType: "User",
      ipAddress,
      metadata: {
        attemptKey,
        email: user.email,
        provider: "developer-bootstrap",
        role: user.roleLabel,
      },
      summary: "Developer bootstrap login succeeded.",
    });

    return {
      discordId: user.discordId,
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      image: user.avatarUrl ?? user.image,
      name: user.name ?? user.displayName ?? "Developer Bootstrap",
    };
  } catch (error) {
    const nextState = registerFailedAttempt(attemptKey, now);

    await recordAuditEvent({
      action: "auth.dev_login.failed",
      entityId: config.email || null,
      entityType: "Authentication",
      ipAddress,
      metadata: {
        attemptKey,
        attemptsInWindow: nextState.count,
        error: error instanceof Error ? error.message : "Unknown provisioning error",
        provider: "developer-bootstrap",
      },
      reason: "provisioning_error",
      summary: "Developer bootstrap login failed while provisioning local access.",
    });

    return null;
  }
}
