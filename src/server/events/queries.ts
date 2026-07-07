import { Prisma } from "@prisma/client";

import {
  attendanceStatusCatalog,
  eventStatusCatalog,
  eventTypeCatalog,
  missionStatusCatalog,
} from "@/server/database/catalogs";
import { prisma } from "@/server/database/client";
import { requirePermission } from "@/server/permissions/access";
import {
  getAarStatusLabel,
  getConopStatusLabel,
  getMissionStatusLabel,
  isMissionStatus,
} from "@/server/s3/utils";
import type {
  EventFilters,
  EventListData,
  EventListItem,
  EventReferenceData,
  EventSummary,
  RsvpStatusKey,
} from "@/server/events/types";
import {
  getEventStatusLabel,
  getEventTypeLabel,
  getScopedUnitIds,
  isEventStatus,
  isEventType,
  noAccessWhere,
  normalizeFilterValue,
} from "@/server/events/utils";

type EventWithRelations = Prisma.EventGetPayload<{
  include: {
    hostUnit: {
      include: {
        currentMembers: {
          where: {
            isActive: true;
            deletedAt: null;
          };
          select: {
            id: true;
          };
        };
      };
    };
    campaign: true;
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
        memberProfileId: true;
        rsvpStatus: true;
        finalStatus: true;
        lockedAt: true;
      };
    };
    weeklyTasking: {
      include: {
        unitTaskings: {
          include: {
            unit: true;
          };
        };
      };
    };
  };
}>;

function getViewerRsvpStatus(
  records: EventWithRelations["attendanceRecords"],
  memberProfileId: string | null,
) {
  if (!memberProfileId) {
    return null;
  }

  const record = records.find((entry) => entry.memberProfileId === memberProfileId);

  return (record?.rsvpStatus as RsvpStatusKey | null) ?? null;
}

function mapEvent(event: EventWithRelations, viewerMemberProfileId: string | null): EventListItem {
  const latestConop =
    [...event.conops].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
  const latestAar =
    [...event.aars].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
  const expectedCount = event.hostUnit?.currentMembers.length ?? event.attendanceRecords.length;
  const yesCount = event.attendanceRecords.filter((entry) => entry.rsvpStatus === "yes").length;
  const noCount = event.attendanceRecords.filter((entry) => entry.rsvpStatus === "no").length;
  const maybeCount = event.attendanceRecords.filter((entry) => entry.rsvpStatus === "maybe").length;
  const presentCount = event.attendanceRecords.filter((entry) => entry.finalStatus === "present").length;
  const absentCount = event.attendanceRecords.filter((entry) => entry.finalStatus === "absent").length;
  const excusedCount = event.attendanceRecords.filter((entry) => entry.finalStatus === "excused").length;
  const lateCount = event.attendanceRecords.filter((entry) => entry.finalStatus === "late").length;
  const loaCount = event.attendanceRecords.filter((entry) => entry.finalStatus === "loa").length;
  const pendingCount = Math.max(
    expectedCount - (presentCount + absentCount + excusedCount + lateCount + loaCount),
    0,
  );

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    eventTypeLabel: getEventTypeLabel(event.eventType),
    status: event.status,
    statusLabel: getEventStatusLabel(event.status),
    missionStatus: event.missionStatus,
    missionStatusLabel: getMissionStatusLabel(event.missionStatus),
    deploymentWeek: event.deploymentWeek,
    operationVersionLabel: event.operationVersionLabel,
    selectedOperationVersion: event.selectedOperationVersion,
    aarRequired: event.aarRequired,
    aarSubmittedAt: event.aarSubmittedAt,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    publishedAt: event.publishedAt,
    hostUnit: event.hostUnit
      ? {
          id: event.hostUnit.id,
          key: event.hostUnit.key,
          name: event.hostUnit.name,
          shortName: event.hostUnit.shortName,
        }
      : null,
    campaign: event.campaign
      ? {
          id: event.campaign.id,
          key: event.campaign.key,
          title: event.campaign.title,
          status: event.campaign.status,
        }
      : null,
    conopCount: event.conops.length,
    publishedConopCount: event.conops.filter((entry) => entry.status === "published").length,
    latestConopStatusLabel: latestConop ? getConopStatusLabel(latestConop.status) : null,
    aarCount: event.aars.length,
    latestAarStatusLabel: latestAar ? getAarStatusLabel(latestAar.status) : null,
    attendanceLocked:
      event.attendanceRecords.length > 0 &&
      event.attendanceRecords.every((entry) => entry.lockedAt !== null),
    expectedCount,
    rsvpCounts: {
      yes: yesCount,
      no: noCount,
      maybe: maybeCount,
      missing: Math.max(expectedCount - (yesCount + noCount + maybeCount), 0),
    },
    finalCounts: {
      present: presentCount,
      absent: absentCount,
      excused: excusedCount,
      late: lateCount,
      loa: loaCount,
      pending: pendingCount,
    },
    viewerRsvpStatus: getViewerRsvpStatus(event.attendanceRecords, viewerMemberProfileId),
    weeklyTasking: event.weeklyTasking
      ? {
          id: event.weeklyTasking.id,
          weekNumber: event.weeklyTasking.weekNumber,
          operationalSummary: event.weeklyTasking.operationalSummary,
          commandersIntent: event.weeklyTasking.commandersIntent,
          timeline: event.weeklyTasking.timeline,
          publishStatus: event.weeklyTasking.publishStatus,
          unitTaskings: event.weeklyTasking.unitTaskings.map((tasking) => ({
            id: tasking.id,
            unitName: tasking.unit.name,
            unitShortName: tasking.unit.shortName,
            primaryObjective: tasking.primaryObjective,
            secondaryObjective: tasking.secondaryObjective,
            specialInstructions: tasking.specialInstructions,
          })),
        }
      : null,
  };
}

function buildEventWhere(
  filters: EventFilters,
  scopedUnitIds: string[] | null,
): Prisma.EventWhereInput {
  const q = normalizeFilterValue(filters.q);
  const unitId = normalizeFilterValue(filters.unitId);
  const campaignId = normalizeFilterValue(filters.campaignId);
  const status = normalizeFilterValue(filters.status);
  const missionStatus = normalizeFilterValue(filters.missionStatus);
  const eventType = normalizeFilterValue(filters.eventType);
  const dateFrom = normalizeFilterValue(filters.dateFrom);
  const dateTo = normalizeFilterValue(filters.dateTo);

  return {
    ...(scopedUnitIds
      ? {
          hostUnitId: {
            in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
          },
        }
      : {}),
    ...(unitId ? { hostUnitId: unitId } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...(status && isEventStatus(status) ? { status } : {}),
    ...(missionStatus && isMissionStatus(missionStatus) ? { missionStatus } : {}),
    ...(eventType && isEventType(eventType) ? { eventType } : {}),
    ...(dateFrom || dateTo
      ? {
          startsAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { hostUnit: { name: { contains: q } } },
            { campaign: { title: { contains: q } } },
          ],
        }
      : {}),
  };
}

function summarizeEvents(events: EventListItem[]): EventSummary {
  const now = new Date();

  return {
    totalEvents: events.length,
    publishedEvents: events.filter((event) => event.status === "published").length,
    draftEvents: events.filter((event) => event.status === "draft").length,
    cancelledEvents: events.filter((event) => event.status === "cancelled").length,
    upcomingEvents: events.filter((event) => event.startsAt >= now).length,
    pastEvents: events.filter((event) => event.startsAt < now).length,
    openAttendanceEvents: events.filter((event) => !event.attendanceLocked).length,
    missingRsvpCount: events.reduce((total, event) => total + event.rsvpCounts.missing, 0),
  };
}

export async function getEventReferenceData(): Promise<EventReferenceData> {
  await requirePermission("events.view");

  const [units, campaigns] = await Promise.all([
    prisma.unit.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.campaign.findMany({
      where: {
        deletedAt: null,
        status: {
          not: "archived",
        },
      },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    }),
  ]);

  return {
    units: units.map((unit) => ({
      id: unit.id,
      label: unit.name,
      key: unit.key,
      hint: unit.shortName,
    })),
    campaigns: campaigns.map((campaign) => ({
      id: campaign.id,
      label: campaign.title,
      key: campaign.key,
      hint: getEventStatusLabel(campaign.status),
    })),
    eventTypes: [...eventTypeCatalog],
    statuses: [...eventStatusCatalog],
    missionStatuses: [...missionStatusCatalog],
    rsvpStatuses: [...attendanceStatusCatalog.rsvp],
    finalStatuses: [...attendanceStatusCatalog.final],
  };
}

export async function listEvents(filters: EventFilters = {}): Promise<EventListData> {
  const user = await requirePermission("events.view");
  const scopedUnitIds = getScopedUnitIds(user, "events.view");
  const where = buildEventWhere(filters, scopedUnitIds);

  const events = await prisma.event.findMany({
    where,
    include: {
      hostUnit: {
        include: {
          currentMembers: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            select: {
              id: true,
            },
          },
        },
      },
      campaign: true,
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
          memberProfileId: true,
          rsvpStatus: true,
          finalStatus: true,
          lockedAt: true,
        },
      },
      weeklyTasking: {
        include: {
          unitTaskings: {
            include: {
              unit: true,
            },
            orderBy: {
              unit: {
                sortOrder: "asc",
              },
            },
          },
        },
      },
    },
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
  });

  const mappedEvents = events.map((event) => mapEvent(event, user.memberProfileId));

  return {
    events: mappedEvents,
    summary: summarizeEvents(mappedEvents),
  };
}

export async function getEventDetail(eventIdentifier: string): Promise<EventListItem | null> {
  const user = await requirePermission("events.view");
  const scopedUnitIds = getScopedUnitIds(user, "events.view");

  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventIdentifier }],
      ...(scopedUnitIds
        ? {
            hostUnitId: {
              in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
            },
          }
        : {}),
    },
    include: {
      hostUnit: {
        include: {
          currentMembers: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            select: {
              id: true,
            },
          },
        },
      },
      campaign: true,
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
          memberProfileId: true,
          rsvpStatus: true,
          finalStatus: true,
          lockedAt: true,
        },
      },
      weeklyTasking: {
        include: {
          unitTaskings: {
            include: {
              unit: true,
            },
            orderBy: {
              unit: {
                sortOrder: "asc",
              },
            },
          },
        },
      },
    },
  });

  if (!event) {
    return null;
  }

  return mapEvent(event, user.memberProfileId);
}
