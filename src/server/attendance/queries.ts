import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { can, requirePermission } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel";
import type {
  AttendanceReportData,
  AttendanceReportEventItem,
  AttendanceReportFilters,
  EventAttendanceRow,
  EventAttendanceWorkspace,
  MemberAttendanceSummary,
  UnitAttendanceSummary,
  ViewerEventRsvp,
} from "@/server/attendance/types";
import {
  calculateAttendanceRate,
  getEventStatusLabel,
  getEventTypeLabel,
  getScopedUnitIds,
  isFinalAttendanceStatus,
  noAccessWhere,
  normalizeFilterValue,
} from "@/server/events/utils";

type EventAttendanceQuery = Prisma.EventGetPayload<{
  include: {
    hostUnit: {
      include: {
        currentMembers: {
          where: {
            isActive: true;
            deletedAt: null;
          };
          include: {
            currentRank: true;
            currentPosition: true;
            status: true;
            user: true;
          };
        };
      };
    };
    attendanceRecords: {
      include: {
        memberProfile: {
          include: {
            currentRank: true;
            currentPosition: true;
            status: true;
            user: true;
          };
        };
      };
    };
  };
}>;

function mapAttendanceRow(input: {
  member: {
    id: string;
    displayName: string;
    callsign: string | null;
    user?: {
      displayName: string | null;
      name: string | null;
      email: string | null;
    } | null;
    currentRank: { abbreviation: string } | null;
    currentPosition: { title: string } | null;
    status: { key: string; label: string };
  };
  record?: {
    rsvpStatus: string | null;
    finalStatus: string | null;
    respondedAt: Date | null;
    recordedAt: Date | null;
    lockedAt: Date | null;
    notes: string | null;
  } | null;
}): EventAttendanceRow {
  const rsvpStatus = input.record?.rsvpStatus as EventAttendanceRow["rsvpStatus"];
  const finalStatus = input.record?.finalStatus as EventAttendanceRow["finalStatus"];

  return {
    memberProfileId: input.member.id,
    displayName: getMemberDisplayName(input.member),
    callsign: input.member.callsign,
    rankAbbreviation: input.member.currentRank?.abbreviation ?? null,
    positionTitle: input.member.currentPosition?.title ?? null,
    profileStatusLabel: input.member.status.label,
    profileStatusKey: input.member.status.key,
    rsvpStatus: rsvpStatus ?? null,
    finalStatus: finalStatus ?? null,
    respondedAt: input.record?.respondedAt ?? null,
    recordedAt: input.record?.recordedAt ?? null,
    lockedAt: input.record?.lockedAt ?? null,
    notes: input.record?.notes ?? null,
    isMissingRsvp: !rsvpStatus,
    isNoShow: rsvpStatus === "yes" && finalStatus === "absent",
  };
}

function summarizeWorkspaceRows(rows: EventAttendanceRow[]) {
  const presentCount = rows.filter((row) => row.finalStatus === "present").length;
  const absentCount = rows.filter((row) => row.finalStatus === "absent").length;
  const excusedCount = rows.filter((row) => row.finalStatus === "excused").length;
  const lateCount = rows.filter((row) => row.finalStatus === "late").length;
  const loaCount = rows.filter((row) => row.finalStatus === "loa").length;

  return {
    expectedCount: rows.length,
    respondedCount: rows.filter((row) => row.rsvpStatus !== null).length,
    missingRsvpCount: rows.filter((row) => row.isMissingRsvp).length,
    presentCount,
    absentCount,
    excusedCount,
    lateCount,
    loaCount,
    noShowCount: rows.filter((row) => row.isNoShow).length,
    attendanceRate: calculateAttendanceRate({
      present: presentCount,
      late: lateCount,
      absent: absentCount,
    }),
  };
}

function buildAttendanceReportWhere(
  filters: AttendanceReportFilters,
  scopedUnitIds: string[] | null,
): Prisma.EventWhereInput {
  const q = normalizeFilterValue(filters.q);
  const unitId = normalizeFilterValue(filters.unitId);
  const eventId = normalizeFilterValue(filters.eventId);
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
    ...(eventId ? { id: eventId } : {}),
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
            { hostUnit: { name: { contains: q } } },
          ],
        }
      : {}),
  };
}

function buildAttendanceReportEventItem(event: EventAttendanceQuery): AttendanceReportEventItem {
  const memberIds = new Set(event.hostUnit?.currentMembers.map((member) => member.id) ?? []);

  for (const record of event.attendanceRecords) {
    memberIds.add(record.memberProfileId);
  }

  const rows = Array.from(memberIds).map((memberProfileId) => {
    const rosterMember = event.hostUnit?.currentMembers.find((member) => member.id === memberProfileId);
    const attendanceRecord = event.attendanceRecords.find((record) => record.memberProfileId === memberProfileId);
    const member =
      rosterMember ??
      attendanceRecord?.memberProfile;

    if (!member) {
      return null;
    }

    return mapAttendanceRow({
      member,
      record: attendanceRecord,
    });
  }).filter((row): row is EventAttendanceRow => Boolean(row));

  const summary = summarizeWorkspaceRows(rows);

  return {
    eventId: event.id,
    title: event.title,
    startsAt: event.startsAt,
    hostUnitShortName: event.hostUnit?.shortName ?? null,
    eventTypeLabel: getEventTypeLabel(event.eventType),
    statusLabel: getEventStatusLabel(event.status),
    expectedCount: summary.expectedCount,
    missingRsvpCount: summary.missingRsvpCount,
    noShowCount: summary.noShowCount,
    attendanceRate: summary.attendanceRate,
    attendanceLocked:
      event.attendanceRecords.length > 0 &&
      event.attendanceRecords.every((record) => record.lockedAt !== null),
  };
}

export async function getEventAttendanceWorkspace(
  eventId: string,
): Promise<EventAttendanceWorkspace | null> {
  const user = await getCurrentUser();

  if (!user) {
    await requirePermission("attendance.view");
    return null;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hostUnit: {
        include: {
          currentMembers: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            include: {
              currentRank: true,
              currentPosition: true,
              status: true,
              user: true,
            },
          },
        },
      },
      attendanceRecords: {
        include: {
          memberProfile: {
            include: {
              currentRank: true,
              currentPosition: true,
              status: true,
              user: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
      },
    },
  });

  if (!event) {
    return null;
  }

  if (!can(user, "attendance.view", { unitId: event.hostUnitId })) {
    await requirePermission("attendance.view", event.hostUnitId ? { unitId: event.hostUnitId } : undefined);
  }

  const memberIds = new Set(event.hostUnit?.currentMembers.map((member) => member.id) ?? []);

  for (const record of event.attendanceRecords) {
    memberIds.add(record.memberProfileId);
  }

  const rows = Array.from(memberIds)
    .map((memberProfileId) => {
      const rosterMember = event.hostUnit?.currentMembers.find((member) => member.id === memberProfileId);
      const record = event.attendanceRecords.find((entry) => entry.memberProfileId === memberProfileId);
      const member = rosterMember ?? record?.memberProfile;

      if (!member) {
        return null;
      }

      return mapAttendanceRow({
        member,
        record,
      });
    })
    .filter((row): row is EventAttendanceRow => Boolean(row))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
  const summary = summarizeWorkspaceRows(rows);

  return {
    eventId: event.id,
    eventTitle: event.title,
    eventStatus: event.status,
    eventStatusLabel: getEventStatusLabel(event.status),
    hostUnit: event.hostUnit
      ? {
          id: event.hostUnit.id,
          key: event.hostUnit.key,
          name: event.hostUnit.name,
          shortName: event.hostUnit.shortName,
        }
      : null,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    attendanceLocked:
      event.attendanceRecords.length > 0 &&
      event.attendanceRecords.every((record) => record.lockedAt !== null),
    rows,
    summary,
  };
}

export async function getViewerEventRsvp(
  eventId: string,
): Promise<ViewerEventRsvp | null> {
  const user = await getCurrentUser();

  if (!user?.memberProfileId || !can(user, "attendance.rsvp.view")) {
    return null;
  }

  const record = await prisma.attendanceRecord.findUnique({
    where: {
      eventId_memberProfileId: {
        eventId,
        memberProfileId: user.memberProfileId,
      },
    },
    include: {
      memberProfile: {
        include: {
          user: true,
        },
      },
    },
  });

  return {
    eventId,
    memberProfileId: user.memberProfileId,
    displayName: record?.memberProfile
      ? getMemberDisplayName(record.memberProfile)
      : user.displayName,
    rsvpStatus: (record?.rsvpStatus as ViewerEventRsvp["rsvpStatus"]) ?? null,
    finalStatus: (record?.finalStatus as ViewerEventRsvp["finalStatus"]) ?? null,
    respondedAt: record?.respondedAt ?? null,
  };
}

export async function getAttendanceReportData(
  filters: AttendanceReportFilters = {},
): Promise<AttendanceReportData> {
  const user = await requirePermission("attendance.reports.view");
  const scopedUnitIds = getScopedUnitIds(user, "attendance.reports.view");
  const where = buildAttendanceReportWhere(filters, scopedUnitIds);

  const [events, units] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        hostUnit: {
          include: {
            currentMembers: {
              where: {
                isActive: true,
                deletedAt: null,
              },
              include: {
                currentRank: true,
                currentPosition: true,
                status: true,
                user: true,
              },
            },
          },
        },
        attendanceRecords: {
          include: {
            memberProfile: {
              include: {
                currentRank: true,
                currentPosition: true,
                status: true,
                user: true,
                currentUnit: true,
              },
            },
          },
        },
      },
      orderBy: [{ startsAt: "desc" }],
    }),
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
  ]);

  const statusFilter = normalizeFilterValue(filters.status);
  const reportEvents = events
    .map(buildAttendanceReportEventItem)
    .filter((event) => {
      if (!statusFilter) {
        return true;
      }

      if (statusFilter === "missing-rsvp") {
        return event.missingRsvpCount > 0;
      }

      if (statusFilter === "no-show") {
        return event.noShowCount > 0;
      }

      if (isFinalAttendanceStatus(statusFilter)) {
        const sourceEvent = events.find((entry) => entry.id === event.eventId);

        return (
          sourceEvent?.attendanceRecords.some(
            (record) => record.finalStatus === statusFilter,
          ) ?? false
        );
      }

      return true;
    });

  const missingRsvpMembers = events.flatMap((event) => {
    const rosterMembers = event.hostUnit?.currentMembers ?? [];

    return rosterMembers
      .filter((member) =>
        !event.attendanceRecords.some(
          (record) => record.memberProfileId === member.id && record.rsvpStatus !== null,
        ),
      )
      .map((member) => ({
        eventId: event.id,
        eventTitle: event.title,
        memberProfileId: member.id,
        displayName: getMemberDisplayName(member),
        unitShortName: event.hostUnit?.shortName ?? null,
      }));
  });

  const noShows = events.flatMap((event) =>
    event.attendanceRecords
      .filter((record) => record.rsvpStatus === "yes" && record.finalStatus === "absent")
      .map((record) => ({
        eventId: event.id,
        eventTitle: event.title,
        memberProfileId: record.memberProfileId,
        displayName: getMemberDisplayName(record.memberProfile),
        unitShortName: record.memberProfile.currentUnit?.shortName ?? event.hostUnit?.shortName ?? null,
      })),
  );
  const attendanceRates = reportEvents
    .map((event) => event.attendanceRate)
    .filter((value): value is number => value !== null);

  return {
    availableEvents: events.map((event) => ({
      id: event.id,
      label: event.title,
      hint: event.hostUnit?.shortName ?? null,
    })),
    unitOptions: units.map((unit) => ({
      id: unit.id,
      label: unit.name,
      hint: unit.shortName,
    })),
    events: reportEvents,
    summary: {
      trackedEvents: reportEvents.length,
      pendingCloseout: reportEvents.filter((event) => !event.attendanceLocked).length,
      missingRsvpCount: missingRsvpMembers.length,
      noShowCount: noShows.length,
      averageAttendanceRate:
        attendanceRates.length > 0
          ? Math.round(
              attendanceRates.reduce((total, value) => total + value, 0) /
                attendanceRates.length,
            )
          : null,
    },
    missingRsvpMembers,
    noShows,
  };
}

export async function getMemberAttendanceSummary(
  memberProfileId: string,
): Promise<MemberAttendanceSummary | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const member = await prisma.memberProfile.findUnique({
    where: { id: memberProfileId },
    include: {
      currentUnit: true,
    },
  });

  if (!member) {
    return null;
  }

  const canViewSelf = user.memberProfileId === memberProfileId && can(user, "attendance.rsvp.view");
  const canViewStaff =
    can(user, "attendance.view", { unitId: member.currentUnitId }) ||
    can(user, "attendance.reports.view", { unitId: member.currentUnitId });

  if (!canViewSelf && !canViewStaff) {
    return null;
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      memberProfileId,
    },
    include: {
      event: {
        include: {
          hostUnit: true,
        },
      },
    },
    orderBy: [{ event: { startsAt: "desc" } }],
    take: 12,
  });

  const presentCount = records.filter((record) => record.finalStatus === "present").length;
  const absentCount = records.filter((record) => record.finalStatus === "absent").length;
  const excusedCount = records.filter((record) => record.finalStatus === "excused").length;
  const lateCount = records.filter((record) => record.finalStatus === "late").length;
  const loaCount = records.filter((record) => record.finalStatus === "loa").length;

  return {
    memberProfileId,
    attendanceRate: calculateAttendanceRate({
      present: presentCount,
      late: lateCount,
      absent: absentCount,
    }),
    totalFinalized: records.filter((record) => record.finalStatus !== null).length,
    presentCount,
    absentCount,
    excusedCount,
    lateCount,
    loaCount,
    upcomingRsvpCount: records.filter(
      (record) => record.event.startsAt > new Date() && record.rsvpStatus !== null,
    ).length,
    recentEvents: records.slice(0, 6).map((record) => ({
      eventId: record.eventId,
      eventTitle: record.event.title,
      startsAt: record.event.startsAt,
      hostUnitShortName: record.event.hostUnit?.shortName ?? null,
      rsvpStatus: record.rsvpStatus as MemberAttendanceSummary["recentEvents"][number]["rsvpStatus"],
      finalStatus: record.finalStatus as MemberAttendanceSummary["recentEvents"][number]["finalStatus"],
    })),
  };
}

export async function getUnitAttendanceSummary(
  unitId: string,
): Promise<UnitAttendanceSummary | null> {
  const user = await getCurrentUser();

  if (
    !user ||
    (!can(user, "attendance.reports.view", { unitId }) &&
      !can(user, "attendance.view", { unitId }))
  ) {
    return null;
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
  });

  if (!unit) {
    return null;
  }

  const events = await prisma.event.findMany({
    where: {
      hostUnitId: unitId,
    },
    include: {
      hostUnit: {
        include: {
          currentMembers: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            include: {
              currentRank: true,
              currentPosition: true,
              status: true,
              user: true,
            },
          },
        },
      },
      attendanceRecords: {
        include: {
          memberProfile: {
            include: {
              currentRank: true,
              currentPosition: true,
              status: true,
              user: true,
            },
          },
        },
      },
    },
    orderBy: [{ startsAt: "desc" }],
    take: 6,
  });

  const reportItems = events.map(buildAttendanceReportEventItem);
  const rates = reportItems
    .map((item) => item.attendanceRate)
    .filter((value): value is number => value !== null);

  return {
    unitId: unit.id,
    unitName: unit.name,
    attendanceRate:
      rates.length > 0
        ? Math.round(rates.reduce((total, value) => total + value, 0) / rates.length)
        : null,
    trackedEvents: reportItems.length,
    pendingCloseout: reportItems.filter((item) => !item.attendanceLocked).length,
    missingRsvpCount: reportItems.reduce((total, item) => total + item.missingRsvpCount, 0),
    noShowCount: reportItems.reduce((total, item) => total + item.noShowCount, 0),
    recentEvents: reportItems,
  };
}
