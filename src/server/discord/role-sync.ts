import { prisma } from "@/server/database/client";
import {
  addDiscordGuildRole,
  getDiscordGuildMemberRoleState,
  removeDiscordGuildRole,
} from "@/server/discord/automation/role-actions";
import type {
  DiscordRoleSyncMemberChange,
  DiscordRoleSyncPreview,
  DiscordRoleSyncRunResult,
} from "@/server/discord/types";
import { recordAuditEvent } from "@/server/services/audit-log-service";

type DiscordRoleMappingLabelRecord = {
  discordRoleId: string;
  discordRoleName: string | null;
  mappingType: string;
  qualification: {
    label: string;
  } | null;
  rank: {
    label: string;
  } | null;
  role: {
    label: string;
  } | null;
  unit: {
    name: string;
  } | null;
};

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function isUserRoleActive(roleAssignment: {
  endsAt: Date | null;
  isActive: boolean;
  role: {
    isActive: boolean;
  };
  startsAt: Date | null;
}) {
  if (!roleAssignment.isActive || !roleAssignment.role.isActive) {
    return false;
  }

  const now = Date.now();

  if (roleAssignment.startsAt && roleAssignment.startsAt.getTime() > now) {
    return false;
  }

  if (roleAssignment.endsAt && roleAssignment.endsAt.getTime() <= now) {
    return false;
  }

  return true;
}

function getManagedEntityLabel(mapping: DiscordRoleMappingLabelRecord) {
  switch (mapping.mappingType) {
    case "unit":
      return mapping.unit?.name ?? "Unmapped unit";
    case "qualification":
      return mapping.qualification?.label ?? "Unmapped qualification";
    case "portal_role":
      return mapping.role?.label ?? "Unmapped portal role";
    case "rank":
      return mapping.rank?.label ?? "Unmapped rank";
    default:
      return "Mapped Discord role";
  }
}

async function getManagedDiscordRoleMappings(discordServerId: string) {
  return prisma.discordRoleMapping.findMany({
    where: {
      discordServerId,
      isActive: true,
    },
    include: {
      discordServer: true,
      qualification: true,
      rank: true,
      role: true,
      unit: true,
    },
    orderBy: [
      {
        mappingType: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });
}

async function getRoleSyncCandidates(discordServerId: string) {
  const server = await prisma.discordServer.findUnique({
    where: {
      id: discordServerId,
    },
    select: {
      guildId: true,
      id: true,
      isActive: true,
      name: true,
      unitId: true,
    },
  });

  if (!server || !server.isActive) {
    throw new Error("Discord server mapping not found or inactive.");
  }

  const mappings = await getManagedDiscordRoleMappings(server.id);

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      discordId: {
        not: null,
      },
      isActive: true,
    },
    select: {
      callsign: true,
      discordId: true,
      displayName: true,
      email: true,
      id: true,
      memberProfile: {
        select: {
          currentRank: {
            select: {
              label: true,
            },
          },
          currentUnit: {
            select: {
              id: true,
              name: true,
            },
          },
          currentUnitId: true,
          displayName: true,
          id: true,
          qualifications: {
            where: {
              OR: [
                {
                  expiresAt: null,
                },
                {
                  expiresAt: {
                    gt: new Date(),
                  },
                },
              ],
              revokedAt: null,
              status: "qualified",
            },
            select: {
              qualificationId: true,
              qualification: {
                select: {
                  label: true,
                },
              },
            },
          },
          rankId: true,
        },
      },
      name: true,
      userRoles: {
        include: {
          role: {
            select: {
              id: true,
              isActive: true,
              label: true,
            },
          },
        },
      },
    },
  });

  return {
    mappings,
    server,
    users,
  };
}

async function buildRoleSyncPreview(input: {
  discordServerId: string;
  includeCurrentRoles: boolean;
}): Promise<{
  guildId: string;
  preview: DiscordRoleSyncPreview;
}> {
  const { mappings, server, users } = await getRoleSyncCandidates(input.discordServerId);
  const managedRoleIds = new Set(mappings.map((mapping) => mapping.discordRoleId));
  const changes: DiscordRoleSyncMemberChange[] = [];

  for (const user of users) {
    const discordUserId = user.discordId;

    if (!discordUserId) {
      continue;
    }

    const currentRoleState = input.includeCurrentRoles
      ? await getDiscordGuildMemberRoleState({
          discordUserId,
          guildId: server.guildId,
        })
      : {
          errorMessage: null,
          ok: true,
          roleIds: [],
        };
    const currentRoleIds = currentRoleState.roleIds.filter((roleId) => managedRoleIds.has(roleId));
    const activeRoleAssignments = user.userRoles.filter(isUserRoleActive);
    const qualificationIds = new Set(
      (user.memberProfile?.qualifications ?? []).map((record) => record.qualificationId),
    );
    const expectedMappings = mappings.filter((mapping) => {
      switch (mapping.mappingType) {
        case "unit":
          return Boolean(user.memberProfile?.currentUnitId && mapping.unitId === user.memberProfile.currentUnitId);
        case "qualification":
          return Boolean(mapping.qualificationId && qualificationIds.has(mapping.qualificationId));
        case "portal_role":
          return activeRoleAssignments.some(
            (assignment) =>
              assignment.roleId === mapping.roleId &&
              (assignment.unitId === null ||
                server.unitId === null ||
                assignment.unitId === server.unitId),
          );
        case "rank":
          return Boolean(user.memberProfile?.rankId && mapping.rankId === user.memberProfile.rankId);
        default:
          return false;
      }
    });
    const expectedRoleIds = expectedMappings.map((mapping) => mapping.discordRoleId);
    const addRoleIds = expectedMappings
      .filter((mapping) => !currentRoleIds.includes(mapping.discordRoleId))
      .map((mapping) => mapping.discordRoleId);
    const removeRoleIds = currentRoleIds.filter(
      (roleId) => !expectedRoleIds.includes(roleId),
    );

    if (addRoleIds.length === 0 && removeRoleIds.length === 0) {
      continue;
    }

    const mappingByRoleId = new Map(mappings.map((mapping) => [mapping.discordRoleId, mapping]));
    changes.push({
      addRoleIds,
      addRoleLabels: addRoleIds.map(
        (roleId) => mappingByRoleId.get(roleId)?.discordRoleName ?? roleId,
      ),
      currentRoleIds,
      currentRoleLabels: currentRoleIds.map(
        (roleId) => mappingByRoleId.get(roleId)?.discordRoleName ?? roleId,
      ),
      discordUserId,
      displayName:
        user.memberProfile?.displayName ??
        user.displayName ??
        user.name ??
        user.email ??
        "Unknown member",
      memberProfileId: user.memberProfile?.id ?? null,
      portalRoleLabels: activeRoleAssignments.map((assignment) => assignment.role.label),
      qualificationLabels: (user.memberProfile?.qualifications ?? []).map(
        (record) => record.qualification.label,
      ),
      rankLabel: user.memberProfile?.currentRank?.label ?? null,
      removeRoleIds,
      removeRoleLabels: removeRoleIds.map(
        (roleId) => mappingByRoleId.get(roleId)?.discordRoleName ?? roleId,
      ),
      unitLabel: user.memberProfile?.currentUnit?.name ?? null,
    });
  }

  return {
    guildId: server.guildId,
    preview: {
      changes,
      generatedAtLabel: formatTimestamp(new Date()),
      serverId: server.id,
      serverName: server.name,
      summary: {
        addOperations: changes.reduce((sum, change) => sum + change.addRoleIds.length, 0),
        membersEvaluated: users.length,
        removeOperations: changes.reduce((sum, change) => sum + change.removeRoleIds.length, 0),
        touchedMembers: changes.length,
      },
    },
  };
}

export async function getDiscordRoleSyncPreviewData(discordServerId: string) {
  const { preview } = await buildRoleSyncPreview({
    discordServerId,
    includeCurrentRoles: true,
  });

  return preview;
}

export async function previewDiscordRoleSync(input: {
  actorUserId: string;
  discordServerId: string;
}) {
  const preview = await getDiscordRoleSyncPreviewData(input.discordServerId);

  await recordAuditEvent({
    action: "discord.role_sync.preview_requested",
    actorUserId: input.actorUserId,
    entityId: preview.serverId,
    entityType: "DiscordServer",
    metadata: {
      addOperations: preview.summary.addOperations,
      removeOperations: preview.summary.removeOperations,
      touchedMembers: preview.summary.touchedMembers,
    },
    summary: `Discord role sync preview requested for ${preview.serverName}.`,
  });

  return preview;
}

export async function runDiscordRoleSync(input: {
  actorUserId: string;
  discordServerId: string;
}): Promise<DiscordRoleSyncRunResult> {
  const { guildId, preview } = await buildRoleSyncPreview({
    discordServerId: input.discordServerId,
    includeCurrentRoles: true,
  });

  const results: DiscordRoleSyncRunResult["results"] = [];

  for (const change of preview.changes) {
    const memberResult: DiscordRoleSyncRunResult["results"][number] = {
      addedRoleIds: [],
      addedRoleLabels: [],
      discordUserId: change.discordUserId,
      displayName: change.displayName,
      failedOperations: [],
      removedRoleIds: [],
      removedRoleLabels: [],
    };

    for (let index = 0; index < change.addRoleIds.length; index += 1) {
      const roleId = change.addRoleIds[index]!;
      const roleLabel = change.addRoleLabels[index] ?? roleId;
      const errorMessage = await addDiscordGuildRole({
        discordRoleId: roleId,
        discordUserId: change.discordUserId,
        guildId,
      });

      if (errorMessage) {
        memberResult.failedOperations.push({
          action: "add",
          errorMessage,
          roleId,
          roleLabel,
        });
      } else {
        memberResult.addedRoleIds.push(roleId);
        memberResult.addedRoleLabels.push(roleLabel);
      }
    }

    for (let index = 0; index < change.removeRoleIds.length; index += 1) {
      const roleId = change.removeRoleIds[index]!;
      const roleLabel = change.removeRoleLabels[index] ?? roleId;
      const errorMessage = await removeDiscordGuildRole({
        discordRoleId: roleId,
        discordUserId: change.discordUserId,
        guildId,
      });

      if (errorMessage) {
        memberResult.failedOperations.push({
          action: "remove",
          errorMessage,
          roleId,
          roleLabel,
        });
      } else {
        memberResult.removedRoleIds.push(roleId);
        memberResult.removedRoleLabels.push(roleLabel);
      }
    }

    if (
      memberResult.addedRoleIds.length > 0 ||
      memberResult.removedRoleIds.length > 0 ||
      memberResult.failedOperations.length > 0
    ) {
      results.push(memberResult);
    }
  }

  const failedOperations = results.reduce(
    (sum, result) => sum + result.failedOperations.length,
    0,
  );
  const summary = {
    addOperations: results.reduce((sum, result) => sum + result.addedRoleIds.length, 0),
    failedOperations,
    membersProcessed: results.length,
    removeOperations: results.reduce((sum, result) => sum + result.removedRoleIds.length, 0),
  };

  await recordAuditEvent({
    action: failedOperations > 0 ? "discord.role_sync.failed" : "discord.role_sync.run",
    actorUserId: input.actorUserId,
    entityId: preview.serverId,
    entityType: "DiscordServer",
    metadata: {
      addOperations: summary.addOperations,
      failedOperations: summary.failedOperations,
      membersProcessed: summary.membersProcessed,
      removeOperations: summary.removeOperations,
    },
    reason:
      failedOperations > 0
        ? "One or more Discord role sync operations failed."
        : null,
    summary: `Discord role sync ${failedOperations > 0 ? "completed with failures" : "completed"} for ${preview.serverName}.`,
  });

  return {
    results,
    serverId: preview.serverId,
    serverName: preview.serverName,
    summary,
  };
}

export function getDiscordRoleMappingLabel(input: DiscordRoleMappingLabelRecord) {
  return `${input.discordRoleName ?? input.discordRoleId} ← ${getManagedEntityLabel(input)}`;
}
