import { redirect } from "next/navigation";

import type { PortalPermissionGrant, PortalUser } from "@/features/auth/types";
import { getCurrentUser } from "@/server/auth/current-user";

export type PermissionScope = {
  unitId?: string | null;
};

function isScopeMatch(
  grant: PortalPermissionGrant,
  scope?: PermissionScope,
) {
  if (!scope?.unitId) {
    return true;
  }

  return grant.unitId === null || grant.unitId === scope.unitId;
}

export function hasAllPermissions(
  grantedPermissions: readonly string[],
  requiredPermissions: readonly string[],
) {
  return requiredPermissions.every((permission) =>
    grantedPermissions.includes(permission),
  );
}

export function can(
  user: Pick<PortalUser, "permissionGrants"> | null,
  permissionKey: string,
  scope?: PermissionScope,
) {
  if (!user) {
    return false;
  }

  return user.permissionGrants.some(
    (grant) => grant.key === permissionKey && isScopeMatch(grant, scope),
  );
}

export async function getCurrentUserPermissions() {
  const user = await getCurrentUser();

  return user?.permissionGrants ?? [];
}

export async function requirePermission(
  permissionKey: string,
  scope?: PermissionScope,
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/unauthorized");
  }

  if (!can(user, permissionKey, scope)) {
    redirect("/forbidden");
  }

  return user;
}
