import type { Prisma } from "@prisma/client";

import type {
  AdministrationPermissionEntry,
  AdministrationPermissionGroup,
} from "@/server/administration/types";

export const criticalAdministrationPermissionKeys = [
  "admin.users.manage",
  "admin.roles.view",
  "admin.roles.create",
  "admin.roles.edit",
  "admin.roles.delete",
  "admin.permissions.view",
  "admin.permissions.assign",
] as const;

export function formatTimestamp(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

export function getModuleLabel(module: string) {
  return module
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isRoleAssignmentCurrentlyActive(input: {
  endsAt: Date | null;
  isActive: boolean;
  role: {
    isActive: boolean;
  };
  startsAt: Date | null;
}) {
  if (!input.isActive || !input.role.isActive) {
    return false;
  }

  const now = new Date();

  if (input.startsAt && input.startsAt > now) {
    return false;
  }

  if (input.endsAt && input.endsAt <= now) {
    return false;
  }

  return true;
}

export function buildPermissionGroups(
  permissions: AdministrationPermissionEntry[],
): AdministrationPermissionGroup[] {
  const groups = new Map<string, AdministrationPermissionGroup>();

  for (const permission of permissions) {
    const existingGroup = groups.get(permission.module);

    if (existingGroup) {
      existingGroup.permissions.push(permission);
      continue;
    }

    groups.set(permission.module, {
      module: permission.module,
      moduleLabel: getModuleLabel(permission.module),
      permissions: [permission],
    });
  }

  return Array.from(groups.values())
    .sort((left, right) => left.moduleLabel.localeCompare(right.moduleLabel))
    .map((group) => ({
      ...group,
      permissions: group.permissions.sort((left, right) => left.key.localeCompare(right.key)),
    }));
}

type PermissionWithScope = {
  description: string | null;
  id: string;
  key: string;
  label: string;
  module: string;
  scopeLabel: string;
};

export function buildScopedEffectivePermissionGroups(
  permissions: PermissionWithScope[],
): AdministrationPermissionGroup[] {
  const entriesByKey = new Map<string, AdministrationPermissionEntry>();

  for (const permission of permissions) {
    const key = `${permission.module}:${permission.key}`;
    const existing = entriesByKey.get(key);

    if (existing) {
      existing.scopes = Array.from(
        new Set([...(existing.scopes ?? []), permission.scopeLabel]),
      ).sort((left, right) => left.localeCompare(right));
      continue;
    }

    entriesByKey.set(key, {
      id: permission.id,
      key: permission.key,
      label: permission.label,
      description: permission.description,
      module: permission.module,
      category: "effective",
      scopes: [permission.scopeLabel],
    });
  }

  return buildPermissionGroups(Array.from(entriesByKey.values()));
}

export type AdministrationSimulationUserRecord = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export function countUsersWithAdministrationPath(
  users: AdministrationSimulationUserRecord[],
  options?: {
    deactivatedUserIds?: Set<string>;
    disabledRoleIds?: Set<string>;
    inactiveUserRoleIds?: Set<string>;
    rolePermissionOverrides?: Map<string, Set<string>>;
  },
) {
  const deactivatedUserIds = options?.deactivatedUserIds ?? new Set<string>();
  const disabledRoleIds = options?.disabledRoleIds ?? new Set<string>();
  const inactiveUserRoleIds = options?.inactiveUserRoleIds ?? new Set<string>();
  const rolePermissionOverrides = options?.rolePermissionOverrides ?? new Map<string, Set<string>>();

  return users.filter((user) => {
    if (!user.isActive || user.deletedAt || deactivatedUserIds.has(user.id)) {
      return false;
    }

    const globalPermissions = new Set<string>();

    for (const assignment of user.userRoles) {
      if (inactiveUserRoleIds.has(assignment.id)) {
        continue;
      }

      const roleIsActive =
        assignment.role.isActive && !disabledRoleIds.has(assignment.roleId);
      const assignmentIsActive = isRoleAssignmentCurrentlyActive({
        endsAt: assignment.endsAt,
        isActive: assignment.isActive,
        role: {
          isActive: roleIsActive,
        },
        startsAt: assignment.startsAt,
      });

      if (!assignmentIsActive || assignment.unitId !== null) {
        continue;
      }

      const permissionKeys = rolePermissionOverrides.get(assignment.roleId) ??
        new Set(
          assignment.role.rolePermissions.map((rolePermission) => rolePermission.permission.key),
        );

      for (const permissionKey of permissionKeys) {
        globalPermissions.add(permissionKey);
      }
    }

    return criticalAdministrationPermissionKeys.every((permissionKey) =>
      globalPermissions.has(permissionKey),
    );
  }).length;
}
