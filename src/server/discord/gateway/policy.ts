import { prisma } from "@/server/database/client";

export type DiscordGatewayGuildPolicy = {
  discordServerId: string | null;
  eventSyncEnabled: boolean;
  guildId: string;
  guildType: string | null;
  isManaged: boolean;
  isPrimaryCommunity: boolean;
  memberSyncEnabled: boolean;
  messageAttachmentContinuationEnabled: boolean;
  profileCreationEnabled: boolean;
  roleObservationEnabled: boolean;
  status: "managed" | "inactive" | "unmanaged" | "test";
  unitId: string | null;
  voiceAwarenessEnabled: boolean;
};

export async function resolveGatewayGuildPolicy(guildId: string | null): Promise<DiscordGatewayGuildPolicy> {
  if (!guildId) {
    return {
      discordServerId: null,
      eventSyncEnabled: false,
      guildId: "global",
      guildType: null,
      isManaged: false,
      isPrimaryCommunity: false,
      memberSyncEnabled: false,
      messageAttachmentContinuationEnabled: false,
      profileCreationEnabled: false,
      roleObservationEnabled: false,
      status: "unmanaged",
      unitId: null,
      voiceAwarenessEnabled: false,
    };
  }

  const server = await prisma.discordServer.findUnique({
    where: {
      guildId,
    },
  });

  if (!server) {
    return {
      discordServerId: null,
      eventSyncEnabled: false,
      guildId,
      guildType: null,
      isManaged: false,
      isPrimaryCommunity: false,
      memberSyncEnabled: false,
      messageAttachmentContinuationEnabled: false,
      profileCreationEnabled: false,
      roleObservationEnabled: false,
      status: "unmanaged",
      unitId: null,
      voiceAwarenessEnabled: false,
    };
  }

  const isActive = server.isActive && !server.archivedAt && server.status !== "archived";
  const isPrimaryCommunity = server.isPrimary || server.guildType === "community";

  return {
    discordServerId: server.id,
    eventSyncEnabled: isActive,
    guildId,
    guildType: server.guildType,
    isManaged: isActive,
    isPrimaryCommunity,
    memberSyncEnabled: isActive && server.memberSyncPolicy !== "disabled",
    messageAttachmentContinuationEnabled: isActive,
    profileCreationEnabled: isActive && isPrimaryCommunity && server.memberSyncPolicy !== "link_only",
    roleObservationEnabled: isActive,
    status: isActive ? "managed" : "inactive",
    unitId: server.unitId,
    voiceAwarenessEnabled: isActive && server.voiceAwarenessEnabled,
  };
}

