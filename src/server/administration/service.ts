import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { requirePermission } from "@/server/permissions/access";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import {
  countUsersWithAdministrationPath,
  criticalAdministrationPermissionKeys,
} from "@/server/administration/utils";

function normalizeRequiredString(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeOptionalId(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeRoleName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error("Role key is required.");
  }

  return normalized;
}

function revalidateAdministrationRoutes() {
  revalidatePath("/", "layout");
  revalidatePath("/administration");
  revalidatePath("/administration/users");
  revalidatePath("/administration/roles");
  revalidatePath("/administration/audit-logs");
}

async function getAdministrationSimulationUsers() {
  return prisma.user.findMany({
    include: {
      userRoles: {
        include: {
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
    },
  });
}

async function assertAdministrationPathRetained(options?: {
  deactivatedUserIds?: Set<string>;
  disabledRoleIds?: Set<string>;
  inactiveUserRoleIds?: Set<string>;
  rolePermissionOverrides?: Map<string, Set<string>>;
}) {
  const users = await getAdministrationSimulationUsers();
  const remainingAdminPathCount = countUsersWithAdministrationPath(users, options);

  if (remainingAdminPathCount === 0) {
    throw new Error(
      "This change would remove the last active global administration path. Keep at least one active user with the critical admin permissions.",
    );
  }
}

function toFriendlyPrismaError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new Error("That record already exists.");
  }

  return error;
}

export async function setUserActiveState(input: {
  isActive: boolean;
  reason?: string | null;
  userId: string;
}) {
  const actor = await requirePermission("admin.users.manage");
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.isActive === input.isActive) {
    return user;
  }

  if (!input.isActive) {
    await assertAdministrationPathRetained({
      deactivatedUserIds: new Set([user.id]),
    });
  }

  const updated = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      isActive: input.isActive,
    },
  });

  await recordAuditEvent({
    action: input.isActive ? "admin.user.activated" : "admin.user.deactivated",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "User",
    newValue: {
      isActive: updated.isActive,
    },
    oldValue: {
      isActive: user.isActive,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `${updated.displayName ?? updated.email ?? "User"} ${input.isActive ? "activated" : "deactivated"}.`,
  });

  revalidateAdministrationRoutes();

  return updated;
}

export async function createAdministrationRole(input: {
  description?: string | null;
  label: string;
  name: string;
  reason?: string | null;
}) {
  const actor = await requirePermission("admin.roles.create");

  try {
    const role = await prisma.role.create({
      data: {
        description: normalizeOptionalString(input.description),
        isActive: true,
        isSystem: false,
        label: normalizeRequiredString(input.label, "Role label"),
        name: normalizeRoleName(input.name),
      },
    });

    await recordAuditEvent({
      action: "admin.role.created",
      actorUserId: actor.id,
      entityId: role.id,
      entityType: "Role",
      newValue: {
        description: role.description,
        isActive: role.isActive,
        isSystem: role.isSystem,
        label: role.label,
        name: role.name,
      },
      reason: normalizeOptionalString(input.reason),
      summary: `${role.label} role created.`,
    });

    revalidateAdministrationRoutes();

    return role;
  } catch (error) {
    throw toFriendlyPrismaError(error);
  }
}

export async function editAdministrationRole(input: {
  description?: string | null;
  label: string;
  name?: string | null;
  reason?: string | null;
  roleId: string;
}) {
  const actor = await requirePermission("admin.roles.edit");
  const role = await prisma.role.findUnique({
    where: {
      id: input.roleId,
    },
  });

  if (!role) {
    throw new Error("Role not found.");
  }

  try {
    const updated = await prisma.role.update({
      where: {
        id: role.id,
      },
      data: {
        description: normalizeOptionalString(input.description),
        label: normalizeRequiredString(input.label, "Role label"),
        ...(role.isSystem
          ? {}
          : {
              name: input.name ? normalizeRoleName(input.name) : role.name,
            }),
      },
    });

    await recordAuditEvent({
      action: "admin.role.edited",
      actorUserId: actor.id,
      entityId: updated.id,
      entityType: "Role",
      newValue: {
        description: updated.description,
        label: updated.label,
        name: updated.name,
      },
      oldValue: {
        description: role.description,
        label: role.label,
        name: role.name,
      },
      reason: normalizeOptionalString(input.reason),
      summary: `${updated.label} role edited.`,
    });

    revalidateAdministrationRoutes();

    return updated;
  } catch (error) {
    throw toFriendlyPrismaError(error);
  }
}

export async function disableAdministrationRole(input: {
  reason?: string | null;
  roleId: string;
}) {
  const actor = await requirePermission("admin.roles.delete");
  const role = await prisma.role.findUnique({
    where: {
      id: input.roleId,
    },
  });

  if (!role) {
    throw new Error("Role not found.");
  }

  if (!role.isActive) {
    return role;
  }

  await assertAdministrationPathRetained({
    disabledRoleIds: new Set([role.id]),
  });

  const updated = await prisma.role.update({
    where: {
      id: role.id,
    },
    data: {
      isActive: false,
    },
  });

  await recordAuditEvent({
    action: "admin.role.disabled",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "Role",
    newValue: {
      isActive: updated.isActive,
    },
    oldValue: {
      isActive: role.isActive,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `${updated.label} role disabled.`,
  });

  revalidateAdministrationRoutes();

  return updated;
}

export async function updateRolePermissions(input: {
  permissionIds: string[];
  reason?: string | null;
  roleId: string;
}) {
  await requirePermission("admin.permissions.assign");
  const actor = await getCurrentUser();

  if (!actor) {
    throw new Error("An authenticated user is required.");
  }

  const role = await prisma.role.findUnique({
    where: {
      id: input.roleId,
    },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    throw new Error("Role not found.");
  }

  const permissions = await prisma.permission.findMany({
    where: {
      id: {
        in: input.permissionIds,
      },
      isSystem: true,
    },
  });

  if (permissions.length !== input.permissionIds.length) {
    throw new Error("Only system-defined permissions can be assigned to roles.");
  }

  const nextPermissionIds = new Set(permissions.map((permission) => permission.id));
  const nextPermissionKeys = new Set(permissions.map((permission) => permission.key));
  await assertAdministrationPathRetained({
    rolePermissionOverrides: new Map([[role.id, nextPermissionKeys]]),
  });

  const previousPermissionsById = new Map(
    role.rolePermissions.map((rolePermission) => [
      rolePermission.permissionId,
      rolePermission.permission,
    ]),
  );
  const addedPermissions = permissions.filter(
    (permission) => !previousPermissionsById.has(permission.id),
  );
  const removedPermissions = role.rolePermissions
    .map((rolePermission) => rolePermission.permission)
    .filter((permission) => !nextPermissionIds.has(permission.id));

  await prisma.$transaction(async (transaction) => {
    await transaction.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: {
          notIn: Array.from(nextPermissionIds),
        },
      },
    });

    for (const permission of permissions) {
      await transaction.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          permissionId: permission.id,
          roleId: role.id,
        },
      });
    }
  });

  for (const permission of addedPermissions) {
    await recordAuditEvent({
      action: "admin.role.permission_assigned",
      actorUserId: actor.id,
      entityId: role.id,
      entityType: "Role",
      metadata: {
        permissionId: permission.id,
      },
      summary: `${permission.key} assigned to ${role.label}.`,
    });
  }

  for (const permission of removedPermissions) {
    await recordAuditEvent({
      action: "admin.role.permission_removed",
      actorUserId: actor.id,
      entityId: role.id,
      entityType: "Role",
      metadata: {
        permissionId: permission.id,
      },
      summary: `${permission.key} removed from ${role.label}.`,
    });
  }

  revalidateAdministrationRoutes();
}

export async function assignRoleToUser(input: {
  reason?: string | null;
  roleId: string;
  unitId?: string | null;
  userId: string;
}) {
  const actor = await requirePermission("admin.users.manage");
  const role = await prisma.role.findUnique({
    where: {
      id: input.roleId,
    },
  });
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
  });

  if (!role) {
    throw new Error("Role not found.");
  }

  if (!role.isActive) {
    throw new Error("Disabled roles cannot be assigned.");
  }

  if (!user) {
    throw new Error("User not found.");
  }

  const unitId = normalizeOptionalId(input.unitId) ?? null;

  const existing = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: role.id,
      unitId,
      isActive: true,
    },
  });

  if (existing) {
    throw new Error("That role is already assigned with the selected scope.");
  }

  const assignment = await prisma.userRole.create({
    data: {
      roleId: role.id,
      unitId,
      userId: user.id,
    },
    include: {
      unit: true,
    },
  });

  await recordAuditEvent({
    action: "admin.user.role_assigned",
    actorUserId: actor.id,
    entityId: assignment.id,
    entityType: "UserRole",
    metadata: {
      roleId: role.id,
      unitId: assignment.unitId,
      userId: user.id,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `${role.label} assigned to ${user.displayName ?? user.email ?? "user"}${assignment.unit ? ` for ${assignment.unit.name}` : ""}.`,
  });

  revalidateAdministrationRoutes();

  return assignment;
}

export async function removeRoleFromUser(input: {
  reason?: string | null;
  userRoleId: string;
}) {
  const actor = await requirePermission("admin.users.manage");
  const assignment = await prisma.userRole.findUnique({
    where: {
      id: input.userRoleId,
    },
    include: {
      role: true,
      unit: true,
      user: true,
    },
  });

  if (!assignment) {
    throw new Error("Role assignment not found.");
  }

  if (!assignment.isActive) {
    return assignment;
  }

  await assertAdministrationPathRetained({
    inactiveUserRoleIds: new Set([assignment.id]),
  });

  const updated = await prisma.userRole.update({
    where: {
      id: assignment.id,
    },
    data: {
      endsAt: new Date(),
      isActive: false,
    },
  });

  await recordAuditEvent({
    action: "admin.user.role_removed",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "UserRole",
    metadata: {
      roleId: assignment.roleId,
      unitId: assignment.unitId,
      userId: assignment.userId,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `${assignment.role.label} removed from ${assignment.user.displayName ?? assignment.user.email ?? "user"}${assignment.unit ? ` for ${assignment.unit.name}` : ""}.`,
  });

  revalidateAdministrationRoutes();

  return updated;
}

export async function getAdministrationCriticalPermissionKeys() {
  await Promise.all([
    requirePermission("admin.permissions.view"),
    requirePermission("admin.roles.view"),
  ]);

  return [...criticalAdministrationPermissionKeys];
}
