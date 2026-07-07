import { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  aarStatusCatalog,
  conopStatusCatalog,
  eventTypeCatalog,
  missionStatusCatalog,
} from "@/server/database/catalogs";
import { prisma } from "@/server/database/client";
import { can, requirePermission } from "@/server/permissions/access";
import {
  getEventStatusLabel,
  getEventTypeLabel,
  getPermissionScope,
  getScopedUnitIds,
  isEventType,
  noAccessWhere,
  normalizeFilterValue,
} from "@/server/events/utils";
import type {
  AarDetail,
  AarFilters,
  AarListItem,
  ConopDetail,
  ConopFilters,
  ConopListItem,
  MissionDetail,
  MissionFilters,
  MissionListData,
  MissionListItem,
  S3DashboardData,
  S3ReferenceData,
} from "@/server/s3/types";
import {
  getAarStatusLabel,
  getConopStatusLabel,
  getMissionStatusLabel,
  isAarStatus,
  isConopStatus,
  isMissionStatus,
} from "@/server/s3/utils";

type MissionRecord = Prisma.EventGetPayload<{
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
  };
}>;

type ConopRecord = Prisma.ConopGetPayload<{
  include: {
    event: {
      include: {
        hostUnit: true;
      };
    };
    campaign: true;
  };
}>;

type AarRecord = Prisma.AarGetPayload<{
  include: {
    event: {
      include: {
        hostUnit: true;
      };
    };
    campaign: true;
    submittedBy: true;
    reviewedBy: true;
    attachments: true;
  };
}>;

function mapMission(record: MissionRecord): MissionListItem {
  const latestConop =
    [...record.conops].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
    )[0] ?? null;
  const latestAar =
    [...record.aars].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
    )[0] ?? null;
  const reviewedAarCount = record.aars.filter((aar) => aar.status === "reviewed").length;
  const publishedConopCount = record.conops.filter((conop) => conop.status === "published").length;
  const expectedAttendanceCount =
    record.hostUnit?.currentMembers.length ?? record.attendanceRecords.length;
  const yesCount = record.attendanceRecords.filter((entry) => entry.rsvpStatus === "yes").length;
  const noCount = record.attendanceRecords.filter((entry) => entry.rsvpStatus === "no").length;
  const maybeCount = record.attendanceRecords.filter((entry) => entry.rsvpStatus === "maybe").length;
  const presentCount = record.attendanceRecords.filter((entry) => entry.finalStatus === "present").length;
  const absentCount = record.attendanceRecords.filter((entry) => entry.finalStatus === "absent").length;
  const excusedCount = record.attendanceRecords.filter((entry) => entry.finalStatus === "excused").length;
  const lateCount = record.attendanceRecords.filter((entry) => entry.finalStatus === "late").length;
  const loaCount = record.attendanceRecords.filter((entry) => entry.finalStatus === "loa").length;
  const pendingCount = Math.max(
    expectedAttendanceCount - (presentCount + absentCount + excusedCount + lateCount + loaCount),
    0,
  );

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    eventType: record.eventType,
    eventTypeLabel: getEventTypeLabel(record.eventType),
    status: record.status,
    statusLabel: getEventStatusLabel(record.status),
    missionStatus: record.missionStatus,
    missionStatusLabel: getMissionStatusLabel(record.missionStatus),
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    publishedAt: record.publishedAt,
    hostUnit: record.hostUnit
      ? {
          id: record.hostUnit.id,
          key: record.hostUnit.key,
          name: record.hostUnit.name,
          shortName: record.hostUnit.shortName,
        }
      : null,
    campaign: record.campaign
      ? {
          id: record.campaign.id,
          key: record.campaign.key,
          title: record.campaign.title,
          status: record.campaign.status,
        }
      : null,
    missionMakerName: record.missionMakerName,
    zeusName: record.zeusName,
    missionCommanderName: record.missionCommanderName,
    operationVersionLabel: record.operationVersionLabel,
    selectedOperationVersion: record.selectedOperationVersion,
    participatingUnitsSummary: latestConop?.participatingUnitsSummary ?? null,
    conopCount: record.conops.length,
    publishedConopCount,
    latestConopStatus: latestConop?.status ?? null,
    latestConopStatusLabel: latestConop ? getConopStatusLabel(latestConop.status) : null,
    aarCount: record.aars.length,
    reviewedAarCount,
    latestAarStatus: latestAar?.status ?? null,
    latestAarStatusLabel: latestAar ? getAarStatusLabel(latestAar.status) : null,
    aarRequired: record.aarRequired,
    aarSubmittedAt: record.aarSubmittedAt,
    missingConop: publishedConopCount === 0,
    missingAar:
      record.aarRequired &&
      record.status === "completed" &&
      !["aar-submitted", "archived"].includes(record.missionStatus) &&
      reviewedAarCount === 0,
    attendanceLocked:
      record.attendanceRecords.length > 0 &&
      record.attendanceRecords.every((entry) => entry.lockedAt !== null),
    expectedAttendanceCount,
    rsvpCounts: {
      yes: yesCount,
      no: noCount,
      maybe: maybeCount,
      missing: Math.max(expectedAttendanceCount - (yesCount + noCount + maybeCount), 0),
    },
    finalAttendanceCounts: {
      present: presentCount,
      absent: absentCount,
      excused: excusedCount,
      late: lateCount,
      loa: loaCount,
      pending: pendingCount,
    },
  };
}

function mapConop(record: ConopRecord): ConopListItem {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    statusLabel: getConopStatusLabel(record.status),
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    event: record.event
      ? {
          id: record.event.id,
          title: record.event.title,
          startsAt: record.event.startsAt,
          hostUnitShortName: record.event.hostUnit?.shortName ?? null,
        }
      : null,
    campaign: record.campaign
      ? {
          id: record.campaign.id,
          title: record.campaign.title,
          status: record.campaign.status,
        }
      : null,
    missionMakerName: record.missionMakerName,
    zeusName: record.zeusName,
    missionCommanderName: record.missionCommanderName,
  };
}

function mapAar(record: AarRecord): AarListItem {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    statusLabel: getAarStatusLabel(record.status),
    submittedAt: record.submittedAt,
    reviewedAt: record.reviewedAt,
    updatedAt: record.updatedAt,
    event: record.event
      ? {
          id: record.event.id,
          title: record.event.title,
          startsAt: record.event.startsAt,
          hostUnitShortName: record.event.hostUnit?.shortName ?? null,
        }
      : null,
    campaign: record.campaign
      ? {
          id: record.campaign.id,
          title: record.campaign.title,
          status: record.campaign.status,
        }
      : null,
    reviewedByName:
      record.reviewedBy?.displayName ??
      record.reviewedBy?.name ??
      record.reviewedBy?.email ??
      null,
    submittedByName:
      record.submittedBy?.displayName ??
      record.submittedBy?.name ??
      record.submittedBy?.email ??
      null,
    patrolLeaderName: record.patrolLeaderName,
    hasMapScreenshot: record.attachments.some((attachment) => attachment.attachmentType === "map_screenshot"),
  };
}

function buildMissionWhere(
  filters: MissionFilters,
  scopedUnitIds: string[] | null,
): Prisma.EventWhereInput {
  const q = normalizeFilterValue(filters.q);
  const missionStatus = normalizeFilterValue(filters.missionStatus);
  const eventType = normalizeFilterValue(filters.eventType);
  const unitId = normalizeFilterValue(filters.unitId);
  const campaignId = normalizeFilterValue(filters.campaignId);
  const dateFrom = normalizeFilterValue(filters.dateFrom);
  const dateTo = normalizeFilterValue(filters.dateTo);

  return {
    ...(scopedUnitIds
      ? {
          hostUnitId: {
            in: unitId
              ? [unitId]
              : scopedUnitIds.length > 0
                ? scopedUnitIds
                : noAccessWhere.in,
          },
        }
      : unitId
        ? {
            hostUnitId: unitId,
          }
        : {}),
    ...(campaignId ? { campaignId } : {}),
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
    ...(filters.missingConop
      ? {
          conops: {
            none: {
              status: "published",
            },
          },
        }
      : {}),
    ...(filters.missingAar
      ? {
          eventType: "patrol",
          status: "completed",
          aars: {
            none: {
              status: {
                in: ["submitted", "reviewed"],
              },
            },
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { missionMakerName: { contains: q } },
            { zeusName: { contains: q } },
            { missionCommanderName: { contains: q } },
            { hostUnit: { name: { contains: q } } },
            { campaign: { title: { contains: q } } },
          ],
        }
      : {}),
  };
}

function buildDocumentScopeWhere(scopedUnitIds: string[] | null) {
  if (scopedUnitIds === null) {
    return {};
  }

  return {
    OR: [
      {
        event: {
          hostUnitId: {
            in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
          },
        },
      },
      {
        campaign: {
          events: {
            some: {
              hostUnitId: {
                in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
              },
            },
          },
        },
      },
    ],
  };
}

function buildConopWhere(
  filters: ConopFilters,
  scopedUnitIds: string[] | null,
): Prisma.ConopWhereInput {
  const q = normalizeFilterValue(filters.q);
  const eventId = normalizeFilterValue(filters.eventId);
  const campaignId = normalizeFilterValue(filters.campaignId);
  const status = normalizeFilterValue(filters.status);

  return {
    deletedAt: null,
    ...buildDocumentScopeWhere(scopedUnitIds),
    ...(eventId ? { eventId } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...(status && isConopStatus(status) ? { status } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { situation: { contains: q } },
            { mission: { contains: q } },
            { missionMakerName: { contains: q } },
            { zeusName: { contains: q } },
            { event: { title: { contains: q } } },
            { campaign: { title: { contains: q } } },
          ],
        }
      : {}),
  };
}

function buildAarWhere(
  filters: AarFilters,
  scopedUnitIds: string[] | null,
): Prisma.AarWhereInput {
  const q = normalizeFilterValue(filters.q);
  const eventId = normalizeFilterValue(filters.eventId);
  const campaignId = normalizeFilterValue(filters.campaignId);
  const status = normalizeFilterValue(filters.status);

  return {
    deletedAt: null,
    ...buildDocumentScopeWhere(scopedUnitIds),
    ...(eventId ? { eventId } : {}),
    ...(campaignId ? { campaignId } : {}),
    ...(status && isAarStatus(status) ? { status } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { summary: { contains: q } },
            { wentWell: { contains: q } },
            { needsImprovement: { contains: q } },
            { event: { title: { contains: q } } },
            { campaign: { title: { contains: q } } },
          ],
        }
      : {}),
  };
}

const aarWorkspacePermissionKeys = [
  "s3.aars.view",
  "s3.aars.submit",
  "s3.aars.review",
  "aars.submit",
  "aars.review",
  "patrols.aar.submit",
  "patrols.aar.review",
] as const;

async function requireAarWorkspaceAccess() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("An authenticated user is required.");
  }

  const allowed = aarWorkspacePermissionKeys.some((permissionKey) => can(user, permissionKey));

  if (!allowed) {
    throw new Error("You do not have permission to view Patrol AARs.");
  }

  return user;
}

function getAarScopedUnitIds(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const scopes = aarWorkspacePermissionKeys.map((permissionKey) => getPermissionScope(user, permissionKey));

  if (scopes.some((scope) => scope.global)) {
    return null;
  }

  return Array.from(new Set(scopes.flatMap((scope) => scope.unitIds)));
}

export async function getS3ReferenceData(
  permissionKey: "s3.missions.view" | "s3.conops.view" | "s3.aars.view" = "s3.missions.view",
): Promise<S3ReferenceData> {
  const user =
    permissionKey === "s3.aars.view"
      ? await requireAarWorkspaceAccess()
      : await requirePermission(permissionKey);
  const scopedUnitIds =
    permissionKey === "s3.aars.view"
      ? getAarScopedUnitIds(user)
      : getScopedUnitIds(user, permissionKey);
  const missionWhere = buildMissionWhere({}, scopedUnitIds);

  const [units, campaigns, events] = await Promise.all([
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
    prisma.campaign.findMany({
      where: {
        deletedAt: null,
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
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    }),
    prisma.event.findMany({
      where: missionWhere,
      include: {
        hostUnit: true,
      },
      orderBy: [{ startsAt: "desc" }, { title: "asc" }],
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
      hint: campaign.status,
    })),
    events: events.map((event) => ({
      id: event.id,
      label: event.title,
      hint: `${event.hostUnit?.shortName ?? "Unscoped"} / ${getMissionStatusLabel(event.missionStatus)}`,
    })),
    missionStatuses: [...missionStatusCatalog],
    conopStatuses: [...conopStatusCatalog],
    aarStatuses: [...aarStatusCatalog],
    eventTypes: [...eventTypeCatalog],
  };
}

export async function listMissions(filters: MissionFilters = {}): Promise<MissionListData> {
  const user = await requirePermission("s3.missions.view");
  const scopedUnitIds = getScopedUnitIds(user, "s3.missions.view");
  const records = await prisma.event.findMany({
    where: buildMissionWhere(filters, scopedUnitIds),
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
    },
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
  });
  const missions = records.map(mapMission);

  return {
    missions,
    groupedMissions: missionStatusCatalog
      .map((entry) => ({
        status: entry.key,
        statusLabel: entry.label,
        items: missions.filter((mission) => mission.missionStatus === entry.key),
      }))
      .filter((group) => group.items.length > 0),
    summary: {
      totalMissions: missions.length,
      draftMissions: missions.filter((mission) => mission.missionStatus === "draft").length,
      reviewMissions: missions.filter((mission) => mission.missionStatus === "s3-review").length,
      approvedMissions: missions.filter((mission) => mission.missionStatus === "approved").length,
      publishedMissions: missions.filter((mission) => mission.missionStatus === "published").length,
      completedMissions: missions.filter((mission) => mission.missionStatus === "completed").length,
      aarSubmittedMissions: missions.filter((mission) => mission.missionStatus === "aar-submitted").length,
      archivedMissions: missions.filter((mission) => mission.missionStatus === "archived").length,
      missionsMissingConop: missions.filter((mission) => mission.missingConop).length,
      missionsMissingAar: missions.filter((mission) => mission.missingAar).length,
    },
  };
}

export async function getMissionDetail(missionId: string): Promise<MissionDetail | null> {
  const user = await requirePermission("s3.missions.view");
  const scopedUnitIds = getScopedUnitIds(user, "s3.missions.view");
  const record = await prisma.event.findFirst({
    where: {
      id: missionId,
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
        include: {
          event: {
            include: {
              hostUnit: true,
            },
          },
          campaign: true,
        },
        orderBy: [{ updatedAt: "desc" }],
      },
      aars: {
        where: {
          deletedAt: null,
        },
        include: {
          attachments: true,
          event: {
            include: {
              hostUnit: true,
            },
          },
          campaign: true,
          submittedBy: true,
          reviewedBy: true,
        },
        orderBy: [{ updatedAt: "desc" }],
      },
      attendanceRecords: {
        select: {
          memberProfileId: true,
          rsvpStatus: true,
          finalStatus: true,
          lockedAt: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  return {
    ...mapMission(record),
    conops: record.conops.map(mapConop),
    aars: record.aars.map(mapAar),
  };
}

export async function listConops(filters: ConopFilters = {}) {
  const user = await requirePermission("s3.conops.view");
  const scopedUnitIds = getScopedUnitIds(user, "s3.conops.view");
  const records = await prisma.conop.findMany({
    where: buildConopWhere(filters, scopedUnitIds),
    include: {
      event: {
        include: {
          hostUnit: true,
        },
      },
      campaign: true,
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });

  return {
    conops: records.map(mapConop),
    summary: {
      total: records.length,
      draft: records.filter((record) => record.status === "draft").length,
      published: records.filter((record) => record.status === "published").length,
    },
  };
}

export async function getConopDetail(conopId: string): Promise<ConopDetail | null> {
  const user = await requirePermission("s3.conops.view");
  const scopedUnitIds = getScopedUnitIds(user, "s3.conops.view");
  const record = await prisma.conop.findFirst({
    where: {
      id: conopId,
      deletedAt: null,
      ...buildDocumentScopeWhere(scopedUnitIds),
    },
    include: {
      event: {
        include: {
          hostUnit: true,
        },
      },
      campaign: true,
    },
  });

  if (!record) {
    return null;
  }

  return {
    ...mapConop(record),
    situation: record.situation,
    mission: record.mission,
    execution: record.execution,
    sustainment: record.sustainment,
    commandSignal: record.commandSignal,
    mapName: record.mapName,
    modPreset: record.modPreset,
    participatingUnitsSummary: record.participatingUnitsSummary,
    specialInstructions: record.specialInstructions,
  };
}

export async function listAars(filters: AarFilters = {}) {
  const user = await requireAarWorkspaceAccess();
  const scopedUnitIds = getAarScopedUnitIds(user);
  const records = await prisma.aar.findMany({
    where: buildAarWhere(filters, scopedUnitIds),
    include: {
      event: {
        include: {
          hostUnit: true,
        },
      },
      campaign: true,
      submittedBy: true,
      reviewedBy: true,
      attachments: true,
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });

  return {
    aars: records.map(mapAar),
    summary: {
      total: records.length,
      draft: records.filter((record) => record.status === "draft").length,
      pendingMap: records.filter((record) => record.status === "pending-map").length,
      submitted: records.filter((record) => record.status === "submitted").length,
      reviewed: records.filter((record) => record.status === "reviewed").length,
    },
  };
}

export async function getAarDetail(aarId: string): Promise<AarDetail | null> {
  const user = await requireAarWorkspaceAccess();
  const scopedUnitIds = getAarScopedUnitIds(user);
  const record = await prisma.aar.findFirst({
    where: {
      id: aarId,
      deletedAt: null,
      ...buildDocumentScopeWhere(scopedUnitIds),
    },
    include: {
      event: {
        include: {
          hostUnit: true,
        },
      },
      campaign: true,
      submittedBy: true,
      reviewedBy: true,
      attachments: true,
    },
  });

  if (!record) {
    return null;
  }

  return {
    ...mapAar(record),
    summary: record.summary,
    wentWell: record.wentWell,
    needsImprovement: record.needsImprovement,
    friendlyCasualties: record.friendlyCasualties,
    enemyCasualties: record.enemyCasualties,
    equipmentLosses: record.equipmentLosses,
    actionItems: record.actionItems,
    additionalNotes: record.additionalNotes,
    callsigns: record.callsigns,
    dtg: record.dtg,
    ekia: record.ekia,
    fkia: record.fkia,
    fmia: record.fmia,
    fwia: record.fwia,
    report: record.report,
    tasking: record.tasking,
    aarProgressionRecommendation: record.aarProgressionRecommendation,
    aarNextVersionRecommendation: record.aarNextVersionRecommendation,
    aarProgressionDecision: record.aarProgressionDecision,
    aarProgressionNotes: record.aarProgressionNotes,
    aarEnemyActivityNotes: record.aarEnemyActivityNotes,
    aarFriendlyActivityNotes: record.aarFriendlyActivityNotes,
    aarUnitPerformanceNotes: record.aarUnitPerformanceNotes,
    aarTaskingAdjustments: record.aarTaskingAdjustments,
    aarPlanningNotesNextWeek: record.aarPlanningNotesNextWeek,
    aarLessonsLearned: record.aarLessonsLearned,
    attachments: record.attachments.map((attachment) => ({
      attachmentType: attachment.attachmentType,
      createdAt: attachment.createdAt,
      downloadUrl: `/api/aars/attachments/${attachment.id}/download`,
      fileName: attachment.fileName,
      fileSizeBytes: attachment.fileSizeBytes,
      id: attachment.id,
      label: attachment.label,
      mimeType: attachment.mimeType,
    })),
  };
}

export async function getS3DashboardData(): Promise<S3DashboardData> {
  await requirePermission("s3.dashboard.view");

  const [missionData, conopData, aarData] = await Promise.all([
    listMissions(),
    listConops({ status: "draft" }),
    listAars().catch(() => ({
      aars: [] as AarListItem[],
      summary: {
        draft: 0,
        pendingMap: 0,
        reviewed: 0,
        submitted: 0,
        total: 0,
      },
    })),
  ]);
  const visibleCampaignIds = Array.from(
    new Set(
      missionData.missions
        .map((mission) => mission.campaign?.id)
        .filter((campaignId): campaignId is string => Boolean(campaignId)),
    ),
  );
  const campaignRecords =
    visibleCampaignIds.length > 0
      ? await prisma.campaign.findMany({
          where: {
            deletedAt: null,
            status: "active",
            id: {
              in: visibleCampaignIds,
            },
          },
          include: {
            deploymentWeeks: {
              orderBy: {
                weekNumber: "asc",
              },
            },
            operationsReleases: {
              orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
              take: 8,
            },
            events: {
              where: {
                deletedAt: null,
              },
              orderBy: [{ startsAt: "asc" }],
            },
          },
          orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
          take: 6,
        })
      : [];

  const now = new Date();

  return {
    activeCampaigns: campaignRecords.map((campaign) => {
      const nextEvent = campaign.events.find((event) => event.startsAt >= now) ?? null;
      const currentWeekNumber =
        nextEvent?.deploymentWeek ??
        campaign.deploymentWeeks.find((week) => {
          const startsAt = week.startsAt?.getTime() ?? Number.NEGATIVE_INFINITY;
          const endsAt = week.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
          const nowTime = now.getTime();

          return startsAt <= nowTime && nowTime <= endsAt;
        })?.weekNumber ??
        campaign.deploymentWeeks[0]?.weekNumber ??
        null;
      const currentWeek = currentWeekNumber
        ? campaign.deploymentWeeks.find((week) => week.weekNumber === currentWeekNumber)
        : null;
      const currentRelease =
        currentWeekNumber
          ? campaign.operationsReleases.find(
              (release) =>
                release.weekNumber === currentWeekNumber &&
                (release.status === "published" || release.status === "scheduled"),
            ) ?? null
          : null;

      return {
        currentWeekNumber,
        id: campaign.id,
        packageHref: currentWeekNumber
          ? `/operations/packages/${campaign.id}/week/${currentWeekNumber}`
          : null,
        phase: campaign.phase,
        planningStatus: currentWeek?.planningStatus ?? "planning",
        progressPercent:
          campaign.events.length > 0
            ? Math.round(
                (campaign.events.filter((event) => event.status === "completed").length /
                  campaign.events.length) *
                  100,
              )
            : null,
        nextEventTitle: nextEvent?.title ?? null,
        releaseStatus: currentRelease?.status ?? null,
        releaseVersion: currentRelease?.releaseVersion ?? null,
        statusLabel: campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1),
        title: campaign.title,
      };
    }),
    activePatrols: missionData.missions
      .filter((mission) => mission.eventType === "patrol" && mission.status === "published")
      .slice(0, 6),
    upcomingMissions: missionData.missions
      .filter(
        (mission) =>
          mission.missionStatus === "published" &&
          mission.startsAt >= now &&
          mission.status !== "archived" &&
          mission.status !== "cancelled",
      )
      .slice(0, 6),
    draftMissions: missionData.missions
      .filter((mission) => mission.missionStatus === "draft")
      .slice(0, 6),
    awaitingReviewMissions: missionData.missions
      .filter((mission) => mission.missionStatus === "s3-review")
      .slice(0, 6),
    approvedUnpublishedMissions: missionData.missions
      .filter((mission) => mission.missionStatus === "approved")
      .slice(0, 6),
    publishedMissions: missionData.missions
      .filter((mission) => mission.missionStatus === "published")
      .slice(0, 6),
    conopsNeedingReview: conopData.conops.slice(0, 6),
    conopStatusSummary: {
      draft: conopData.summary.draft,
      published: conopData.summary.published,
    },
    attendanceReadiness: {
      trackedMissions: missionData.missions.filter(
        (mission) =>
          mission.missionStatus === "published" ||
          mission.missionStatus === "completed" ||
          mission.missionStatus === "aar-submitted",
      ).length,
      expectedAttendanceCount: missionData.missions.reduce(
        (total, mission) => total + mission.expectedAttendanceCount,
        0,
      ),
      respondedCount: missionData.missions.reduce(
        (total, mission) =>
          total + mission.rsvpCounts.yes + mission.rsvpCounts.no + mission.rsvpCounts.maybe,
        0,
      ),
      missingRsvpCount: missionData.missions.reduce(
        (total, mission) => total + mission.rsvpCounts.missing,
        0,
      ),
      lockedMissionCount: missionData.missions.filter((mission) => mission.attendanceLocked).length,
      unlockedMissionCount: missionData.missions.filter((mission) => !mission.attendanceLocked).length,
    },
    completedMissingAars: missionData.missions
      .filter((mission) => mission.missingAar)
      .slice(0, 6),
    missingScreenshotAars: aarData.aars
      .filter((aar) => aar.event && aar.status === "pending-map")
      .slice(0, 6),
    patrolAarsAwaitingReview: aarData.aars
      .filter((aar) => aar.event && aar.status === "submitted")
      .slice(0, 6),
    recentProgressionRecommendations: aarData.aars
      .filter((aar) => aar.event && aar.status === "reviewed")
      .slice(0, 6),
    recentPatrolReports: aarData.aars
      .filter((aar) => aar.event)
      .slice(0, 6),
    missionMakerAssignments: missionData.missions
      .filter((mission) => mission.startsAt >= now)
      .slice(0, 6)
      .map((mission) => ({
        missionId: mission.id,
        title: mission.title,
        missionMakerName: mission.missionMakerName,
        zeusName: mission.zeusName,
        startsAt: mission.startsAt,
        hostUnitShortName: mission.hostUnit?.shortName ?? null,
      })),
  };
}

export async function getOperationalDocumentsForEvent(eventId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      conops: [] as ConopListItem[],
      aars: [] as AarListItem[],
    };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      hostUnitId: true,
    },
  });

  if (!event) {
    return {
      conops: [] as ConopListItem[],
      aars: [] as AarListItem[],
    };
  }

  const canViewConops =
    can(user, "s3.conops.view") ||
    (event.hostUnitId ? can(user, "s3.conops.view", { unitId: event.hostUnitId }) : false);
  const canViewAars =
    can(user, "s3.aars.view") ||
    (event.hostUnitId ? can(user, "s3.aars.view", { unitId: event.hostUnitId }) : false);

  const [conops, aars] = await Promise.all([
    canViewConops
      ? listConops({ eventId })
      : Promise.resolve({ conops: [] as ConopListItem[] }),
    canViewAars
      ? listAars({ eventId })
      : Promise.resolve({ aars: [] as AarListItem[] }),
  ]);

  return {
    conops: conops.conops,
    aars: aars.aars,
  };
}

export async function getOperationalDocumentsForCampaign(campaignId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      conops: [] as ConopListItem[],
      aars: [] as AarListItem[],
    };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      events: {
        select: {
          hostUnitId: true,
        },
      },
    },
  });

  if (!campaign) {
    return {
      conops: [] as ConopListItem[],
      aars: [] as AarListItem[],
    };
  }

  const scopedUnitIds = campaign.events
    .map((event) => event.hostUnitId)
    .filter((hostUnitId): hostUnitId is string => Boolean(hostUnitId));
  const canViewConops =
    can(user, "s3.conops.view") ||
    scopedUnitIds.some((hostUnitId) => can(user, "s3.conops.view", { unitId: hostUnitId }));
  const canViewAars =
    can(user, "s3.aars.view") ||
    scopedUnitIds.some((hostUnitId) => can(user, "s3.aars.view", { unitId: hostUnitId }));

  const [conops, aars] = await Promise.all([
    canViewConops
      ? listConops({ campaignId })
      : Promise.resolve({ conops: [] as ConopListItem[] }),
    canViewAars
      ? listAars({ campaignId })
      : Promise.resolve({ aars: [] as AarListItem[] }),
  ]);

  return {
    conops: conops.conops,
    aars: aars.aars,
  };
}
