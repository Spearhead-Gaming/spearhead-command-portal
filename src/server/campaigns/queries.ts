import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import { campaignStatusCatalog } from "@/server/database/catalogs";
import { prisma } from "@/server/database/client";
import { can, requirePermission } from "@/server/permissions/access";
import {
  getAarStatusLabel,
  getConopStatusLabel,
  getMissionStatusLabel,
} from "@/server/s3/utils";
import type {
  CampaignDetail,
  CampaignFilters,
  CampaignListData,
  CampaignListItem,
  CampaignTimelineEvent,
  CampaignOperationalWeek,
  CampaignReferenceData,
  CampaignSummaryCard,
  DashboardCampaignWidgetData,
  UnitCampaignParticipationSummary,
} from "@/server/campaigns/types";
import {
  calculateAttendanceRate,
  getEventStatusLabel,
  getEventTypeLabel,
  getScopedUnitIds,
  noAccessWhere,
  normalizeFilterValue,
} from "@/server/events/utils";

type CampaignEventRecord = Prisma.EventGetPayload<{
  include: {
    hostUnit: true;
    conops: {
      where: {
        deletedAt: null;
      };
    };
    aars: {
      where: {
        deletedAt: null;
      };
    };
    attendanceRecords: {
      select: {
        rsvpStatus: true;
        finalStatus: true;
        lockedAt: true;
      };
    };
    weeklyTasking: {
      include: {
        unitTaskings: true;
      };
    };
  };
}>;

type CampaignRecord = Prisma.CampaignGetPayload<{
  include: {
    events: {
      include: {
        hostUnit: true;
        conops: {
          where: {
            deletedAt: null;
          };
        };
        aars: {
          where: {
            deletedAt: null;
          };
        };
        attendanceRecords: {
          select: {
            rsvpStatus: true;
            finalStatus: true;
            lockedAt: true;
          };
        };
        weeklyTasking: {
          include: {
            unitTaskings: true;
          };
        };
      };
    };
    deploymentWeeks: true;
    zeus: true;
  };
}>;

function getCampaignStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getEventAttendanceSummary(event: CampaignEventRecord) {
  const presentCount = event.attendanceRecords.filter((record) => record.finalStatus === "present").length;
  const absentCount = event.attendanceRecords.filter((record) => record.finalStatus === "absent").length;
  const lateCount = event.attendanceRecords.filter((record) => record.finalStatus === "late").length;
  const missingRsvpCount = event.attendanceRecords.filter((record) => record.rsvpStatus === null).length;

  return {
    attendanceLocked:
      event.attendanceRecords.length > 0 &&
      event.attendanceRecords.every((record) => record.lockedAt !== null),
    attendanceRate: calculateAttendanceRate({
      present: presentCount,
      late: lateCount,
      absent: absentCount,
    }),
    missingRsvpCount,
  };
}

function mapTimelineEvent(event: CampaignEventRecord) {
  const attendance = getEventAttendanceSummary(event);
  const latestConop =
    [...event.conops].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
  const latestAar =
    [...event.aars].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;

  return {
    id: event.id,
    title: event.title,
    eventType: event.eventType,
    eventTypeLabel: getEventTypeLabel(event.eventType),
    status: event.status,
    statusLabel: getEventStatusLabel(event.status),
    missionStatus: event.missionStatus,
    missionStatusLabel: getMissionStatusLabel(event.missionStatus),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    hostUnit: event.hostUnit
      ? {
          id: event.hostUnit.id,
          key: event.hostUnit.key,
          name: event.hostUnit.name,
          shortName: event.hostUnit.shortName,
        }
      : null,
    attendanceLocked: attendance.attendanceLocked,
    attendanceRate: attendance.attendanceRate,
    missingRsvpCount: attendance.missingRsvpCount,
    conopCount: event.conops.length,
    publishedConopCount: event.conops.filter((conop) => conop.status === "published").length,
    latestConopStatusLabel: latestConop ? getConopStatusLabel(latestConop.status) : null,
    aarCount: event.aars.length,
    reviewedAarCount: event.aars.filter((aar) => aar.status === "reviewed").length,
    latestAarStatusLabel: latestAar ? getAarStatusLabel(latestAar.status) : null,
    latestAarProgressionRecommendation: latestAar?.aarProgressionRecommendation ?? null,
    latestAarNextVersionRecommendation: latestAar?.aarNextVersionRecommendation ?? null,
    latestAarProgressionDecision: latestAar?.aarProgressionDecision ?? null,
    latestAarProgressionNotes: latestAar?.aarProgressionNotes ?? null,
    latestAarPlanningNotesNextWeek: latestAar?.aarPlanningNotesNextWeek ?? null,
    deploymentWeek: event.deploymentWeek,
    operationVersionLabel: event.operationVersionLabel,
    selectedOperationVersion: event.selectedOperationVersion,
    taskingStatus: event.weeklyTasking?.publishStatus ?? null,
    unitTaskingCount: event.weeklyTasking?.unitTaskings.length ?? 0,
  };
}

async function listActiveDeploymentUnits() {
  return prisma.unit.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      shortName: true,
    },
  });
}

function mapCampaign(
  record: CampaignRecord,
  activeDeploymentUnits: Awaited<ReturnType<typeof listActiveDeploymentUnits>>,
): CampaignListItem {
  const timeline = [...record.events]
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
    .map(mapTimelineEvent);
  const now = new Date();
  const nextEvent =
    timeline.find(
      (event) =>
        event.startsAt >= now &&
        !["cancelled", "archived"].includes(event.status),
    ) ?? null;
  const completedEvents = timeline.filter(
    (event) => event.status === "completed" || event.attendanceLocked,
  ).length;
  const upcomingEvents = timeline.filter(
    (event) =>
      event.startsAt >= now &&
      !["cancelled", "archived", "completed"].includes(event.status),
  ).length;
  const attendanceRates = timeline
    .map((event) => event.attendanceRate)
    .filter((value): value is number => value !== null);

  return {
    id: record.id,
    key: record.key,
    title: record.title,
    summary: record.summary,
    status: record.status,
    statusLabel: getCampaignStatusLabel(record.status),
    phase: record.phase,
    publishedAt: record.publishedAt,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    archivedAt: record.archivedAt,
    updatedAt: record.updatedAt,
    participatingUnits: activeDeploymentUnits,
    deploymentDurationWeeks: record.deploymentDurationWeeks,
    zeusAssignmentType: record.zeusAssignmentType,
    zeusUserId: record.zeusUserId,
    zeusName:
      record.zeusAssignmentType === "creator"
        ? "Deployment creator"
        : record.zeus?.displayName ?? record.zeus?.name ?? record.zeus?.email ?? null,
    nextEvent,
    totalEvents: timeline.length,
    completedEvents,
    upcomingEvents,
    progressPercent: timeline.length > 0 ? Math.round((completedEvents / timeline.length) * 100) : null,
    attendanceRate:
      attendanceRates.length > 0
        ? Math.round(
            attendanceRates.reduce((total, value) => total + value, 0) / attendanceRates.length,
          )
        : null,
  };
}

function getOperationalWeekStatus(events: CampaignTimelineEvent[]): Pick<CampaignOperationalWeek, "statusLabel" | "statusTone"> {
  if (events.length === 0) {
    return {
      statusLabel: "Planning",
      statusTone: "muted",
    };
  }

  if (events.every((event) => event.status === "completed" || event.attendanceLocked)) {
    return {
      statusLabel: "Completed",
      statusTone: "success",
    };
  }

  if (events.some((event) => event.status === "published")) {
    return {
      statusLabel: "Published",
      statusTone: "success",
    };
  }

  if (events.some((event) => event.taskingStatus === "published" || event.missionStatus === "approved")) {
    return {
      statusLabel: "Ready",
      statusTone: "info",
    };
  }

  return {
    statusLabel: "Planning",
    statusTone: "warning",
  };
}

function buildOperationalWeeks(
  timeline: CampaignTimelineEvent[],
  durationWeeks: number | null,
  deploymentWeeks: Array<{ weekNumber: number; planningStatus?: string }> = [],
): CampaignOperationalWeek[] {
  const maxEventWeek = timeline.reduce((max, event, index) => {
    const derivedWeek = event.deploymentWeek ?? index + 1;

    return Math.max(max, derivedWeek);
  }, 0);
  const maxStoredWeek = deploymentWeeks.reduce((max, week) => Math.max(max, week.weekNumber), 0);
  const weekCount = Math.max(durationWeeks ?? 0, maxStoredWeek, maxEventWeek, timeline.length > 0 ? 1 : 0);

  return Array.from({ length: weekCount }, (_, index) => {
    const weekNumber = index + 1;
    const events = timeline.filter((event, eventIndex) => (event.deploymentWeek ?? eventIndex + 1) === weekNumber);
    const weekendOperation =
      events.find((event) => event.eventType === "operation" || event.eventType === "campaign-event") ?? null;
    const patrols = events.filter((event) => event.eventType === "patrol");
    const taskingStatus = events.find((event) => event.taskingStatus)?.taskingStatus ?? null;
    const attendanceRates = events
      .map((event) => event.attendanceRate)
      .filter((value): value is number => value !== null);
    const status = getOperationalWeekStatus(events);
    const deploymentWeek = deploymentWeeks.find((week) => week.weekNumber === weekNumber);

    return {
      weekNumber,
      ...status,
      attendanceRate:
        attendanceRates.length > 0
          ? Math.round(attendanceRates.reduce((total, value) => total + value, 0) / attendanceRates.length)
          : null,
      discordStatusLabel: events.some((event) => event.status === "published") ? "Published" : "Pending",
      events,
      patrols,
      planningStatus: deploymentWeek?.planningStatus ?? "planning",
      taskingStatus,
      unitTaskingCount: events.reduce((total, event) => total + event.unitTaskingCount, 0),
      weekendOperation,
    };
  });
}

function buildCampaignWhere(filters: CampaignFilters, scopedUnitIds: string[] | null): Prisma.CampaignWhereInput {
  const q = normalizeFilterValue(filters.q);
  const status = normalizeFilterValue(filters.status);
  const unitId = normalizeFilterValue(filters.unitId);

  return {
    deletedAt: null,
    ...(status && campaignStatusCatalog.includes(status as (typeof campaignStatusCatalog)[number])
      ? { status }
      : {}),
    ...(scopedUnitIds
      ? {
          events: {
            some: {
              hostUnitId: {
                in: unitId
                  ? [unitId]
                  : scopedUnitIds.length > 0
                    ? scopedUnitIds
                    : noAccessWhere.in,
              },
            },
          },
        }
      : unitId
        ? {
            events: {
              some: {
                hostUnitId: unitId,
              },
            },
          }
        : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { key: { contains: q } },
            { summary: { contains: q } },
            { phase: { contains: q } },
          ],
        }
      : {}),
  };
}

export async function getCampaignReferenceData(): Promise<CampaignReferenceData> {
  const user = await requirePermission("campaigns.view");
  const scopedUnitIds = getScopedUnitIds(user, "campaigns.view");

  const [units, events] = await Promise.all([
    prisma.unit.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(scopedUnitIds
          ? {
              id: {
                in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
              },
            }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.event.findMany({
      where: {
        deletedAt: null,
        ...(scopedUnitIds
          ? {
              hostUnitId: {
                in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
              },
            }
          : {}),
      },
      include: {
        hostUnit: true,
        campaign: true,
      },
      orderBy: [{ startsAt: "desc" }],
    }),
  ]);

  return {
    statuses: campaignStatusCatalog.map((status) => ({
      key: status,
      label: getCampaignStatusLabel(status),
      description: `${getCampaignStatusLabel(status)} campaign state.`,
    })),
    units: units.map((unit) => ({
      id: unit.id,
      label: unit.name,
      key: unit.key,
      hint: unit.shortName,
    })),
    events: events.map((event) => ({
      id: event.id,
      label: event.title,
      hint: `${event.hostUnit?.shortName ?? "Unscoped"}${event.campaign ? ` / ${event.campaign.title}` : ""}`,
    })),
  };
}

export async function listCampaigns(filters: CampaignFilters = {}): Promise<CampaignListData> {
  const user = await requirePermission("campaigns.view");
  const scopedUnitIds = getScopedUnitIds(user, "campaigns.view");
  const records = await prisma.campaign.findMany({
    where: buildCampaignWhere(filters, scopedUnitIds),
    include: {
      events: {
        where: scopedUnitIds
          ? {
              hostUnitId: {
                in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
              },
            }
          : undefined,
        include: {
          hostUnit: true,
          conops: {
            where: {
              deletedAt: null,
            },
          },
          aars: {
            where: {
              deletedAt: null,
            },
          },
          attendanceRecords: {
            select: {
              rsvpStatus: true,
              finalStatus: true,
              lockedAt: true,
            },
          },
          weeklyTasking: {
            include: {
              unitTaskings: true,
            },
          },
        },
        orderBy: [{ startsAt: "asc" }],
      },
      deploymentWeeks: true,
      zeus: true,
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });

  const activeDeploymentUnits = await listActiveDeploymentUnits();
  const campaigns = records.map((record) => mapCampaign(record, activeDeploymentUnits));
  return {
    campaigns,
    groupedCampaigns: campaignStatusCatalog
      .map((status) => ({
        status,
        statusLabel: getCampaignStatusLabel(status),
        items: campaigns.filter((campaign) => campaign.status === status),
      }))
      .filter((group) => group.items.length > 0),
    summary: {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      planningCampaigns: campaigns.filter((campaign) => ["planning", "preparing"].includes(campaign.status)).length,
      completedCampaigns: campaigns.filter((campaign) => campaign.status === "completed").length,
      archivedCampaigns: campaigns.filter((campaign) => campaign.status === "archived").length,
    },
  };
}

export async function getCampaignDetail(campaignIdentifier: string): Promise<CampaignDetail | null> {
  const user = await requirePermission("campaigns.view");
  const scopedUnitIds = getScopedUnitIds(user, "campaigns.view");

  const record = await prisma.campaign.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: campaignIdentifier }, { key: campaignIdentifier }],
      ...(scopedUnitIds
        ? {
            events: {
              some: {
                hostUnitId: {
                  in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
                },
              },
            },
          }
        : {}),
    },
    include: {
      events: {
        where: scopedUnitIds
          ? {
              hostUnitId: {
                in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
              },
            }
          : undefined,
        include: {
          hostUnit: true,
          conops: {
            where: {
              deletedAt: null,
            },
          },
          aars: {
            where: {
              deletedAt: null,
            },
          },
          attendanceRecords: {
            select: {
              rsvpStatus: true,
              finalStatus: true,
              lockedAt: true,
            },
          },
          weeklyTasking: {
            include: {
              unitTaskings: true,
            },
          },
        },
        orderBy: [{ startsAt: "asc" }],
      },
      deploymentWeeks: true,
      zeus: true,
    },
  });

  if (!record) {
    return null;
  }

  const activeDeploymentUnits = await listActiveDeploymentUnits();
  const mapped = mapCampaign(record, activeDeploymentUnits);
  const timeline = record.events
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
    .map(mapTimelineEvent);
  const now = new Date();

  return {
    ...mapped,
    timeline,
    operationalWeeks: buildOperationalWeeks(timeline, mapped.deploymentDurationWeeks, record.deploymentWeeks),
    upcomingOperations: timeline.filter(
      (event) => event.startsAt >= now && !["cancelled", "archived"].includes(event.status),
    ),
    completedOperations: timeline.filter(
      (event) => event.status === "completed" || event.attendanceLocked,
    ),
  };
}

export async function getCampaignSummaryCard(
  campaignId: string,
): Promise<CampaignSummaryCard | null> {
  const user = await getCurrentUser();

  if (!user || !can(user, "campaigns.view")) {
    return null;
  }

  const detail = await getCampaignDetail(campaignId);

  if (!detail) {
    return null;
  }

  return {
    id: detail.id,
    title: detail.title,
    status: detail.status,
    statusLabel: detail.statusLabel,
    phase: detail.phase,
    progressPercent: detail.progressPercent,
    nextEvent: detail.nextEvent,
  };
}

export async function getCurrentCampaignWidgetData(): Promise<DashboardCampaignWidgetData> {
  const user = await getCurrentUser();

  if (!user || !can(user, "campaigns.view")) {
    return {
      currentCampaign: null,
    };
  }

  const campaigns = await listCampaigns({ status: "active" });
  const currentCampaign =
    campaigns.campaigns.sort((left, right) => {
      const leftTime = left.nextEvent?.startsAt.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = right.nextEvent?.startsAt.getTime() ?? Number.MAX_SAFE_INTEGER;

      return leftTime - rightTime;
    })[0] ?? null;

  return {
    currentCampaign: currentCampaign
      ? {
          id: currentCampaign.id,
          title: currentCampaign.title,
          status: currentCampaign.status,
          statusLabel: currentCampaign.statusLabel,
          phase: currentCampaign.phase,
          progressPercent: currentCampaign.progressPercent,
          nextEvent: currentCampaign.nextEvent,
        }
      : null,
  };
}

export async function getUnitCampaignParticipationSummary(
  unitId: string,
): Promise<UnitCampaignParticipationSummary | null> {
  const user = await getCurrentUser();

  if (
    !user ||
    (!can(user, "campaigns.statistics.view", { unitId }) &&
      !can(user, "campaigns.view"))
  ) {
    return null;
  }

  const records = await prisma.campaign.findMany({
    where: {
      deletedAt: null,
      events: {
        some: {
          hostUnitId: unitId,
        },
      },
    },
    include: {
      events: {
        where: {
          hostUnitId: unitId,
        },
        include: {
          hostUnit: true,
          conops: {
            where: {
              deletedAt: null,
            },
          },
          aars: {
            where: {
              deletedAt: null,
            },
          },
          attendanceRecords: {
            select: {
              rsvpStatus: true,
              finalStatus: true,
              lockedAt: true,
            },
          },
          weeklyTasking: {
            include: {
              unitTaskings: true,
            },
          },
        },
        orderBy: [{ startsAt: "asc" }],
      },
      deploymentWeeks: true,
      zeus: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const activeDeploymentUnits = await listActiveDeploymentUnits();
  const campaigns = records.map((record) => mapCampaign(record, activeDeploymentUnits));
  const rates = campaigns
    .map((campaign) => campaign.attendanceRate)
    .filter((value): value is number => value !== null);

  return {
    unitId,
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      statusLabel: campaign.statusLabel,
      phase: campaign.phase,
      progressPercent: campaign.progressPercent,
      nextEvent: campaign.nextEvent,
    })),
    activeCount: campaigns.filter((campaign) => campaign.status === "active").length,
    upcomingEventCount: campaigns.reduce(
      (total, campaign) => total + campaign.upcomingEvents,
      0,
    ),
    attendanceRate:
      rates.length > 0
        ? Math.round(rates.reduce((total, value) => total + value, 0) / rates.length)
        : null,
  };
}
