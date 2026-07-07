import { prisma } from "@/server/database/client";

export async function listSystemPermissions() {
  return prisma.permission.findMany({
    where: { isSystem: true },
    orderBy: [{ module: "asc" }, { key: "asc" }],
  });
}

export async function listRolesWithPermissions() {
  return prisma.role.findMany({
    orderBy: [{ label: "asc" }],
    include: {
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
    },
  });
}
