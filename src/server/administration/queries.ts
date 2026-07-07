import { Prisma } from "@prisma/client";

import type {
  AdministrationReferenceData,
  AdministrationRoleDetail,
  AdministrationRoleListData,
  AdministrationRoleListItem,
  AdministrationUserDetail,
  AdministrationUserListData,
  AdministrationUserListItem,
} from "@/server/administration/types";
import {
  buildPermissionGroups,
  buildScopedEffectivePermissionGroups,
  formatTimestamp,
  isRoleAssignmentCurrentlyActive,
} from "@/server/administration/utils";
import { prisma } from "@/server/database/client";
import { requirePermission } from "@/server/permissions/access";

const userAdministrationInclude = Prisma.validator<Prisma.UserInclude>()({
  memberProfile: {
    include: {
      currentPosition: true,
      currentUnit: true,
      status: true,
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
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
});

const roleAdministrationInclude = Prisma.validator<Prisma.RoleInclude>()({
  rolePermissions: {
    include: {
      permission: true,
    },
    orderBy: {
      permission: {
        key: "asc",
      },
    },
  },
  userRoles: {
    include: {
      unit: true,
      user: {
        include: {
          memberProfile: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
});

type AdministrationUserRecord = Prisma.UserGetPayload<{
  include: typeof userAdministrationInclude;
}>;

type AdministrationRoleRecord = Prisma.RoleGetPayload<{
  include: typeof roleAdministrationInclude;
}>;

function buildUserListItem(user: AdministrationUserRecord): AdministrationUserListItem {
  const activeAssignments = user.userRoles.filter(isRoleAssignmentCurrentlyActive);
  const effectivePermissionCount = new Set(
    activeAssignments.flatMap((assignment) =>
      assignment.role.rolePermissions.map((rolePermission) => rolePermission.permission.key),
    ),
  ).size;

  return {
    activeRoleCount: activeAssignments.length,
    createdAtLabel: formatTimestamp(user.createdAt) ?? "Unknown",
    discordId: user.discordId,
    displayName: user.displayName ?? user.name ?? user.email ?? "Portal User",
    effectivePermissionCount,
    email: user.email,
    id: user.id,
    isActive: user.isActive,
    linkedProfileLabel: user.memberProfile?.displayName ?? null,
    roleLabels: activeAssignments.map((assignment) => assignment.role.label),
    unitLabel: user.memberProfile?.currentUnit?.shortName ?? user.memberProfile?.currentUnit?.name ?? null,
  };
}

function buildUserDetail(user: AdministrationUserRecord): AdministrationUserDetail {
  const activeAssignments = user.userRoles.filter(isRoleAssignmentCurrentlyActive);
  const effectivePermissionGroups = buildScopedEffectivePermissionGroups(
    activeAssignments.flatMap((assignment) =>
      assignment.role.rolePermissions.map((rolePermission) => ({
        description: rolePermission.permission.description ?? null,
        id: rolePermission.permission.id,
        key: rolePermission.permission.key,
        label: rolePermission.permission.label,
        module: rolePermission.permission.module,
        scopeLabel: assignment.unit?.name ?? "Global",
      })),
    ),
  );

  return {
    assignedRoles: user.userRoles.map((assignment) => ({
      id: assignment.id,
      isActive: assignment.isActive,
      roleId: assignment.roleId,
      roleIsActive: assignment.role.isActive,
      roleIsSystem: assignment.role.isSystem,
      roleLabel: assignment.role.label,
      roleName: assignment.role.name,
      scopeLabel: assignment.unit?.name ?? "Global",
      startsAtLabel: formatTimestamp(assignment.startsAt),
      endsAtLabel: formatTimestamp(assignment.endsAt),
      unitId: assignment.unitId,
      unitName: assignment.unit?.name ?? null,
    })),
    auditSummary: {
      activeAssignments: activeAssignments.length,
      totalAssignments: user.userRoles.length,
    },
    createdAtLabel: formatTimestamp(user.createdAt) ?? "Unknown",
    currentPositionLabel: user.memberProfile?.currentPosition?.title ?? null,
    currentUnitLabel: user.memberProfile?.currentUnit?.name ?? null,
    discordId: user.discordId,
    displayName: user.displayName ?? user.name ?? user.email ?? "Portal User",
    effectivePermissionGroups,
    effectivePermissionKeys: effectivePermissionGroups.flatMap((group) =>
      group.permissions.map((permission) => permission.key),
    ),
    email: user.email,
    id: user.id,
    isActive: user.isActive,
    linkedProfileId: user.memberProfile?.id ?? null,
    linkedProfileLabel: user.memberProfile?.displayName ?? null,
    profileStatusLabel: user.memberProfile?.status.label ?? null,
  };
}

function buildRoleListItem(role: AdministrationRoleRecord): AdministrationRoleListItem {
  const now = new Date();

  return {
    activeAssignmentCount: role.userRoles.filter((assignment) => {
      if (!assignment.isActive || !role.isActive) {
        return false;
      }

      if (assignment.startsAt && assignment.startsAt > now) {
        return false;
      }

      if (assignment.endsAt && assignment.endsAt <= now) {
        return false;
      }

      return true;
    }).length,
    id: role.id,
    isActive: role.isActive,
    isSystem: role.isSystem,
    label: role.label,
    name: role.name,
    permissionCount: role.rolePermissions.length,
    updatedAtLabel: formatTimestamp(role.updatedAt) ?? "Unknown",
  };
}

function buildRoleDetail(role: AdministrationRoleRecord): AdministrationRoleDetail {
  return {
    assignedUsers: role.userRoles.map((assignment) => ({
      id: assignment.id,
      isActive: assignment.isActive,
      isUserActive: assignment.user.isActive && !assignment.user.deletedAt,
      linkedProfileLabel: assignment.user.memberProfile?.displayName ?? null,
      scopeLabel: assignment.unit?.name ?? "Global",
      startsAtLabel: formatTimestamp(assignment.startsAt),
      unitId: assignment.unitId,
      userDisplayName:
        assignment.user.displayName ??
        assignment.user.name ??
        assignment.user.email ??
        "Portal User",
      userEmail: assignment.user.email,
      userId: assignment.userId,
    })),
    description: role.description ?? null,
    id: role.id,
    isActive: role.isActive,
    isSystem: role.isSystem,
    label: role.label,
    name: role.name,
    permissionCount: role.rolePermissions.length,
    permissionGroups: buildPermissionGroups(
      role.rolePermissions.map((rolePermission) => ({
        assigned: true,
        category: rolePermission.permission.category,
        description: rolePermission.permission.description ?? null,
        id: rolePermission.permission.id,
        key: rolePermission.permission.key,
        label: rolePermission.permission.label,
        module: rolePermission.permission.module,
      })),
    ),
    updatedAtLabel: formatTimestamp(role.updatedAt) ?? "Unknown",
  };
}

export async function getAdministrationReferenceData(input?: {
  includePermissions?: boolean;
}): Promise<AdministrationReferenceData> {
  await requirePermission("admin.roles.view");

  if (input?.includePermissions ?? true) {
    await requirePermission("admin.permissions.view");
  }

  const [roles, permissions, units] = await Promise.all([
    prisma.role.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        label: "asc",
      },
      select: {
        id: true,
        isSystem: true,
        label: true,
        name: true,
      },
    }),
    input?.includePermissions ?? true
      ? prisma.permission.findMany({
          where: {
            isSystem: true,
          },
          orderBy: [
            {
              module: "asc",
            },
            {
              key: "asc",
            },
          ],
        })
      : Promise.resolve([]),
    prisma.unit.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        shortName: true,
      },
    }),
  ]);

  return {
    activeRoles: roles,
    permissionGroups: buildPermissionGroups(
      permissions.map((permission) => ({
        category: permission.category,
        description: permission.description ?? null,
        id: permission.id,
        key: permission.key,
        label: permission.label,
        module: permission.module,
      })),
    ),
    units,
  };
}

export async function listAdministrationUsers(filters: {
  q?: string;
  state?: "active" | "inactive" | "";
} = {}): Promise<AdministrationUserListData> {
  await requirePermission("admin.users.view");

  const q = filters.q?.trim() ?? "";
  const where: Prisma.UserWhereInput = {
    ...(filters.state === "active" ? { isActive: true } : {}),
    ...(filters.state === "inactive" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { displayName: { contains: q } },
            { name: { contains: q } },
            { email: { contains: q } },
            { discordId: { contains: q } },
            {
              memberProfile: {
                is: {
                  displayName: { contains: q },
                },
              },
            },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    include: userAdministrationInclude,
    orderBy: [
      {
        isActive: "desc",
      },
      {
        displayName: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  return {
    filters,
    users: users.map(buildUserListItem),
  };
}

export async function getAdministrationUserDetail(userId: string) {
  await requirePermission("admin.users.view");

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: userAdministrationInclude,
  });

  return user ? buildUserDetail(user) : null;
}

export async function listAdministrationRoles(filters: {
  q?: string;
  state?: "active" | "inactive" | "";
} = {}): Promise<AdministrationRoleListData> {
  await requirePermission("admin.roles.view");

  const q = filters.q?.trim() ?? "";
  const where: Prisma.RoleWhereInput = {
    ...(filters.state === "active" ? { isActive: true } : {}),
    ...(filters.state === "inactive" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { label: { contains: q } },
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  };

  const roles = await prisma.role.findMany({
    where,
    include: roleAdministrationInclude,
    orderBy: [
      {
        isActive: "desc",
      },
      {
        label: "asc",
      },
    ],
  });

  return {
    filters,
    roles: roles.map(buildRoleListItem),
  };
}

export async function getAdministrationRoleDetail(roleId: string) {
  await requirePermission("admin.roles.view");

  const role = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
    include: roleAdministrationInclude,
  });

  return role ? buildRoleDetail(role) : null;
}
