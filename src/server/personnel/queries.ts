import { Prisma } from "@prisma/client";

import type { PortalUser } from "@/features/auth/types";
import { formatDate } from "@/lib/formatters";
import { getMemberAttendanceSummary } from "@/server/attendance";
import { prisma } from "@/server/database/client";
import { can, requirePermission } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel/display-name";
import { buildMemberReadiness, getMissingQualificationLabels } from "@/server/personnel/readiness";
import { listMemberQualifications } from "@/server/qualifications";
import type {
  MemberAuditLogItem,
  MemberCampaignParticipationSummary,
  MemberDetail,
  MemberProfileDashboardData,
  MemberServiceLogItem,
  MemberServiceTimelineEntry,
  MemberListItem,
  PersonnelFilters,
  PersonnelReferenceData,
  RosterAssignmentListItem,
  RosterFilters,
} from "@/server/personnel/types";

const noAccessWhere = { in: ["__no-access__"] };

function normalizeFilterValue(value?: string) {
  return value?.trim() ? value.trim() : undefined;
}

function getPermissionScope(user: PortalUser, permissionKey: string) {
  const matchingGrants = user.permissionGrants.filter(
    (grant) => grant.key === permissionKey,
  );

  return {
    global: matchingGrants.some((grant) => grant.unitId === null),
    unitIds: Array.from(
      new Set(
        matchingGrants
          .map((grant) => grant.unitId)
          .filter((unitId): unitId is string => Boolean(unitId)),
      ),
    ),
  };
}

function buildMemberScopeWhere(user: PortalUser, permissionKey: string) {
  const scope = getPermissionScope(user, permissionKey);

  if (scope.global) {
    return {};
  }

  return {
    currentUnitId: {
      in: scope.unitIds.length > 0 ? scope.unitIds : noAccessWhere.in,
    },
  };
}

function buildMemberFilterWhere(filters: PersonnelFilters | RosterFilters) {
  const q = normalizeFilterValue(filters.q);
  const unitId = normalizeFilterValue(filters.unitId);
  const rankId = normalizeFilterValue(filters.rankId);
  const statusId = normalizeFilterValue(filters.statusId);
  const positionId = normalizeFilterValue(filters.positionId);
  const andClauses: Prisma.MemberProfileWhereInput[] = [];

  if (q) {
    andClauses.push({
      OR: [
        { displayName: { contains: q } },
        { callsign: { contains: q } },
        { user: { is: { displayName: { contains: q } } } },
        { user: { is: { name: { contains: q } } } },
        { user: { is: { email: { contains: q } } } },
      ],
    });
  }

  if (unitId) {
    andClauses.push({ currentUnitId: unitId });
  }

  if (rankId) {
    andClauses.push({ rankId });
  }

  if (statusId) {
    andClauses.push({ statusId });
  }

  if (positionId) {
    andClauses.push({ currentPositionId: positionId });
  }

  return andClauses;
}

function mapMemberProfile(
  profile: {
    id: string;
    displayName: string;
    callsign: string | null;
    joinDate: Date | null;
    updatedAt: Date;
    currentRank: { id: string; label: string; abbreviation: string } | null;
    currentUnit: { id: string; key: string; name: string; shortName: string } | null;
    currentPosition: { id: string; title: string } | null;
    status: { id: string; key: string; label: string };
    user: {
      id: string;
      displayName: string | null;
      name: string | null;
      email: string | null;
    } | null;
  },
): MemberListItem {
  return {
    id: profile.id,
    displayName: getMemberDisplayName(profile),
    callsign: profile.callsign,
    joinDate: profile.joinDate,
    lastUpdatedAt: profile.updatedAt,
    discordLinked: Boolean(profile.user?.id),
    rank: profile.currentRank,
    unit: profile.currentUnit,
    position: profile.currentPosition,
    status: profile.status,
  };
}

function getActorDisplayName(actor: {
  displayName: string | null;
  name: string | null;
  email: string | null;
} | null) {
  return actor?.displayName ?? actor?.name ?? actor?.email ?? null;
}

function formatDurationParts(from: Date | null, to = new Date()) {
  if (!from) {
    return "Not recorded";
  }

  const totalMonths =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  const normalizedMonths = Math.max(0, totalMonths);
  const years = Math.floor(normalizedMonths / 12);
  const months = normalizedMonths % 12;

  if (years <= 0 && months <= 0) {
    const totalDays = Math.max(
      0,
      Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return `${totalDays}d`;
  }

  if (years > 0 && months > 0) {
    return `${years}y ${months}m`;
  }

  if (years > 0) {
    return `${years}y`;
  }

  return `${months}m`;
}

function getScopedUnitIds(user: PortalUser, permissionKey: string) {
  const scope = getPermissionScope(user, permissionKey);

  return scope.global ? null : scope.unitIds;
}

function mapServiceLogItem(entry: {
  id: string;
  action: string;
  summary: string;
  reason: string | null;
  createdAt: Date;
  actor: {
    displayName: string | null;
    name: string | null;
    email: string | null;
  } | null;
}): MemberServiceLogItem {
  return {
    id: entry.id,
    action: entry.action,
    summary: entry.summary,
    createdAt: entry.createdAt,
    actorDisplayName: getActorDisplayName(entry.actor),
    reason: entry.reason,
  };
}

function mapAuditLogItem(entry: {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  reason: string | null;
  createdAt: Date;
  actor: {
    displayName: string | null;
    name: string | null;
    email: string | null;
  } | null;
}): MemberAuditLogItem {
  return {
    ...mapServiceLogItem(entry),
    entityType: entry.entityType,
    entityId: entry.entityId,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    metadata: entry.metadata,
  };
}

export async function getPersonnelReferenceData(): Promise<PersonnelReferenceData> {
  const [statuses, ranks, units, positions] = await Promise.all([
    prisma.profileStatus.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.rank.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { abbreviation: "asc" }],
    }),
    prisma.unit.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.position.findMany({
      where: { isActive: true },
      include: {
        unit: true,
      },
      orderBy: [{ unit: { sortOrder: "asc" } }, { sortOrder: "asc" }, { title: "asc" }],
    }),
  ]);

  return {
    statuses: statuses.map((status) => ({
      id: status.id,
      label: status.label,
      key: status.key,
    })),
    ranks: ranks.map((rank) => ({
      id: rank.id,
      label: rank.abbreviation,
      key: rank.key,
      hint: rank.label,
    })),
    units: units.map((unit) => ({
      id: unit.id,
      label: unit.name,
      key: unit.key,
      hint: unit.shortName,
    })),
    positions: positions.map((position) => ({
      id: position.id,
      label: `${position.title} (${position.unit.shortName})`,
      key: position.key,
      hint: position.unit.name,
    })),
  };
}

export async function listMembers(filters: PersonnelFilters = {}) {
  const user = await requirePermission("personnel.profile.view");
  const scopedWhere = buildMemberScopeWhere(user, "personnel.profile.view");
  const filterWhere = buildMemberFilterWhere(filters);

  if (filters.discordLinked === "linked") {
    filterWhere.push({
      user: {
        isNot: null,
      },
    });
  }

  if (filters.discordLinked === "unlinked") {
    filterWhere.push({
      user: null,
    });
  }

  const where: Prisma.MemberProfileWhereInput = {
    isActive: true,
    deletedAt: null,
    ...scopedWhere,
    AND: filterWhere,
  };

  const [profiles, totalProfiles, linkedProfiles, activeProfiles, reviewProfiles] =
    await Promise.all([
      prisma.memberProfile.findMany({
        where,
        include: {
          currentRank: true,
          currentUnit: true,
          currentPosition: true,
          status: true,
          user: {
            select: {
              id: true,
              displayName: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ displayName: "asc" }],
      }),
      prisma.memberProfile.count({ where }),
      prisma.memberProfile.count({
        where: {
          ...where,
          user: {
            isNot: null,
          },
        },
      }),
      prisma.memberProfile.count({
        where: {
          ...where,
          status: {
            key: "active",
          },
        },
      }),
      prisma.memberProfile.count({
        where: {
          ...where,
          OR: [{ user: null }, { status: { key: { in: ["applicant", "recruit"] } } }],
        },
      }),
    ]);

  return {
    user,
    members: profiles.map(mapMemberProfile),
    summary: {
      totalProfiles,
      linkedProfiles,
      activeProfiles,
      reviewProfiles,
    },
  };
}

export async function getMemberProfile(id: string): Promise<MemberDetail | null> {
  const user = await requirePermission("personnel.profile.view");
  const profile = await prisma.memberProfile.findUnique({
    where: { id },
    include: {
      currentRank: true,
      currentUnit: true,
      currentPosition: true,
      status: true,
      user: {
        select: {
          id: true,
          displayName: true,
          name: true,
          email: true,
        },
      },
      rosterAssignments: {
        include: {
          unit: true,
          position: true,
          rank: true,
        },
        orderBy: [{ startsAt: "desc" }],
      },
      _count: {
        select: {
          qualifications: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const scopedWhere = buildMemberScopeWhere(user, "personnel.profile.view");

  if (
    "currentUnitId" in scopedWhere &&
    scopedWhere.currentUnitId &&
    profile.currentUnitId &&
    !scopedWhere.currentUnitId.in.includes(profile.currentUnitId)
  ) {
    return null;
  }

  if ("currentUnitId" in scopedWhere && scopedWhere.currentUnitId && !profile.currentUnitId) {
    return null;
  }

  const recentAuditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          entityType: "MemberProfile",
          entityId: profile.id,
        },
        {
          entityType: "RosterAssignment",
          entityId: {
            in: profile.rosterAssignments.map((assignment) => assignment.id),
          },
        },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    take: 6,
  });

  const activeAssignment =
    profile.rosterAssignments.find((assignment) => assignment.endsAt === null) ?? null;

  return {
    ...mapMemberProfile(profile),
    userId: profile.userId ?? null,
    notesPlaceholder:
      "Sensitive profile notes, attendance, and qualifications stay in later milestones.",
    qualificationPlaceholderCount: profile._count.qualifications,
    activeAssignment: activeAssignment
      ? {
          id: activeAssignment.id,
          startsAt: activeAssignment.startsAt,
          endsAt: activeAssignment.endsAt,
        }
      : null,
    rosterHistory: profile.rosterAssignments.map((assignment) => ({
      id: assignment.id,
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
      unitName: assignment.unit.name,
      rankAbbreviation: assignment.rank?.abbreviation ?? null,
      positionTitle: assignment.position?.title ?? null,
    })),
    recentAuditLogs: recentAuditLogs.map((entry) => ({
      id: entry.id,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt,
    })),
  };
}

function getCampaignStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function buildMemberAuditWhere(
  memberProfileId: string,
  rosterAssignmentIds: string[],
): Prisma.AuditLogWhereInput {
  return {
    OR: [
      {
        entityType: "MemberProfile",
        entityId: memberProfileId,
      },
      ...(rosterAssignmentIds.length > 0
        ? [
            {
              entityType: "RosterAssignment",
              entityId: {
                in: rosterAssignmentIds,
              },
            } satisfies Prisma.AuditLogWhereInput,
          ]
        : []),
    ],
  };
}

async function getMemberCampaignParticipationSummaryForViewer(input: {
  memberProfileId: string;
  user: PortalUser;
}): Promise<MemberCampaignParticipationSummary | null> {
  const scopedUnitIds = getScopedUnitIds(input.user, "campaigns.view");
  const campaignRecords = await prisma.attendanceRecord.findMany({
    where: {
      memberProfileId: input.memberProfileId,
      event: {
        campaignId: {
          not: null,
        },
        ...(scopedUnitIds
          ? {
              hostUnitId: {
                in: scopedUnitIds.length > 0 ? scopedUnitIds : noAccessWhere.in,
              },
            }
          : {}),
      },
    },
    include: {
      event: {
        include: {
          hostUnit: true,
          campaign: true,
        },
      },
    },
    orderBy: [
      {
        event: {
          startsAt: "desc",
        },
      },
    ],
    take: 24,
  });

  const uniqueCampaigns = new Map<
    string,
    MemberCampaignParticipationSummary["recentCampaigns"][number]
  >();

  for (const record of campaignRecords) {
    const campaign = record.event.campaign;

    if (!campaign || uniqueCampaigns.has(campaign.id)) {
      continue;
    }

    uniqueCampaigns.set(campaign.id, {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      statusLabel: getCampaignStatusLabel(campaign.status),
      phase: campaign.phase,
      participatedAt: record.event.startsAt,
      relatedEventTitle: record.event.title,
      hostUnitShortName: record.event.hostUnit?.shortName ?? null,
    });
  }

  const recentCampaigns = Array.from(uniqueCampaigns.values());

  return {
    totalCampaigns: recentCampaigns.length,
    activeCampaigns: recentCampaigns.filter((campaign) =>
      ["planning", "active"].includes(campaign.status),
    ).length,
    completedCampaigns: recentCampaigns.filter(
      (campaign) => campaign.status === "completed",
    ).length,
    participationEventCount: campaignRecords.length,
    recentCampaigns,
  };
}

function buildMemberServiceTimeline(input: {
  attendanceSummary: Awaited<ReturnType<typeof getMemberAttendanceSummary>>;
  auditLogs: MemberAuditLogItem[];
  campaignSummary: MemberCampaignParticipationSummary | null;
  member: MemberDetail;
  qualificationSummary: Awaited<ReturnType<typeof listMemberQualifications>>;
}) {
  const entries: MemberServiceTimelineEntry[] = [];

  entries.push({
    id: `profile-created:${input.member.id}`,
    type: "profile-created",
    title: "Profile created",
    description: "Official personnel record was created in the portal.",
    actorDisplayName:
      input.auditLogs.find((entry) => entry.action === "personnel.profile.created")
        ?.actorDisplayName ?? null,
    timestamp:
      input.auditLogs.find((entry) => entry.action === "personnel.profile.created")
        ?.createdAt ?? input.member.lastUpdatedAt,
    badgeLabel: "Profile",
    badgeTone: "success",
    relatedLabel: input.member.displayName,
    relatedHref: `/personnel/members/${input.member.id}`,
    details: [],
    isSensitive: false,
  });

  if (input.member.joinDate) {
    entries.push({
      id: `joined-community:${input.member.id}`,
      type: "joined-community",
      title: "Joined community",
      description: `${input.member.displayName} joined Spearhead.`,
      actorDisplayName: null,
      timestamp: input.member.joinDate,
      badgeLabel: "Joined",
      badgeTone: "info",
      relatedLabel: input.member.unit?.name ?? null,
      relatedHref: input.member.unit ? `/units/${input.member.unit.id}` : null,
      details: [],
      isSensitive: false,
    });
  }

  for (const auditEntry of input.auditLogs) {
    switch (auditEntry.action) {
      case "roster.rank.changed":
        entries.push({
          id: `rank:${auditEntry.id}`,
          type: "rank-changed",
          title: "Rank changed",
          description: auditEntry.summary,
          actorDisplayName: auditEntry.actorDisplayName,
          timestamp: auditEntry.createdAt,
          badgeLabel: "Rank",
          badgeTone: "info",
          relatedLabel: input.member.rank?.abbreviation ?? null,
          relatedHref: `/personnel/members/${input.member.id}`,
          details: auditEntry.reason ? [auditEntry.reason] : [],
          isSensitive: false,
        });
        break;
      case "roster.unit.changed":
        entries.push({
          id: `unit:${auditEntry.id}`,
          type: "unit-changed",
          title: "Unit changed",
          description: auditEntry.summary,
          actorDisplayName: auditEntry.actorDisplayName,
          timestamp: auditEntry.createdAt,
          badgeLabel: "Transfer",
          badgeTone: "warning",
          relatedLabel: input.member.unit?.name ?? null,
          relatedHref: input.member.unit ? `/units/${input.member.unit.id}` : null,
          details: auditEntry.reason ? [auditEntry.reason] : [],
          isSensitive: false,
        });
        break;
      case "roster.position.changed":
        entries.push({
          id: `position:${auditEntry.id}`,
          type: "position-changed",
          title: "Position changed",
          description: auditEntry.summary,
          actorDisplayName: auditEntry.actorDisplayName,
          timestamp: auditEntry.createdAt,
          badgeLabel: "Position",
          badgeTone: "info",
          relatedLabel: input.member.position?.title ?? null,
          relatedHref: `/personnel/members/${input.member.id}`,
          details: auditEntry.reason ? [auditEntry.reason] : [],
          isSensitive: false,
        });
        break;
      case "personnel.profile.status_changed":
        entries.push({
          id: `status:${auditEntry.id}`,
          type: "status-changed",
          title: "Status changed",
          description: auditEntry.summary,
          actorDisplayName: auditEntry.actorDisplayName,
          timestamp: auditEntry.createdAt,
          badgeLabel: input.member.status.label,
          badgeTone: "warning",
          relatedLabel: input.member.status.label,
          relatedHref: `/personnel/members/${input.member.id}`,
          details: auditEntry.reason ? [auditEntry.reason] : [],
          isSensitive: false,
        });
        break;
      default:
        break;
    }
  }

  for (const record of input.qualificationSummary?.earned ?? []) {
    entries.push({
      id: `qualification-earned:${record.id}`,
      type: "qualification-awarded",
      title: "Qualification awarded",
      description: `${record.qualificationLabel} awarded.`,
      actorDisplayName: record.awardedByDisplayName,
      timestamp: record.awardedAt,
      badgeLabel: record.categoryLabel,
      badgeTone: record.isExpiringSoon ? "warning" : "success",
      relatedLabel: record.qualificationLabel,
      relatedHref: "/personnel/qualifications",
      details:
        record.requiredBy.length > 0
          ? [`Required by ${record.requiredBy.join(", ")}`]
          : [],
      isSensitive: false,
    });
  }

  for (const record of input.qualificationSummary?.revokedOrExpired ?? []) {
    entries.push({
      id: `qualification-inactive:${record.id}`,
      type: "qualification-revoked",
      title: record.status === "revoked" ? "Qualification revoked" : "Qualification expired",
      description: `${record.qualificationLabel} is no longer active.`,
      actorDisplayName: record.awardedByDisplayName,
      timestamp: record.revokedAt ?? record.expiresAt ?? record.awardedAt,
      badgeLabel: record.categoryLabel,
      badgeTone: "danger",
      relatedLabel: record.qualificationLabel,
      relatedHref: "/personnel/qualifications",
      details: [],
      isSensitive: false,
    });
  }

  for (const event of input.attendanceSummary?.recentEvents ?? []) {
    const isAttended = event.finalStatus === "present" || event.finalStatus === "late";

    entries.push({
      id: `attendance:${event.eventId}:${event.startsAt.toISOString()}`,
      type: isAttended ? "event-attended" : "event-missed",
      title: isAttended ? "Event attended" : "Attendance recorded",
      description: `${event.eventTitle} ${
        event.finalStatus ? `closed as ${event.finalStatus}.` : "is on the attendance record."
      }`,
      actorDisplayName: null,
      timestamp: event.startsAt,
      badgeLabel: event.finalStatus ? event.finalStatus.toUpperCase() : "RSVP",
      badgeTone:
        event.finalStatus === "present"
          ? "success"
          : event.finalStatus === "late" || event.finalStatus === "excused"
            ? "warning"
            : event.finalStatus === "absent"
              ? "danger"
              : "muted",
      relatedLabel: event.eventTitle,
      relatedHref: `/operations/events/${event.eventId}`,
      details: [
        event.hostUnitShortName
          ? `Hosted by ${event.hostUnitShortName}`
          : "Hosted event",
      ],
      isSensitive: false,
    });
  }

  for (const campaign of input.campaignSummary?.recentCampaigns ?? []) {
    entries.push({
      id: `campaign:${campaign.id}:${campaign.participatedAt.toISOString()}`,
      type: "campaign-participation",
      title: "Deployment participation",
      description: `${input.member.displayName} appeared on a deployment-linked operation.`,
      actorDisplayName: null,
      timestamp: campaign.participatedAt,
      badgeLabel: campaign.statusLabel,
      badgeTone:
        campaign.status === "active"
          ? "success"
          : campaign.status === "planning"
            ? "info"
            : campaign.status === "completed"
              ? "muted"
              : "warning",
      relatedLabel: campaign.title,
      relatedHref: `/operations/campaigns/${campaign.id}`,
      details: [
        ...(campaign.relatedEventTitle ? [`Related operation: ${campaign.relatedEventTitle}`] : []),
        ...(campaign.hostUnitShortName ? [`Host unit: ${campaign.hostUnitShortName}`] : []),
      ],
      isSensitive: false,
    });
  }

  return entries.sort(
    (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
  );
}

export async function getMemberServiceSummary(memberProfileId: string) {
  const dashboard = await getMemberProfileDashboardData(memberProfileId);

  return dashboard?.serviceRecord ?? null;
}

export async function getMemberReadiness(memberProfileId: string) {
  const dashboard = await getMemberProfileDashboardData(memberProfileId);

  return dashboard?.readiness ?? null;
}

export async function getMemberTimeline(memberProfileId: string) {
  const dashboard = await getMemberProfileDashboardData(memberProfileId);

  return dashboard?.serviceTimeline ?? null;
}

export async function getMemberProfileDashboardData(
  memberProfileId: string,
): Promise<MemberProfileDashboardData | null> {
  const user = await requirePermission("personnel.profile.view");
  const member = await getMemberProfile(memberProfileId);

  if (!member) {
    return null;
  }

  const memberScope = member.unit ? { unitId: member.unit.id } : undefined;
  const attendanceSummaryCandidate = await getMemberAttendanceSummary(member.id);
  const permissions = {
    canViewServiceRecord:
      Boolean(
        can(user, "personnel.profile.service_record.view", memberScope) ||
          can(user, "personnel.profile.service_record.view"),
      ),
    canEditServiceRecord:
      Boolean(
        can(user, "personnel.profile.service_record.edit", memberScope) ||
          can(user, "personnel.profile.service_record.edit"),
      ),
    canViewNotes:
      Boolean(
        can(user, "personnel.profile.notes.view", memberScope) ||
          can(user, "personnel.profile.notes.view"),
      ),
    canCreateNotes:
      Boolean(
        can(user, "personnel.profile.notes.create", memberScope) ||
          can(user, "personnel.profile.notes.create"),
      ),
    canViewLogs:
      Boolean(
        can(user, "personnel.profile.logs.view", memberScope) ||
          can(user, "personnel.profile.logs.view"),
      ),
    canViewQualifications:
      Boolean(
        can(user, "qualifications.record.view", memberScope) ||
          can(user, "qualifications.record.view"),
      ),
    canViewAttendance: Boolean(attendanceSummaryCandidate),
    canViewCampaigns:
      Boolean(
        can(user, "campaigns.view", memberScope) || can(user, "campaigns.view"),
      ),
    canViewAudit: Boolean(can(user, "audit.view")),
  };

  const auditEntries = await prisma.auditLog.findMany({
    where: buildMemberAuditWhere(
      member.id,
      member.rosterHistory.map((assignment) => assignment.id),
    ),
    include: {
      actor: {
        select: {
          displayName: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 20,
  });

  const qualificationSummary = permissions.canViewQualifications
    ? await listMemberQualifications(member.id)
    : null;
  const attendanceSummary = permissions.canViewAttendance
    ? attendanceSummaryCandidate
    : null;
  const campaignSummary = permissions.canViewCampaigns
    ? await getMemberCampaignParticipationSummaryForViewer({
        memberProfileId: member.id,
        user,
      })
    : null;
  const mappedAuditLogs = auditEntries.map(mapAuditLogItem);
  const serviceLogs = permissions.canViewLogs
    ? mappedAuditLogs
        .filter((entry) =>
          [
            "personnel.profile.created",
            "personnel.profile.updated",
            "personnel.profile.status_changed",
            "roster.rank.changed",
            "roster.unit.changed",
            "roster.position.changed",
          ].includes(entry.action),
        )
        .slice(0, 10)
        .map((entry) => ({
          id: entry.id,
          action: entry.action,
          summary: entry.summary,
          createdAt: entry.createdAt,
          actorDisplayName: entry.actorDisplayName,
          reason: entry.reason,
        }))
    : null;
  const readiness = permissions.canViewServiceRecord
    ? buildMemberReadiness({
        attendanceSummary,
        expiringSoonCount: qualificationSummary?.expiringSoon.length ?? 0,
        hasActiveUnitAssignment: Boolean(member.activeAssignment && member.unit),
        missingQualificationLabels: getMissingQualificationLabels(qualificationSummary),
        pendingSignoffCount: qualificationSummary?.pendingSignoff.length ?? 0,
        positionLabel: member.position?.title ?? null,
        profileStatusKey: member.status.key,
        profileStatusLabel: member.status.label,
        unitLabel: member.unit?.name ?? null,
      })
    : null;
  const serviceTimeline = permissions.canViewServiceRecord
    ? buildMemberServiceTimeline({
        attendanceSummary,
        auditLogs: mappedAuditLogs,
        campaignSummary,
        member,
        qualificationSummary,
      })
    : null;
  const latestRankChange = mappedAuditLogs.find(
    (entry) => entry.action === "roster.rank.changed",
  );

  return {
    member,
    qualificationSummary,
    attendanceSummary,
    campaignSummary,
    readiness,
    serviceTimeline,
    recentActivity: (serviceTimeline ?? [])
      .slice()
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, 6),
    serviceLogs,
    auditLogs: permissions.canViewAudit ? mappedAuditLogs : null,
    notes: {
      canView: permissions.canViewNotes,
      canCreate: permissions.canCreateNotes,
      placeholder: permissions.canViewNotes
        ? "Profile notes are permission-gated and will attach here once the dedicated notes record is introduced."
        : "You do not have permission to view profile notes for this member.",
    },
    serviceRecord: {
      joinDateLabel: formatDate(member.joinDate),
      timeInServiceLabel: formatDurationParts(member.joinDate),
      timeInGradeLabel: member.rank
        ? latestRankChange
          ? formatDurationParts(latestRankChange.createdAt)
          : "Tracking later"
        : "Not ranked",
      discordLinkLabel: member.discordLinked
        ? "Linked to authenticated portal user"
        : "No linked portal user",
      steamIdLabel: "Not captured yet",
      armaIdLabel: "Not captured yet",
    },
    permissions,
  };
}

export async function listRosterAssignments(filters: RosterFilters = {}) {
  const user = await requirePermission("roster.member.view");
  const scopedWhere = buildMemberScopeWhere(user, "roster.member.view");
  const filterWhere = buildMemberFilterWhere(filters);

  const where: Prisma.MemberProfileWhereInput = {
    isActive: true,
    deletedAt: null,
    ...scopedWhere,
    AND: filterWhere,
  };

  const profiles = await prisma.memberProfile.findMany({
    where,
    include: {
      currentRank: true,
      currentUnit: true,
      currentPosition: true,
      status: true,
      user: {
        select: {
          id: true,
          displayName: true,
          name: true,
          email: true,
        },
      },
      rosterAssignments: {
        where: {
          endsAt: null,
          isPrimary: true,
        },
        orderBy: [{ startsAt: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { displayName: "asc" }],
  });

  const summary = await prisma.memberProfile.groupBy({
    by: ["statusId"],
    where,
    _count: {
      _all: true,
    },
  });

  const statusLabels = await prisma.profileStatus.findMany({
    where: {
      id: {
        in: summary.map((entry) => entry.statusId),
      },
    },
  });

  const labelByStatusId = new Map(statusLabels.map((status) => [status.id, status.label]));

  return {
    user,
    assignments: profiles.map(
      (profile): RosterAssignmentListItem => ({
        ...mapMemberProfile(profile),
        activeAssignmentId: profile.rosterAssignments[0]?.id ?? null,
        assignmentStartsAt: profile.rosterAssignments[0]?.startsAt ?? null,
      }),
    ),
    statusCounts: summary.map((entry) => ({
      statusId: entry.statusId,
      label: labelByStatusId.get(entry.statusId) ?? "Unknown",
      count: entry._count._all,
    })),
  };
}
