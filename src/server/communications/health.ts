import { prisma } from "@/server/database/client";
import { getCommunicationDomainDefinitions } from "@/server/communications/domains";

export type CommunicationPlatformOverview = {
  domains: Array<{
    defaultMappingKey: string;
    description: string;
    domain: string;
    label: string;
    mappedGuildCount: number;
    missingGuildCount: number;
  }>;
  health: {
    failedDeliveries: number;
    missingDomainMappings: number;
    pendingDeliveries: number;
    queueDepth: number;
    retryBacklog: number;
    totalDomains: number;
  };
  recentDeliveries: Array<{
    channelType: string;
    communicationTitle: string;
    destinationKey: string;
    errorMessage: string | null;
    id: string;
    providerId: string;
    status: string;
    updatedAtLabel: string;
  }>;
  recentHistory: Array<{
    category: string;
    createdAtLabel: string;
    deliveryCount: number;
    id: string;
    status: string;
    title: string;
    type: string;
  }>;
};

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

export async function getCommunicationPlatformOverview(): Promise<CommunicationPlatformOverview> {
  const [servers, deliveries, communications] = await Promise.all([
    prisma.discordServer.findMany({
      where: {
        isActive: true,
        status: {
          not: "archived",
        },
      },
      include: {
        channelMappings: {
          where: {
            isActive: true,
          },
        },
      },
    }),
    prisma.communicationDelivery.findMany({
      include: {
        communication: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 20,
    }),
    prisma.communication.findMany({
      include: {
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
  ]);
  const domains = getCommunicationDomainDefinitions().map((domain) => {
    const mappedGuildCount = servers.filter((server) =>
      server.channelMappings.some((mapping) => mapping.key === domain.defaultMappingKey),
    ).length;

    return {
      defaultMappingKey: domain.defaultMappingKey,
      description: domain.description,
      domain: domain.domain,
      label: domain.label,
      mappedGuildCount,
      missingGuildCount: Math.max(servers.length - mappedGuildCount, 0),
    };
  });
  const failedDeliveries = deliveries.filter((delivery) => delivery.status === "failed").length;
  const pendingDeliveries = deliveries.filter((delivery) =>
    ["pending", "processing", "queued", "retrying"].includes(delivery.status),
  ).length;
  const retryBacklog = deliveries.filter((delivery) => delivery.status === "retrying").length;

  return {
    domains,
    health: {
      failedDeliveries,
      missingDomainMappings: domains.reduce((total, domain) => total + domain.missingGuildCount, 0),
      pendingDeliveries,
      queueDepth: pendingDeliveries,
      retryBacklog,
      totalDomains: domains.length,
    },
    recentDeliveries: deliveries.map((delivery) => ({
      channelType: delivery.channelType,
      communicationTitle: delivery.communication.title,
      destinationKey: delivery.destinationKey,
      errorMessage: delivery.errorMessage,
      id: delivery.id,
      providerId: delivery.providerId,
      status: delivery.status,
      updatedAtLabel: formatTimestamp(delivery.updatedAt),
    })),
    recentHistory: communications.map((communication) => ({
      category: communication.category,
      createdAtLabel: formatTimestamp(communication.createdAt),
      deliveryCount: communication._count.deliveries,
      id: communication.id,
      status: communication.status,
      title: communication.title,
      type: communication.type,
    })),
  };
}
