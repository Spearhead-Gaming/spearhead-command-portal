import { cache } from "react";
import type { Prisma } from "@prisma/client";

import type { PortalPermissionGrant, PortalUser } from "@/features/auth/types";
import { auth } from "@/auth";
import { prisma } from "@/server/database/client";

function getPortalDisplayName(user: {
  displayName: string | null;
  name: string | null;
  email: string | null;
}) {
  return user.displayName ?? user.name ?? user.email ?? "Portal User";
}

function isRoleCurrentlyActive(roleAssignment: {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  role: {
    isActive: boolean;
  };
}) {
  if (!roleAssignment.isActive || !roleAssignment.role.isActive) {
    return false;
  }

  const now = new Date();

  if (roleAssignment.startsAt && roleAssignment.startsAt > now) {
    return false;
  }

  if (roleAssignment.endsAt && roleAssignment.endsAt <= now) {
    return false;
  }

  return true;
}

function dedupePermissionGrants(grants: PortalPermissionGrant[]) {
  const grantMap = new Map<string, PortalPermissionGrant>();

  for (const grant of grants) {
    grantMap.set(`${grant.key}:${grant.unitId ?? "global"}`, grant);
  }

  return Array.from(grantMap.values());
}

const portalUserRecordInclude = {
  memberProfile: {
    include: {
      currentUnit: true,
    },
  },
  userRoles: {
    include: {
      unit: true,
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} as const;

type PortalUserRecord = Prisma.UserGetPayload<{
  include: typeof portalUserRecordInclude;
}>;

function mapPortalUser(user: NonNullable<PortalUserRecord>): PortalUser {
  if (!user) {
    throw new Error("Portal user is required.");
  }

  const activeRoleAssignments = user.userRoles
    .filter(isRoleCurrentlyActive)
    .sort((left, right) => {
      if (left.unitId === null && right.unitId !== null) {
        return -1;
      }

      if (left.unitId !== null && right.unitId === null) {
        return 1;
      }

      return left.role.label.localeCompare(right.role.label);
    });
  const permissionGrants = dedupePermissionGrants(
    activeRoleAssignments.flatMap((assignment) =>
      assignment.role.rolePermissions.map((rolePermission) => ({
        key: rolePermission.permission.key,
        roleId: assignment.role.id,
        roleLabel: assignment.role.label,
        unitId: assignment.unitId,
        unitName: assignment.unit?.name ?? null,
      })),
    ),
  );

  const permissions = Array.from(
    new Set(permissionGrants.map((permissionGrant) => permissionGrant.key)),
  ).sort();

  const primaryRoleAssignment = activeRoleAssignments[0] ?? null;
  const memberProfileUnit = user.memberProfile?.currentUnit ?? null;
  const primaryUnit = memberProfileUnit ?? primaryRoleAssignment?.unit ?? null;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: getPortalDisplayName(user),
    callsign: user.callsign ?? user.memberProfile?.callsign ?? null,
    primaryRole: primaryRoleAssignment?.role.label ?? "Authenticated User",
    primaryUnitId: primaryUnit?.id ?? null,
    unit: primaryUnit?.name ?? null,
    permissions,
    permissionGrants,
    avatarUrl: user.avatarUrl ?? user.image ?? null,
    discordId: user.discordId ?? null,
    discordLinked: Boolean(user.discordId),
    memberProfileId: user.memberProfile?.id ?? null,
    memberProfileLinked: Boolean(user.memberProfile?.id),
  };
}

const getCurrentPortalUserRecord = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: portalUserRecordInclude,
  });
});

export const getCurrentUser = cache(async (): Promise<PortalUser | null> => {
  const user = await getCurrentPortalUserRecord();

  if (!user || !user.isActive || user.deletedAt) {
    return null;
  }

  return mapPortalUser(user);
});

export async function getPortalUserById(userId: string): Promise<PortalUser | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: portalUserRecordInclude,
  });

  if (!user || !user.isActive || user.deletedAt) {
    return null;
  }

  return mapPortalUser(user);
}

export async function getPortalUserByDiscordId(discordId: string): Promise<PortalUser | null> {
  const user = await prisma.user.findUnique({
    where: {
      discordId,
    },
    include: portalUserRecordInclude,
  });

  if (!user || !user.isActive || user.deletedAt) {
    return null;
  }

  return mapPortalUser(user);
}
