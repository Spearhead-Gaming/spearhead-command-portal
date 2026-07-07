import type { PortalUser } from "@/features/auth/types";
import { prisma } from "@/server/database/client";
import { getDiscordBotHealthSummary } from "@/server/discord/client/health";
import { getScopedUnitIds } from "@/server/events/utils";
import { can, requirePermission } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel";
import {
  calculateAttendanceReadiness,
  calculateCampaignReadiness,
  calculateMemberReadiness,
  calculateQualificationReadiness,
  calculateUnitReadiness,
} from "@/server/dashboard/readiness";
import type {
  CommandDashboardData,
  DashboardActivityItem,
  DashboardListItem,
  DashboardTone,
} from "@/server/dashboard/types";

const noAccessWhere = { in: ["__no-access__"] };

function percentLabel(value: number | null) {
  return value === null ? "N/A" : `${value}%`;
}

function getStatusTone(status: string): DashboardTone {
  if (["active", "published", "approved", "completed", "reviewed", "sent"].includes(status)) {
    return "success";
  }

  if (["planning", "draft", "submitted", "under_review", "s3-review"].includes(status)) {
    return "info";
  }

  if (["loa", "pending", "changes_requested", "paused", "retrying"].includes(status)) {
    return "warning";
  }

  if (["inactive", "cancelled", "archived", "failed", "denied", "absent"].includes(status)) {
    return "danger";
  }

  return "muted";
}

function titleCase(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function unitFilter(unitIds: string[] | null) {
  return unitIds
    ? {
        in: unitIds.length > 0 ? unitIds : noAccessWhere.in,
      }
    : undefined;
}

function buildVisibility(user: PortalUser) {
  return {
    admin: can(user, "admin.dashboard.view") || can(user, "admin.users.view"),
    attendance: can(user, "attendance.reports.view") || can(user, "attendance.view"),
    audit: can(user, "audit.view"),
    campaigns: can(user, "campaigns.statistics.view") || can(user, "campaigns.view"),
    discordHealth: can(user, "discord.bot.health.view"),
    member: Boolean(user.memberProfileId),
    notifications: can(user, "notifications.delivery.view"),
    personnel: can(user, "personnel.profile.view") || can(user, "roster.member.view"),
    qualificationMatrix: can(user, "qualifications.matrix.view"),
    qualifications: can(user, "qualifications.record.view") || can(user, "qualifications.view"),
    roster: can(user, "roster.member.view"),
    s3: can(user, "s3.dashboard.view"),
    units: can(user, "units.dashboard.view"),
  };
}

function mapAuditActivity(entry: {
  action: string;
  createdAt: Date;
  entityId: string | null;
  entityType: string;
  id: string;
  summary: string;
}): DashboardActivityItem {
  const tone = entry.action.includes("failed")
    ? "danger"
    : entry.action.includes("published") ||
        entry.action.includes("approved") ||
        entry.action.includes("awarded") ||
        entry.action.includes("finalized")
      ? "success"
      : entry.action.includes("submitted") || entry.action.includes("created")
        ? "info"
        : "muted";

  return {
    action: entry.action,
    createdAt: entry.createdAt,
    entityType: entry.entityType,
    id: entry.id,
    summary: entry.summary,
    tone,
  };
}

async function getVisibleUnitIds(user: PortalUser) {
  const unitDashboardIds = getScopedUnitIds(user, "units.dashboard.view");
  const rosterIds = getScopedUnitIds(user, "roster.member.view");

  if (unitDashboardIds === null || rosterIds === null) {
    return null;
  }

  return Array.from(new Set([...unitDashboardIds, ...rosterIds, user.primaryUnitId].filter(Boolean))) as string[];
}

async function getCommunityMetrics(unitIds: string[] | null) {
  const now = new Date();
  const memberWhere = {
    deletedAt: null,
    isActive: true,
    ...(unitFilter(unitIds) ? { currentUnitId: unitFilter(unitIds) } : {}),
  };
  const eventWhere = {
    deletedAt: null,
    ...(unitFilter(unitIds) ? { hostUnitId: unitFilter(unitIds) } : {}),
  };

  const [
    totalMembers,
    activeMembers,
    loaMembers,
    inactiveMembers,
    units,
    attendanceRecords,
    upcomingEvents,
    activeCampaigns,
    pendingForms,
    failedNotifications,
    qualifiedRecords,
    missingRequired,
  ] = await Promise.all([
    prisma.memberProfile.count({ where: memberWhere }),
    prisma.memberProfile.count({ where: { ...memberWhere, status: { key: "active" } } }),
    prisma.memberProfile.count({ where: { ...memberWhere, status: { key: "loa" } } }),
    prisma.memberProfile.count({
      where: {
        ...memberWhere,
        status: {
          key: {
            in: ["inactive", "reserve", "retired", "discharged", "banned"],
          },
        },
      },
    }),
    prisma.unit.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(unitFilter(unitIds) ? { id: unitFilter(unitIds) } : {}),
      },
      include: {
        currentMembers: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          include: {
            status: true,
          },
        },
        positions: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 8,
    }),
    prisma.attendanceRecord.findMany({
      where: {
        finalStatus: {
          in: ["present", "late", "absent"],
        },
        event: eventWhere,
      },
      select: {
        finalStatus: true,
      },
    }),
    prisma.event.findMany({
      where: {
        ...eventWhere,
        startsAt: {
          gte: now,
        },
        status: {
          in: ["published", "draft"],
        },
      },
      include: {
        hostUnit: {
          select: {
            shortName: true,
          },
        },
      },
      orderBy: {
        startsAt: "asc",
      },
      take: 5,
    }),
    prisma.campaign.count({
      where: {
        deletedAt: null,
        status: {
          in: ["active", "planning"],
        },
      },
    }),
    prisma.formSubmission.count({
      where: {
        status: {
          key: {
            in: ["submitted", "under_review", "changes_requested"],
          },
        },
        ...(unitFilter(unitIds) ? { targetUnitId: unitFilter(unitIds) } : {}),
      },
    }),
    prisma.notificationDelivery.count({
      where: {
        status: "failed",
      },
    }),
    prisma.memberQualification.count({
      where: {
        revokedAt: null,
        status: "qualified",
        memberProfile: memberWhere,
      },
    }),
    getMissingRequiredQualificationCount(unitIds),
  ]);

  const present = attendanceRecords.filter((record) => record.finalStatus === "present").length;
  const late = attendanceRecords.filter((record) => record.finalStatus === "late").length;
  const absent = attendanceRecords.filter((record) => record.finalStatus === "absent").length;
  const attendanceAverage = calculateAttendanceReadiness({ absent, late, present });
  const qualificationReadiness = calculateQualificationReadiness({
    missingRequired,
    qualified: qualifiedRecords,
  });
  const discordHealth = getDiscordBotHealthSummary();

  return {
    activeCampaigns,
    activeMembers,
    attendanceAverage,
    discordHealthLabel: discordHealth.statusLabel,
    failedNotifications,
    inactiveMembers,
    loaMembers,
    pendingForms,
    qualificationReadiness,
    totalMembers,
    unitStrength: units.map((unit) => {
      const active = unit.currentMembers.filter((member) => member.status.key === "active").length;
      const loa = unit.currentMembers.filter((member) => member.status.key === "loa").length;
      const inactive = unit.currentMembers.filter((member) =>
        ["inactive", "reserve"].includes(member.status.key),
      ).length;
      const openBillets = Math.max(unit.positions.length - unit.currentMembers.length, 0);

      return {
        href: `/units/${unit.key}`,
        id: unit.id,
        label: unit.shortName,
        meta: `${active} active / ${loa} LOA / ${openBillets} open billets`,
        statusLabel: `${calculateUnitReadiness({ active, inactive, loa, openBillets }) ?? 0}%`,
        tone: active > 0 ? "success" : "muted",
      } satisfies DashboardListItem;
    }),
    upcomingEvents: upcomingEvents.map((event) => ({
      href: `/operations/events/${event.id}`,
      id: event.id,
      label: event.title,
      meta: `${event.hostUnit?.shortName ?? "Global"} / ${event.startsAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
      statusLabel: titleCase(event.status),
      tone: getStatusTone(event.status),
    })),
  };
}

async function getMissingRequiredQualificationCount(unitIds: string[] | null) {
  const members = await prisma.memberProfile.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(unitFilter(unitIds) ? { currentUnitId: unitFilter(unitIds) } : {}),
      currentUnitId: {
        not: null,
        ...(unitFilter(unitIds) ?? {}),
      },
    },
    select: {
      currentPositionId: true,
      currentUnitId: true,
      qualifications: {
        where: {
          revokedAt: null,
          status: "qualified",
        },
        select: {
          qualificationId: true,
        },
      },
    },
  });
  const requirements = await prisma.qualificationRequirement.findMany({
    where: {
      isRequired: true,
      OR: [
        {
          unitId: {
            not: null,
            ...(unitFilter(unitIds) ?? {}),
          },
        },
        {
          positionId: {
            not: null,
          },
        },
      ],
    },
    select: {
      positionId: true,
      qualificationId: true,
      unitId: true,
    },
  });

  return members.reduce((total, member) => {
    const earned = new Set(member.qualifications.map((record) => record.qualificationId));
    const required = requirements.filter(
      (requirement) =>
        requirement.unitId === member.currentUnitId ||
        (requirement.positionId && requirement.positionId === member.currentPositionId),
    );

    return total + required.filter((requirement) => !earned.has(requirement.qualificationId)).length;
  }, 0);
}

async function getMemberDashboard(user: PortalUser) {
  if (!user.memberProfileId) {
    return {
      attendancePercent: null,
      campaignLabel: "No active campaign",
      currentModPreset: null,
      discordLinked: user.discordLinked,
      missingRequiredQualifications: 0,
      nextEvent: null,
      profileLinked: false,
      qualificationCount: 0,
      unitLabel: user.unit,
    };
  }

  const now = new Date();
  const [profile, attendanceRecords, qualificationCount, nextEvent, activeCampaign] = await Promise.all([
    prisma.memberProfile.findUnique({
      where: {
        id: user.memberProfileId,
      },
      include: {
        currentUnit: true,
        currentPosition: true,
        status: true,
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        memberProfileId: user.memberProfileId,
        finalStatus: {
          in: ["present", "late", "absent"],
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 12,
    }),
    prisma.memberQualification.count({
      where: {
        memberProfileId: user.memberProfileId,
        revokedAt: null,
        status: "qualified",
      },
    }),
    prisma.event.findFirst({
      where: {
        deletedAt: null,
        startsAt: {
          gte: now,
        },
        status: "published",
        OR: [
          {
            hostUnitId: user.primaryUnitId,
          },
          {
            hostUnitId: null,
          },
        ],
      },
      orderBy: {
        startsAt: "asc",
      },
      include: {
        hostUnit: {
          select: {
            shortName: true,
          },
        },
      },
    }),
    prisma.campaign.findFirst({
      where: {
        deletedAt: null,
        status: {
          in: ["active", "planning"],
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const present = attendanceRecords.filter((record) => record.finalStatus === "present").length;
  const late = attendanceRecords.filter((record) => record.finalStatus === "late").length;
  const absent = attendanceRecords.filter((record) => record.finalStatus === "absent").length;
  const attendancePercent = calculateAttendanceReadiness({ absent, late, present });
  const missingRequiredQualifications = await getMemberMissingRequiredQualificationCount(user.memberProfileId);
  const currentPreset = activeCampaign
    ? await prisma.deploymentResource.findFirst({
        where: {
          campaignId: activeCampaign.id,
          isArchived: false,
          resourceType: "ARMA3_PRESET",
          visibility: "members",
        },
        include: {
          versions: {
            where: {
              isCurrent: true,
            },
            orderBy: {
              versionNumber: "desc",
            },
            take: 1,
          },
        },
      })
    : null;
  const currentPresetVersion = currentPreset?.versions[0] ?? null;

  return {
    attendancePercent,
    campaignLabel: activeCampaign?.title ?? "No active campaign",
    currentModPreset:
      activeCampaign && currentPreset && currentPresetVersion
        ? {
            href:
              currentPresetVersion.sourceType === "file"
                ? `/api/deployment-resources/${currentPresetVersion.id}/download`
                : (currentPresetVersion.url ?? `/operations/campaigns/${activeCampaign.id}`),
            id: currentPreset.id,
            label: currentPresetVersion.parsedName ?? currentPreset.displayName,
            meta: `${activeCampaign.title} / ${
              currentPresetVersion.parsedModCount !== null
                ? `${currentPresetVersion.parsedModCount} mods`
                : "Mod count unavailable"
            }`,
            statusLabel: "Current Mod Preset",
            tone: "info" as const,
          }
        : null,
    discordLinked: user.discordLinked,
    missingRequiredQualifications,
    nextEvent: nextEvent
      ? {
          href: `/operations/events/${nextEvent.id}`,
          id: nextEvent.id,
          label: nextEvent.title,
          meta: `${nextEvent.hostUnit?.shortName ?? "Global"} / ${nextEvent.startsAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`,
          statusLabel: "Next event",
          tone: "info" as const,
        }
      : null,
    profileLinked: Boolean(profile),
    profileStatusKey: profile?.status.key ?? null,
    qualificationCount,
    unitLabel: profile?.currentUnit?.name ?? user.unit,
  };
}

async function getMemberMissingRequiredQualificationCount(memberProfileId: string) {
  const member = await prisma.memberProfile.findUnique({
    where: {
      id: memberProfileId,
    },
    select: {
      currentPositionId: true,
      currentUnitId: true,
      qualifications: {
        where: {
          revokedAt: null,
          status: "qualified",
        },
        select: {
          qualificationId: true,
        },
      },
    },
  });

  if (!member) {
    return 0;
  }

  const requirements = await prisma.qualificationRequirement.findMany({
    where: {
      isRequired: true,
      OR: [
        {
          unitId: member.currentUnitId,
        },
        {
          positionId: member.currentPositionId,
        },
      ],
    },
    select: {
      qualificationId: true,
    },
  });
  const earned = new Set(member.qualifications.map((record) => record.qualificationId));

  return requirements.filter((requirement) => !earned.has(requirement.qualificationId)).length;
}

async function getUnitLeadershipDashboard(unitIds: string[] | null) {
  if (unitIds?.length === 0) {
    return {
      attendanceIssues: [],
      missingQualifications: [],
      recentRosterChanges: [],
      unitReadiness: [],
    };
  }

  const [units, missingQualifications, attendanceIssues, recentRosterChanges] = await Promise.all([
    prisma.unit.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(unitFilter(unitIds) ? { id: unitFilter(unitIds) } : {}),
      },
      include: {
        currentMembers: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          include: {
            status: true,
          },
        },
        positions: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 6,
    }),
    getTopMissingQualificationItems(unitIds),
    getAttendanceIssueItems(unitIds),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            "personnel.profile.created",
            "personnel.profile.status_changed",
            "roster.assignment.changed",
            "roster.unit.changed",
            "roster.position.changed",
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  return {
    attendanceIssues,
    missingQualifications,
    recentRosterChanges: recentRosterChanges.map(mapAuditActivity),
    unitReadiness: units.map((unit) => {
      const active = unit.currentMembers.filter((member) => member.status.key === "active").length;
      const loa = unit.currentMembers.filter((member) => member.status.key === "loa").length;
      const inactive = unit.currentMembers.filter((member) =>
        ["inactive", "reserve"].includes(member.status.key),
      ).length;
      const openBillets = Math.max(unit.positions.length - unit.currentMembers.length, 0);
      const readiness = calculateUnitReadiness({ active, inactive, loa, openBillets });

      return {
        href: `/units/${unit.key}`,
        id: unit.id,
        label: unit.shortName,
        meta: `${active} active, ${openBillets} open billets`,
        statusLabel: percentLabel(readiness),
        tone: readiness !== null && readiness >= 75 ? "success" : "warning",
      } satisfies DashboardListItem;
    }),
  };
}

async function getTopMissingQualificationItems(unitIds: string[] | null) {
  const members = await prisma.memberProfile.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(unitFilter(unitIds) ? { currentUnitId: unitFilter(unitIds) } : {}),
    },
    select: {
      currentPositionId: true,
      currentUnitId: true,
      qualifications: {
        where: {
          revokedAt: null,
          status: "qualified",
        },
        select: {
          qualificationId: true,
        },
      },
    },
  });
  const requirements = await prisma.qualificationRequirement.findMany({
    where: {
      isRequired: true,
      OR: [
        {
          unitId: {
            not: null,
            ...(unitFilter(unitIds) ?? {}),
          },
        },
        {
          positionId: {
            not: null,
          },
        },
      ],
    },
    include: {
      qualification: {
        select: {
          label: true,
        },
      },
    },
  });
  const missingCounts = new Map<string, { count: number; label: string }>();

  for (const member of members) {
    const earned = new Set(member.qualifications.map((record) => record.qualificationId));
    const required = requirements.filter(
      (requirement) =>
        requirement.unitId === member.currentUnitId ||
        (requirement.positionId && requirement.positionId === member.currentPositionId),
    );

    for (const requirement of required) {
      if (earned.has(requirement.qualificationId)) {
        continue;
      }

      const current = missingCounts.get(requirement.qualificationId) ?? {
        count: 0,
        label: requirement.qualification.label,
      };

      missingCounts.set(requirement.qualificationId, {
        ...current,
        count: current.count + 1,
      });
    }
  }

  return Array.from(missingCounts.entries())
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, 5)
    .map(([id, value]) => ({
      href: "/training/qualification-matrix",
      id,
      label: value.label,
      meta: `${value.count} missing requirement${value.count === 1 ? "" : "s"}`,
      statusLabel: "Training gap",
      tone: "warning" as const,
    }));
}

async function getAttendanceIssueItems(unitIds: string[] | null) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      startsAt: {
        gte: now,
      },
      status: "published",
      ...(unitFilter(unitIds) ? { hostUnitId: unitFilter(unitIds) } : {}),
    },
    include: {
      attendanceRecords: {
        select: {
          rsvpStatus: true,
        },
      },
      hostUnit: {
        include: {
          currentMembers: {
            where: {
              deletedAt: null,
              isActive: true,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: {
      startsAt: "asc",
    },
    take: 8,
  });

  return events
    .map((event) => {
      const expected = event.hostUnit?.currentMembers.length ?? 0;
      const responded = event.attendanceRecords.filter((record) => record.rsvpStatus !== null).length;
      const missing = Math.max(expected - responded, 0);

      return {
        href: `/operations/events/${event.id}`,
        id: event.id,
        label: event.title,
        meta: `${missing} missing RSVP${missing === 1 ? "" : "s"}`,
        statusLabel: event.hostUnit?.shortName ?? "Global",
        tone: missing > 0 ? "warning" : ("success" as const),
      } satisfies DashboardListItem;
    })
    .filter((item) => item.tone === "warning")
    .slice(0, 5);
}

async function getPersonnelDashboard(unitIds: string[] | null) {
  const [statusGroups, unlinkedUsers, pendingApplications, recentChanges] = await Promise.all([
    prisma.profileStatus.findMany({
      include: {
        _count: {
          select: {
            profiles: {
              where: {
                deletedAt: null,
                isActive: true,
                ...(unitFilter(unitIds) ? { currentUnitId: unitFilter(unitIds) } : {}),
              },
            },
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        isActive: true,
        memberProfile: null,
      },
    }),
    prisma.formSubmission.count({
      where: {
        status: {
          key: {
            in: ["submitted", "under_review", "changes_requested"],
          },
        },
        template: {
          formType: {
            in: ["recruit_application", "unit_transfer_request", "loa_request"],
          },
        },
        ...(unitFilter(unitIds) ? { targetUnitId: unitFilter(unitIds) } : {}),
      },
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: "personnel.",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    }),
  ]);

  return {
    pendingApplications,
    recentChanges: recentChanges.map(mapAuditActivity),
    statusBreakdown: statusGroups
      .filter((status) => status._count.profiles > 0)
      .map((status) => ({
        href: `/personnel/members?statusId=${status.id}`,
        id: status.id,
        label: status.label,
        meta: `${status._count.profiles} member${status._count.profiles === 1 ? "" : "s"}`,
        statusLabel: titleCase(status.key),
        tone: getStatusTone(status.key),
      })),
    unlinkedUsers,
  };
}

async function getS3Dashboard(unitIds: string[] | null) {
  const now = new Date();
  const eventUnitWhere = unitFilter(unitIds) ? { hostUnitId: unitFilter(unitIds) } : {};
  const [activeCampaigns, upcomingMissions, missionReviewQueue, approvedUnpublishedMissions, conopReviewQueue, aarQueue] =
    await Promise.all([
      prisma.campaign.findMany({
        where: {
          deletedAt: null,
          status: {
            in: ["active", "planning"],
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
      }),
      prisma.event.findMany({
        where: {
          deletedAt: null,
          startsAt: {
            gte: now,
          },
          missionStatus: {
            in: ["draft", "s3-review", "approved", "published"],
          },
          ...eventUnitWhere,
        },
        include: {
          hostUnit: {
            select: {
              shortName: true,
            },
          },
        },
        orderBy: {
          startsAt: "asc",
        },
        take: 5,
      }),
      prisma.event.count({
        where: {
          deletedAt: null,
          missionStatus: "s3-review",
          ...eventUnitWhere,
        },
      }),
      prisma.event.count({
        where: {
          deletedAt: null,
          missionStatus: "approved",
          ...eventUnitWhere,
        },
      }),
      prisma.conop.count({
        where: {
          deletedAt: null,
          status: "draft",
          event: eventUnitWhere,
        },
      }),
      prisma.aar.count({
        where: {
          deletedAt: null,
          status: "submitted",
          event: eventUnitWhere,
        },
      }),
    ]);

  return {
    activeCampaigns: activeCampaigns.map((campaign) => ({
      href: `/operations/campaigns/${campaign.id}`,
      id: campaign.id,
      label: campaign.title,
      meta: campaign.phase ?? "No phase set",
      statusLabel: titleCase(campaign.status),
      tone: getStatusTone(campaign.status),
    })),
    aarQueue,
    approvedUnpublishedMissions,
    conopReviewQueue,
    missionReviewQueue,
    upcomingMissions: upcomingMissions.map((event) => ({
      href: `/operations/events/${event.id}`,
      id: event.id,
      label: event.title,
      meta: `${event.hostUnit?.shortName ?? "Global"} / ${event.startsAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
      statusLabel: titleCase(event.missionStatus),
      tone: getStatusTone(event.missionStatus),
    })),
  };
}

async function getTrainingDashboard(unitIds: string[] | null) {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 30);

  const [totalQualifications, qualifiedMemberIds, missingRequired, pendingSignoffs, expiringSoon, unitReadiness] =
    await Promise.all([
      prisma.qualification.count({
        where: {
          isActive: true,
        },
      }),
      prisma.memberQualification.findMany({
        where: {
          revokedAt: null,
          status: "qualified",
          memberProfile: {
            deletedAt: null,
            isActive: true,
            ...(unitFilter(unitIds) ? { currentUnitId: unitFilter(unitIds) } : {}),
          },
        },
        distinct: ["memberProfileId"],
        select: {
          memberProfileId: true,
        },
      }),
      getMissingRequiredQualificationCount(unitIds),
      prisma.memberQualification.count({
        where: {
          revokedAt: null,
          status: "pending_signoff",
          memberProfile: {
            deletedAt: null,
            isActive: true,
            ...(unitFilter(unitIds) ? { currentUnitId: unitFilter(unitIds) } : {}),
          },
        },
      }),
      prisma.memberQualification.count({
        where: {
          expiresAt: {
            gte: now,
            lte: soon,
          },
          revokedAt: null,
          status: "qualified",
          memberProfile: {
            deletedAt: null,
            isActive: true,
            ...(unitFilter(unitIds) ? { currentUnitId: unitFilter(unitIds) } : {}),
          },
        },
      }),
      getUnitQualificationReadinessItems(unitIds),
    ]);

  return {
    expiringSoon,
    missingRequired,
    pendingSignoffs,
    qualifiedMemberCount: qualifiedMemberIds.length,
    totalQualifications,
    unitQualificationReadiness: unitReadiness,
  };
}

async function getUnitQualificationReadinessItems(unitIds: string[] | null) {
  const units = await prisma.unit.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(unitFilter(unitIds) ? { id: unitFilter(unitIds) } : {}),
    },
    include: {
      currentMembers: {
        where: {
          deletedAt: null,
          isActive: true,
        },
        include: {
          qualifications: {
            where: {
              revokedAt: null,
              status: "qualified",
            },
            select: {
              qualificationId: true,
            },
          },
        },
      },
      qualificationRequirements: {
        where: {
          isRequired: true,
        },
        select: {
          qualificationId: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 6,
  });

  return units.map((unit) => {
    const missing = unit.currentMembers.reduce((total, member) => {
      const earned = new Set(member.qualifications.map((record) => record.qualificationId));

      return (
        total +
        unit.qualificationRequirements.filter(
          (requirement) => !earned.has(requirement.qualificationId),
        ).length
      );
    }, 0);
    const qualified = Math.max(
      0,
      unit.currentMembers.length * unit.qualificationRequirements.length - missing,
    );
    const readiness = calculateQualificationReadiness({
      missingRequired: missing,
      qualified,
    });

    return {
      href: `/units/${unit.key}`,
      id: unit.id,
      label: unit.shortName,
      meta: `${missing} missing / ${unit.qualificationRequirements.length} required quals`,
      statusLabel: percentLabel(readiness),
      tone: readiness !== null && readiness >= 75 ? "success" : "warning",
    } satisfies DashboardListItem;
  });
}

async function getAttendanceDashboard(unitIds: string[] | null) {
  const [records, lowAttendanceMembers, openAttendanceEvents, recentNoShows] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        finalStatus: {
          in: ["present", "late", "absent"],
        },
        event: {
          ...(unitFilter(unitIds) ? { hostUnitId: unitFilter(unitIds) } : {}),
        },
      },
      select: {
        finalStatus: true,
      },
    }),
    getLowAttendanceMembers(unitIds),
    getOpenAttendanceEvents(unitIds),
    getRecentNoShows(unitIds),
  ]);
  const present = records.filter((record) => record.finalStatus === "present").length;
  const late = records.filter((record) => record.finalStatus === "late").length;
  const absent = records.filter((record) => record.finalStatus === "absent").length;

  return {
    averageAttendance: calculateAttendanceReadiness({ absent, late, present }),
    lowAttendanceMembers,
    missingRsvps: openAttendanceEvents.reduce((total, item) => {
      const match = item.meta.match(/^(\d+)/);

      return total + (match ? Number(match[1]) : 0);
    }, 0),
    openAttendanceEvents,
    recentNoShows,
  };
}

async function getLowAttendanceMembers(unitIds: string[] | null) {
  const members = await prisma.memberProfile.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(unitFilter(unitIds) ? { currentUnitId: unitFilter(unitIds) } : {}),
    },
    include: {
      attendanceRecords: {
        where: {
          finalStatus: {
            in: ["present", "late", "absent"],
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 8,
      },
      user: {
        select: {
          displayName: true,
          email: true,
          name: true,
        },
      },
    },
    take: 50,
  });

  return members
    .map((member) => {
      const present = member.attendanceRecords.filter((record) => record.finalStatus === "present").length;
      const late = member.attendanceRecords.filter((record) => record.finalStatus === "late").length;
      const absent = member.attendanceRecords.filter((record) => record.finalStatus === "absent").length;
      const attendance = calculateAttendanceReadiness({ absent, late, present });

      return {
        href: `/personnel/members/${member.id}`,
        id: member.id,
        label: getMemberDisplayName(member),
        meta: `${member.attendanceRecords.length} recent accountable event${member.attendanceRecords.length === 1 ? "" : "s"}`,
        statusLabel: percentLabel(attendance),
        tone: attendance !== null && attendance < 70 ? "warning" : ("success" as const),
      } satisfies DashboardListItem;
    })
    .filter((item) => item.tone === "warning")
    .slice(0, 5);
}

async function getOpenAttendanceEvents(unitIds: string[] | null) {
  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
      status: {
        in: ["published", "completed"],
      },
      ...(unitFilter(unitIds) ? { hostUnitId: unitFilter(unitIds) } : {}),
    },
    include: {
      attendanceRecords: {
        select: {
          finalStatus: true,
          lockedAt: true,
        },
      },
      hostUnit: {
        select: {
          shortName: true,
        },
      },
    },
    orderBy: {
      startsAt: "desc",
    },
    take: 10,
  });

  return events
    .filter(
      (event) =>
        event.attendanceRecords.length === 0 ||
        event.attendanceRecords.some((record) => !record.finalStatus || !record.lockedAt),
    )
    .slice(0, 5)
    .map((event) => ({
      href: `/operations/events/${event.id}`,
      id: event.id,
      label: event.title,
      meta: `${event.attendanceRecords.filter((record) => !record.finalStatus).length} pending final statuses`,
      statusLabel: event.hostUnit?.shortName ?? "Global",
      tone: "warning" as const,
    }));
}

async function getRecentNoShows(unitIds: string[] | null) {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      finalStatus: "absent",
      rsvpStatus: "yes",
      event: {
        ...(unitFilter(unitIds) ? { hostUnitId: unitFilter(unitIds) } : {}),
      },
    },
    include: {
      event: true,
      memberProfile: {
        include: {
          user: {
            select: {
              displayName: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 5,
  });

  return records.map((record) => ({
    href: `/personnel/members/${record.memberProfileId}`,
    id: record.id,
    label: getMemberDisplayName(record.memberProfile),
    meta: record.event.title,
    statusLabel: "No-show",
    tone: "danger" as const,
  }));
}

async function getAdminDashboard() {
  const [auditActivity, failedDeliveries, connectedServers, usersWithoutProfiles] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.notificationDelivery.findMany({
      where: {
        status: {
          in: ["failed", "retrying", "pending"],
        },
      },
      include: {
        notification: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    }),
    prisma.discordServer.count({
      where: {
        isActive: true,
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        isActive: true,
        memberProfile: null,
      },
    }),
  ]);
  const discordHealth = getDiscordBotHealthSummary();

  return {
    auditActivity: auditActivity.map(mapAuditActivity),
    discordConnectedServers: connectedServers,
    discordStatusLabel: discordHealth.statusLabel,
    failedDeliveries: failedDeliveries.map((delivery) => ({
      href: "/administration/notifications",
      id: delivery.id,
      label: delivery.notification.title,
      meta: delivery.errorMessage ?? delivery.destinationKey,
      statusLabel: titleCase(delivery.status),
      tone: getStatusTone(delivery.status),
    })),
    pendingSystemActions: [
      {
        href: "/administration/users",
        id: "unlinked-users",
        label: "Users without member profiles",
        meta: `${usersWithoutProfiles} account${usersWithoutProfiles === 1 ? "" : "s"} need linking`,
        statusLabel: usersWithoutProfiles > 0 ? "Action" : "Clear",
        tone: usersWithoutProfiles > 0 ? "warning" : ("success" as const),
      },
      {
        href: "/administration/discord",
        id: "discord-health",
        label: "Discord health",
        meta: discordHealth.statusLabel,
        statusLabel: connectedServers > 0 ? "Mapped" : "No servers",
        tone: discordHealth.summaryTone,
      },
    ] satisfies DashboardListItem[],
  };
}

export async function getCommandDashboardData(): Promise<CommandDashboardData> {
  const user = await requirePermission("core.dashboard.view");
  const visibility = buildVisibility(user);
  const visibleUnitIds = await getVisibleUnitIds(user);
  const unitScopedIds = visibleUnitIds ?? null;

  const [
    community,
    member,
    unitLeadership,
    personnel,
    s3,
    training,
    attendance,
    admin,
    campaignEvents,
  ] = await Promise.all([
    getCommunityMetrics(unitScopedIds),
    getMemberDashboard(user),
    visibility.units
      ? getUnitLeadershipDashboard(unitScopedIds)
      : Promise.resolve({
          attendanceIssues: [],
          missingQualifications: [],
          recentRosterChanges: [],
          unitReadiness: [],
        }),
    visibility.personnel
      ? getPersonnelDashboard(unitScopedIds)
      : Promise.resolve({
          pendingApplications: 0,
          recentChanges: [],
          statusBreakdown: [],
          unlinkedUsers: 0,
        }),
    visibility.s3
      ? getS3Dashboard(unitScopedIds)
      : Promise.resolve({
          activeCampaigns: [],
          aarQueue: 0,
          approvedUnpublishedMissions: 0,
          conopReviewQueue: 0,
          missionReviewQueue: 0,
          upcomingMissions: [],
        }),
    visibility.qualifications || visibility.qualificationMatrix
      ? getTrainingDashboard(unitScopedIds)
      : Promise.resolve({
          expiringSoon: 0,
          missingRequired: 0,
          pendingSignoffs: 0,
          qualifiedMemberCount: 0,
          totalQualifications: 0,
          unitQualificationReadiness: [],
        }),
    visibility.attendance
      ? getAttendanceDashboard(unitScopedIds)
      : Promise.resolve({
          averageAttendance: null,
          lowAttendanceMembers: [],
          missingRsvps: 0,
          openAttendanceEvents: [],
          recentNoShows: [],
        }),
    visibility.admin || visibility.audit || visibility.notifications || visibility.discordHealth
      ? getAdminDashboard()
      : Promise.resolve({
          auditActivity: [],
          discordConnectedServers: 0,
          discordStatusLabel: "Hidden",
          failedDeliveries: [],
          pendingSystemActions: [],
        }),
    prisma.event.findMany({
      where: {
        deletedAt: null,
        status: {
          in: ["completed", "published"],
        },
        ...(unitFilter(unitScopedIds) ? { hostUnitId: unitFilter(unitScopedIds) } : {}),
      },
      select: {
        status: true,
      },
    }),
  ]);

  const completedEvents = campaignEvents.filter((event) => event.status === "completed").length;

  return {
    admin,
    attendance,
    community,
    member,
    personnel,
    readiness: {
      attendancePercent: attendance.averageAttendance ?? community.attendanceAverage,
      campaignPercent: calculateCampaignReadiness({
        completedEvents,
        totalEvents: campaignEvents.length,
      }),
      memberPercent: calculateMemberReadiness({
        activeAssignment: Boolean(member.unitLabel),
        attendancePercent: member.attendancePercent,
        missingRequiredQualifications: member.missingRequiredQualifications,
        profileStatusKey: "active",
      }),
      qualificationPercent: community.qualificationReadiness,
      unitPercent:
        unitLeadership.unitReadiness.length > 0
          ? Math.round(
              unitLeadership.unitReadiness.reduce((total, item) => {
                const value = item.statusLabel?.endsWith("%")
                  ? Number(item.statusLabel.replace("%", ""))
                  : 0;

                return total + value;
              }, 0) / unitLeadership.unitReadiness.length,
            )
          : null,
    },
    s3,
    training,
    unitLeadership,
    visibility,
  };
}
