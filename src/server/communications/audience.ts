import { prisma } from "@/server/database/client";
import type { CommunicationAudience, ResolvedCommunicationAudience } from "@/server/communications/types";

export async function resolveCommunicationAudience(
  audiences: CommunicationAudience[],
): Promise<ResolvedCommunicationAudience> {
  const userIds = new Set<string>();
  const discordChannelMappings: ResolvedCommunicationAudience["discordChannelMappings"] = [];

  for (const audience of audiences) {
    if (audience.type === "users") {
      audience.userIds.forEach((userId) => userIds.add(userId));
    }

    if (audience.type === "unit") {
      const profiles = await prisma.memberProfile.findMany({
        where: {
          currentUnitId: audience.unitId,
          deletedAt: null,
          isActive: true,
          userId: {
            not: null,
          },
        },
        select: {
          userId: true,
        },
      });

      profiles.forEach((profile) => {
        if (profile.userId) {
          userIds.add(profile.userId);
        }
      });
    }

    if (audience.type === "permission") {
      const grants = await prisma.userRole.findMany({
        where: {
          isActive: true,
          role: {
            isActive: true,
            rolePermissions: {
              some: {
                permission: {
                  key: audience.permissionKey,
                },
              },
            },
          },
        },
        select: {
          userId: true,
        },
      });

      grants.forEach((grant) => userIds.add(grant.userId));
    }

    if (audience.type === "all_active_members") {
      const profiles = await prisma.memberProfile.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          userId: {
            not: null,
          },
        },
        select: {
          userId: true,
        },
      });

      profiles.forEach((profile) => {
        if (profile.userId) {
          userIds.add(profile.userId);
        }
      });
    }

    if (audience.type === "s3_staff") {
      const grants = await prisma.userRole.findMany({
        where: {
          isActive: true,
          role: {
            isActive: true,
            rolePermissions: {
              some: {
                permission: {
                  key: "s3.dashboard.view",
                },
              },
            },
          },
        },
        select: {
          userId: true,
        },
      });

      grants.forEach((grant) => userIds.add(grant.userId));
    }

    if (audience.type === "command_staff") {
      const grants = await prisma.userRole.findMany({
        where: {
          isActive: true,
          role: {
            isActive: true,
            rolePermissions: {
              some: {
                permission: {
                  key: "operations.command.view",
                },
              },
            },
          },
        },
        select: {
          userId: true,
        },
      });

      grants.forEach((grant) => userIds.add(grant.userId));
    }

    if (audience.type === "discord_channel") {
      discordChannelMappings.push({
        mappingKey: audience.mappingKey,
        unitIds: audience.unitIds,
      });
    }
  }

  return {
    discordChannelMappings,
    userIds: Array.from(userIds),
  };
}
