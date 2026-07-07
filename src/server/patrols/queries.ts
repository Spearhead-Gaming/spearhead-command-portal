import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import { patrolStatusCatalog, patrolTypeCatalog } from "@/server/database/catalogs";
import { prisma } from "@/server/database/client";
import { getMemberDisplayName } from "@/server/personnel";
import { can } from "@/server/permissions/access";
import { getAarStatusLabel } from "@/server/s3/utils";
import type { PatrolDashboardData, PatrolListItem, PatrolReferenceData } from "@/server/patrols/types";

type PatrolRecord = Prisma.EventGetPayload<{
  include: {
    aars: {
      include: {
        attachments: true;
      };
      where: {
        deletedAt: null;
      };
    };
    campaign: true;
    patrolLeader: true;
    patrolParticipants: {
      include: {
        memberProfile: {
          include: {
            currentUnit: true;
            user: true;
          };
        };
      };
    };
    patrolRsvps: {
      include: {
        memberProfile: {
          include: {
            user: true;
          };
        };
        user: true;
      };
    };
  };
}>;

function getPatrolTypeLabel(value: string | null) {
  return patrolTypeCatalog.find((entry) => entry.key === value)?.label ?? "Other";
}

function getPatrolStatusLabel(value: string | null) {
  return patrolStatusCatalog.find((entry) => entry.key === value)?.label ?? "Planning";
}

function getUserLabel(user?: { displayName: string | null; email: string | null; name: string | null } | null) {
  return user?.displayName ?? user?.name ?? user?.email ?? null;
}

function getCurrentDeploymentWeek(campaign: {
  deploymentWeeks?: Array<{ endsAt: Date | null; startsAt: Date | null; weekNumber: number }>;
  startsAt: Date | null;
} | null) {
  if (!campaign) {
    return 1;
  }

  const now = new Date();
  const matchedWeek = campaign.deploymentWeeks?.find((week) =>
    week.startsAt && week.endsAt ? week.startsAt <= now && week.endsAt >= now : false,
  );

  if (matchedWeek) {
    return matchedWeek.weekNumber;
  }

  if (campaign.startsAt) {
    return Math.max(1, Math.floor((now.getTime() - campaign.startsAt.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1);
  }

  return 1;
}

function mapPatrol(record: PatrolRecord): PatrolListItem {
  const latestAar =
    [...record.aars].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
  const hasMapScreenshot =
    latestAar?.attachments.some((attachment) => attachment.attachmentType === "map_screenshot") ?? false;
  const patrolStatus =
    record.patrolStatus ??
    (record.status === "completed" && !latestAar ? "awaiting-aar" : record.status === "completed" ? "completed" : "planning");

  return {
    aarStatusLabel: latestAar ? getAarStatusLabel(latestAar.status) : record.endsAt ? "AAR Required" : "Not due yet",
    campaign: record.campaign
      ? {
          id: record.campaign.id,
          title: record.campaign.title,
        }
      : null,
    deploymentWeek: record.deploymentWeek,
    description: record.description,
    endsAt: record.endsAt,
    estimatedDurationMinutes: record.estimatedDurationMinutes,
    hasMapScreenshot,
    id: record.id,
    interestedCount: record.patrolRsvps.filter((rsvp) => rsvp.status === "interested").length,
    latestAar: latestAar
      ? {
          id: latestAar.id,
          nextVersionRecommendation: latestAar.aarNextVersionRecommendation,
          progressionNotes: latestAar.aarProgressionNotes,
          status: latestAar.status,
          statusLabel: getAarStatusLabel(latestAar.status),
        }
      : null,
    leaderName: getUserLabel(record.patrolLeader),
    participantCount: record.patrolParticipants.length,
    participants: record.patrolParticipants.map((participant) => ({
      id: participant.id,
      memberProfileId: participant.memberProfileId,
      name: getMemberDisplayName(participant.memberProfile),
      unitLabel: participant.memberProfile.currentUnit?.shortName ?? null,
    })),
    patrolCallsign: record.patrolCallsign,
    patrolStatus,
    patrolStatusLabel: getPatrolStatusLabel(patrolStatus),
    patrolType: record.patrolType,
    patrolTypeLabel: getPatrolTypeLabel(record.patrolType),
    rsvps: record.patrolRsvps.map((rsvp) => ({
      id: rsvp.id,
      name:
        (rsvp.memberProfile ? getMemberDisplayName(rsvp.memberProfile) : null) ??
        getUserLabel(rsvp.user) ??
        rsvp.discordUserId ??
        "Interested member",
      status: rsvp.status,
    })),
    startsAt: record.startsAt,
    title: record.title,
  };
}

function canViewPatrols(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return can(user, "patrols.view") || can(user, "events.view");
}

export async function getPatrolReferenceData(): Promise<PatrolReferenceData> {
  const user = await getCurrentUser();

  if (!user || !canViewPatrols(user)) {
    throw new Error("You do not have permission to view patrols.");
  }

  const [deployments, members] = await Promise.all([
    prisma.campaign.findMany({
      where: {
        deletedAt: null,
        status: {
          not: "archived",
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: {
        deploymentWeeks: true,
      },
    }),
    prisma.memberProfile.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        currentUnit: true,
        user: true,
      },
      orderBy: [{ displayName: "asc" }],
      take: 500,
    }),
  ]);
  const currentDeployment = deployments.find((deployment) => deployment.status === "active") ?? deployments[0] ?? null;

  return {
    currentDeploymentId: currentDeployment?.id ?? null,
    currentWeek: getCurrentDeploymentWeek(currentDeployment),
    deployments: deployments.map((deployment) => ({
      id: deployment.id,
      label: deployment.title,
      status: deployment.status,
    })),
    members: members.map((member) => ({
      id: member.id,
      label: getMemberDisplayName(member),
      unitLabel: member.currentUnit?.shortName ?? null,
    })),
    patrolTypes: [...patrolTypeCatalog],
  };
}

export async function listPatrolDashboard(): Promise<PatrolDashboardData> {
  const user = await getCurrentUser();

  if (!user || !canViewPatrols(user)) {
    throw new Error("You do not have permission to view patrols.");
  }

  const patrols = await prisma.event.findMany({
    where: {
      deletedAt: null,
      eventType: "patrol",
    },
    include: {
      aars: {
        where: {
          deletedAt: null,
        },
        include: {
          attachments: true,
        },
      },
      campaign: true,
      patrolLeader: true,
      patrolParticipants: {
        include: {
          memberProfile: {
            include: {
              currentUnit: true,
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      patrolRsvps: {
        include: {
          memberProfile: {
            include: {
              user: true,
            },
          },
          user: true,
        },
        orderBy: {
          respondedAt: "desc",
        },
      },
    },
    orderBy: [{ startsAt: "desc" }],
    take: 100,
  });
  const mapped = patrols.map(mapPatrol);
  const activePatrols = mapped.filter((patrol) => patrol.patrolStatus === "running");
  const awaitingAar = mapped.filter((patrol) => patrol.patrolStatus === "awaiting-aar");
  const awaitingReview = mapped.filter((patrol) =>
    patrol.latestAar ? ["pending-map", "submitted"].includes(patrol.latestAar.status) : false,
  );
  const completedPatrols = mapped.filter((patrol) =>
    ["completed", "reviewed", "archived", "aar-submitted"].includes(patrol.patrolStatus),
  );

  return {
    activePatrols,
    awaitingAar,
    awaitingReview,
    completedPatrols,
    patrols: mapped,
    summary: {
      active: activePatrols.length,
      awaitingAar: awaitingAar.length,
      awaitingReview: awaitingReview.length,
      completed: completedPatrols.length,
    },
  };
}
