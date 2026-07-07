import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/database/client";
import { createNotification } from "@/server/notifications/service";
import { recordAuditEvent } from "@/server/services/audit-log-service";
import {
  getDiscordChannelMappingDefinition,
  isDiscordChannelMappingKey,
  isDiscordRoleMappingType,
} from "@/server/discord/constants";
import { sendDiscordNotificationPlaceholder } from "@/server/discord/delivery/provider";
import { buildStaffAlertDiscordMessage } from "@/server/discord/messages/builders";
import type {
  UpsertDiscordChannelMappingInput,
  UpsertDiscordRoleMappingInput,
  UpsertDiscordServerMappingInput,
} from "@/server/discord/types";

function normalizeRequiredString(value: string, fieldLabel: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
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

function revalidateDiscordSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/administration");
  revalidatePath("/administration/discord");
}

function toFriendlyPrismaError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new Error("That Discord mapping conflicts with an existing record.");
  }

  return error;
}

export async function listDiscordServers() {
  return prisma.discordServer.findMany({
    include: {
      unit: {
        select: {
          id: true,
          name: true,
          shortName: true,
        },
      },
      _count: {
        select: {
          channelMappings: true,
        },
      },
    },
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function listDiscordChannelMappings() {
  return prisma.discordChannelMapping.findMany({
    include: {
      discordServer: {
        include: {
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      notificationDeliveries: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          status: true,
          updatedAt: true,
        },
        take: 1,
      },
    },
    orderBy: [
      {
        key: "asc",
      },
      {
        discordServer: {
          name: "asc",
        },
      },
    ],
  });
}

export async function listDiscordRoleMappings() {
  return prisma.discordRoleMapping.findMany({
    include: {
      discordServer: true,
      qualification: {
        select: {
          id: true,
          label: true,
        },
      },
      rank: {
        select: {
          abbreviation: true,
          id: true,
          label: true,
        },
      },
      role: {
        select: {
          id: true,
          label: true,
        },
      },
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      {
        discordServer: {
          name: "asc",
        },
      },
      {
        mappingType: "asc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });
}

export async function upsertDiscordServerMapping(input: UpsertDiscordServerMappingInput) {
  const payload = {
    guildId: normalizeRequiredString(input.guildId, "Guild ID"),
    isActive: input.isActive,
    isPrimary: input.isPrimary,
    name: normalizeRequiredString(input.name, "Server name"),
    unitId: normalizeOptionalId(input.unitId),
  };

  try {
    const existing = input.id
      ? await prisma.discordServer.findUnique({
          where: {
            id: input.id,
          },
        })
      : null;

    const server = await prisma.$transaction(async (transaction) => {
      if (payload.isPrimary) {
        await transaction.discordServer.updateMany({
          data: {
            isPrimary: false,
          },
          where: {
            NOT: input.id
              ? {
                  id: input.id,
                }
              : undefined,
          },
        });
      }

      if (existing) {
        return transaction.discordServer.update({
          where: {
            id: existing.id,
          },
          data: payload,
        });
      }

      return transaction.discordServer.create({
        data: payload,
      });
    });

    await recordAuditEvent({
      action: existing ? "discord.server.mapping.updated" : "discord.server.mapped",
      actorUserId: input.actorUserId,
      entityId: server.id,
      entityType: "DiscordServer",
      newValue: payload,
      oldValue: existing
        ? {
            guildId: existing.guildId,
            isActive: existing.isActive,
            isPrimary: existing.isPrimary,
            name: existing.name,
            unitId: existing.unitId,
          }
        : undefined,
      summary: existing
        ? `${server.name} Discord server mapping was updated.`
        : `${server.name} Discord server mapping was created.`,
    });

    revalidateDiscordSurfaces();

    return server;
  } catch (error) {
    throw toFriendlyPrismaError(error);
  }
}

export async function upsertDiscordChannelMapping(input: UpsertDiscordChannelMappingInput) {
  const key = normalizeRequiredString(input.key, "Mapping type");

  if (!isDiscordChannelMappingKey(key)) {
    throw new Error("Select a valid Discord channel mapping type.");
  }

  const payload = {
    channelId: normalizeRequiredString(input.channelId, "Channel ID"),
    description: normalizeOptionalString(input.description),
    discordServerId: normalizeRequiredString(input.discordServerId, "Discord server"),
    isActive: input.isActive,
    key,
  };

  try {
    const existing = input.id
      ? await prisma.discordChannelMapping.findUnique({
          where: {
            id: input.id,
          },
        })
      : null;
    const mapping = existing
      ? await prisma.discordChannelMapping.update({
          where: {
            id: existing.id,
          },
          data: payload,
        })
      : await prisma.discordChannelMapping.create({
          data: payload,
        });
    const mappingDefinition = getDiscordChannelMappingDefinition(mapping.key);

    await recordAuditEvent({
      action: existing ? "discord.channel.mapping.updated" : "discord.channel.mapped",
      actorUserId: input.actorUserId,
      entityId: mapping.id,
      entityType: "DiscordChannelMapping",
      newValue: payload,
      oldValue: existing
        ? {
            channelId: existing.channelId,
            description: existing.description,
            discordServerId: existing.discordServerId,
            isActive: existing.isActive,
            key: existing.key,
          }
        : undefined,
      summary: existing
        ? `${mappingDefinition?.label ?? mapping.key} channel mapping was updated.`
        : `${mappingDefinition?.label ?? mapping.key} channel mapping was created.`,
    });

    revalidateDiscordSurfaces();

    return mapping;
  } catch (error) {
    throw toFriendlyPrismaError(error);
  }
}

function normalizeRoleMappingReference(input: UpsertDiscordRoleMappingInput) {
  const mappingType = normalizeRequiredString(input.mappingType, "Role mapping type");

  if (!isDiscordRoleMappingType(mappingType)) {
    throw new Error("Select a valid Discord role mapping type.");
  }

  const payload = {
    description: normalizeOptionalString(input.description),
    discordRoleId: normalizeRequiredString(input.discordRoleId, "Discord role ID"),
    discordRoleName: normalizeOptionalString(input.discordRoleName),
    discordServerId: normalizeRequiredString(input.discordServerId, "Discord server"),
    isActive: input.isActive,
    mappingType,
    qualificationId: null as string | null,
    rankId: null as string | null,
    roleId: null as string | null,
    unitId: null as string | null,
  };

  if (mappingType === "unit") {
    payload.unitId = normalizeOptionalId(input.unitId);

    if (!payload.unitId) {
      throw new Error("Select a unit for this Discord role mapping.");
    }
  }

  if (mappingType === "qualification") {
    payload.qualificationId = normalizeOptionalId(input.qualificationId);

    if (!payload.qualificationId) {
      throw new Error("Select a qualification for this Discord role mapping.");
    }
  }

  if (mappingType === "portal_role") {
    payload.roleId = normalizeOptionalId(input.roleId);

    if (!payload.roleId) {
      throw new Error("Select a portal role for this Discord role mapping.");
    }
  }

  if (mappingType === "rank") {
    payload.rankId = normalizeOptionalId(input.rankId);

    if (!payload.rankId) {
      throw new Error("Select a rank for this Discord role mapping.");
    }
  }

  return payload;
}

export async function upsertDiscordRoleMapping(input: UpsertDiscordRoleMappingInput) {
  const payload = normalizeRoleMappingReference(input);

  try {
    const existing = input.id
      ? await prisma.discordRoleMapping.findUnique({
          where: {
            id: input.id,
          },
        })
      : null;
    const mapping = existing
      ? await prisma.discordRoleMapping.update({
          where: {
            id: existing.id,
          },
          data: payload,
        })
      : await prisma.discordRoleMapping.create({
          data: payload,
        });

    await recordAuditEvent({
      action: existing ? "discord.role.mapping.updated" : "discord.role.mapping.created",
      actorUserId: input.actorUserId,
      entityId: mapping.id,
      entityType: "DiscordRoleMapping",
      newValue: payload,
      oldValue: existing
        ? {
            description: existing.description,
            discordRoleId: existing.discordRoleId,
            discordRoleName: existing.discordRoleName,
            discordServerId: existing.discordServerId,
            isActive: existing.isActive,
            mappingType: existing.mappingType,
            qualificationId: existing.qualificationId,
            rankId: existing.rankId,
            roleId: existing.roleId,
            unitId: existing.unitId,
          }
        : undefined,
      summary: existing
        ? "Discord role mapping updated."
        : "Discord role mapping created.",
    });

    revalidateDiscordSurfaces();

    return mapping;
  } catch (error) {
    throw toFriendlyPrismaError(error);
  }
}

export async function disableDiscordRoleMapping(input: {
  actorUserId: string;
  id: string;
}) {
  const existing = await prisma.discordRoleMapping.findUnique({
    where: {
      id: input.id,
    },
  });

  if (!existing) {
    throw new Error("Discord role mapping not found.");
  }

  const updated = await prisma.discordRoleMapping.update({
    where: {
      id: existing.id,
    },
    data: {
      isActive: false,
    },
  });

  await recordAuditEvent({
    action: "discord.role.mapping.disabled",
    actorUserId: input.actorUserId,
    entityId: updated.id,
    entityType: "DiscordRoleMapping",
    oldValue: {
      isActive: existing.isActive,
    },
    newValue: {
      isActive: updated.isActive,
    },
    summary: "Discord role mapping disabled.",
  });

  revalidateDiscordSurfaces();

  return updated;
}

export async function disableDiscordChannelMapping(input: {
  actorUserId: string;
  id: string;
}) {
  const existing = await prisma.discordChannelMapping.findUnique({
    where: {
      id: input.id,
    },
  });

  if (!existing) {
    throw new Error("Discord channel mapping not found.");
  }

  const updated = await prisma.discordChannelMapping.update({
    where: {
      id: existing.id,
    },
    data: {
      isActive: false,
    },
  });

  await recordAuditEvent({
    action: "discord.channel.mapping.disabled",
    actorUserId: input.actorUserId,
    entityId: updated.id,
    entityType: "DiscordChannelMapping",
    oldValue: {
      isActive: existing.isActive,
    },
    newValue: {
      isActive: updated.isActive,
    },
    summary: `${updated.key} channel mapping was disabled.`,
  });

  revalidateDiscordSurfaces();

  return updated;
}

export async function testDiscordChannelDeliveryPlaceholder(input: {
  actorUserId: string;
  mappingId: string;
}) {
  const mapping = await prisma.discordChannelMapping.findUnique({
    where: {
      id: input.mappingId,
    },
    include: {
      discordServer: true,
    },
  });

  if (!mapping) {
    throw new Error("Discord channel mapping not found.");
  }

  const message = buildStaffAlertDiscordMessage({
    alertTitle: "Discord delivery test",
    summary: `Discord delivery test for ${mapping.key} on ${mapping.discordServer.name}. This verifies portal routing, audit logging, delivery tracking, and live Discord posting when bot credentials are configured.`,
  });
  const notification = await createNotification({
    createdByUserId: input.actorUserId,
    message: message.body,
    metadata: {
      mappingId: mapping.id,
      mappingKey: mapping.key,
      placeholder: true,
    },
    targetUnitId: mapping.discordServer.unitId ?? null,
    title: `${message.title}: ${mapping.discordServer.name}`,
    type: "event.published",
    urgency: "info",
  });

  await recordAuditEvent({
    action: "discord.delivery.test_requested",
    actorUserId: input.actorUserId,
    entityId: mapping.id,
    entityType: "DiscordChannelMapping",
    metadata: {
      notificationId: notification.id,
      serverId: mapping.discordServerId,
    },
    summary: `A placeholder Discord delivery test was requested for ${mapping.key}.`,
  });

  const delivery = await sendDiscordNotificationPlaceholder({
    actorUserId: input.actorUserId,
    mappingId: mapping.id,
    notificationId: notification.id,
    payload: message,
    unitId: mapping.discordServer.unitId,
  });

  revalidateDiscordSurfaces();

  return delivery;
}
