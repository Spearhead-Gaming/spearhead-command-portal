import { listRolesWithPermissions, listSystemPermissions } from "@/server/database/repositories";

export async function getPermissionCatalog() {
  return listSystemPermissions();
}

export async function getRoleCatalog() {
  // This remains a read-only placeholder until role management workflows land.
  return listRolesWithPermissions();
}
