import { Prisma } from "@prisma/client";

import type { PortalUser } from "@/features/auth/types";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { can, requirePermission } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel";
import {
  calculateMemberQualificationReadiness,
  calculateUnitQualificationReadiness,
  getQualificationStatusLabel,
} from "@/server/qualifications/readiness";
import type {
  MemberQualificationReadinessSummary,
  MemberQualificationRecord,
  MemberQualificationSummary,
  PendingQualificationSignoffItem,
  QualificationActivityItem,
  QualificationCatalogFilters,
  QualificationCategorySummary,
  QualificationCatalogItem,
  QualificationDashboardSummary,
  QualificationDetail,
  QualificationMemberPreview,
  QualificationMatrixData,
  QualificationMatrixFilters,
  QualificationRecordDetail,
  QualificationReferenceData,
  QualificationRequirementItem,
  QualificationStatus,
  UnitQualificationReadinessSummary,
} from "@/server/qualifications/types";

const noAccessWhere = { in: ["__no-access__"] };
const EXPIRING_SOON_DAYS = 30;

type QualificationRequirementWithScope = Prisma.QualificationRequirementGetPayload<{
  include: {
    unit: true;
    position: {
      include: {
        unit: {
          select: {
            shortName: true;
          };
        };
      };
    };
  };
}>;

type QualificationRequirementWithDetails = Prisma.QualificationRequirementGetPayload<{
  include: {
    unit: true;
    position: {
      include: {
        unit: {
          select: {
            shortName: true;
          };
        };
      };
    };
    qualification: {
      include: {
        category: true;
      };
    };
  };
}>;

type MemberQualificationWithRelations = Prisma.MemberQualificationGetPayload<{
  include: {
    awardedBy: true;
    memberProfile: {
      include: {
        currentPosition: true;
        currentUnit: true;
        user: true;
      };
    };
    qualification: {
      include: {
        category: true;
      };
    };
  };
}>;

function normalizeFilterValue(value?: string) {
  return value?.trim() ? value.trim() : undefined;
}

function getQualificationAbbreviation(label: string) {
  const words = label
    .split(/[\s/-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "QUAL";
  }

  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }

  return words
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getActorDisplayName(actor: {
  displayName: string | null;
  name: string | null;
  email: string | null;
} | null) {
  return actor?.displayName ?? actor?.name ?? actor?.email ?? null;
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

function deriveQualificationStatus(record: {
  status: string;
  revokedAt: Date | null;
  expiresAt: Date | null;
}): QualificationStatus {
  if (record.revokedAt) {
    return "revoked";
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    return "expired";
  }

  if (record.status === "pending_signoff") {
    return "pending_signoff";
  }

  return "qualified";
}

function isExpiringSoon(expiresAt: Date | null) {
  if (!expiresAt) {
    return false;
  }

  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);

  return expiresAt >= now && expiresAt <= soon;
}

function mapQualificationRequirement(
  requirement: QualificationRequirementWithScope,
): QualificationRequirementItem {
  return {
    id: requirement.id,
    unit: requirement.unit,
    position: requirement.position
      ? {
          id: requirement.position.id,
          key: requirement.position.key,
          title: requirement.position.title,
          unitId: requirement.position.unitId,
          unitShortName: requirement.position.unit.shortName,
        }
      : null,
    isRequired: requirement.isRequired,
    dueWithinDays: requirement.dueWithinDays,
    notes: requirement.notes,
  };
}

function mapCatalogItem(
  qualification: {
    id: string;
    key: string;
    label: string;
    description: string | null;
    expiresAfterDays: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    category: {
      id: string;
      label: string;
      key: string;
    };
    _count: {
      memberRecords: number;
      requirements: number;
    };
  },
): QualificationCatalogItem {
  return {
    id: qualification.id,
    key: qualification.key,
    label: qualification.label,
    description: qualification.description,
    expiresAfterDays: qualification.expiresAfterDays,
    isActive: qualification.isActive,
    createdAt: qualification.createdAt,
    updatedAt: qualification.updatedAt,
    category: qualification.category,
    awardedCount: qualification._count.memberRecords,
    requirementCount: qualification._count.requirements,
  };
}

function mapQualificationActivityItem(entry: {
  action: string;
  actor: {
    displayName: string | null;
    email: string | null;
    name: string | null;
  } | null;
  createdAt: Date;
  id: string;
  reason: string | null;
  summary: string;
}): QualificationActivityItem {
  const actionMap: Record<
    string,
    Pick<QualificationActivityItem, "type" | "title" | "badgeLabel" | "badgeTone">
  > = {
    "qualifications.catalog.created": {
      type: "qualification-created",
      title: "Qualification created",
      badgeLabel: "Catalog",
      badgeTone: "success",
    },
    "qualifications.catalog.updated": {
      type: "qualification-updated",
      title: "Qualification updated",
      badgeLabel: "Catalog",
      badgeTone: "info",
    },
    "qualifications.catalog.archived": {
      type: "qualification-archived",
      title: "Qualification archived",
      badgeLabel: "Archived",
      badgeTone: "muted",
    },
    "qualifications.record.awarded": {
      type: "qualification-awarded",
      title: "Qualification awarded",
      badgeLabel: "Awarded",
      badgeTone: "success",
    },
    "qualifications.record.revoked": {
      type: "qualification-revoked",
      title: "Qualification revoked",
      badgeLabel: "Revoked",
      badgeTone: "danger",
    },
    "qualifications.record.updated": {
      type: "qualification-awarded",
      title: "Qualification record updated",
      badgeLabel: "Updated",
      badgeTone: "info",
    },
    "qualifications.requirement.created": {
      type: "requirement-added",
      title: "Requirement added",
      badgeLabel: "Requirement",
      badgeTone: "warning",
    },
    "qualifications.requirement.updated": {
      type: "requirement-added",
      title: "Requirement updated",
      badgeLabel: "Requirement",
      badgeTone: "warning",
    },
    "qualifications.requirement.removed": {
      type: "requirement-removed",
      title: "Requirement removed",
      badgeLabel: "Requirement",
      badgeTone: "muted",
    },
    "qualifications.record.signoff_completed": {
      type: "qualification-signoff-completed",
      title: "Sign-off completed",
      badgeLabel: "Sign-Off",
      badgeTone: "success",
    },
  };

  const mapped = actionMap[entry.action] ?? {
    type: "qualification-updated" as const,
    title: "Qualification activity",
    badgeLabel: "Activity",
    badgeTone: "muted" as const,
  };

  return {
    id: entry.id,
    type: mapped.type,
    title: mapped.title,
    description: entry.summary,
    actorDisplayName: getActorDisplayName(entry.actor),
    timestamp: entry.createdAt,
    badgeLabel: mapped.badgeLabel,
    badgeTone: mapped.badgeTone,
    details: entry.reason ? [entry.reason] : [],
  };
}

function buildRequiredByLabels(requirements: QualificationRequirementItem[]) {
  return requirements.map((requirement) => {
    if (requirement.position) {
      return `${requirement.position.title} (${requirement.position.unitShortName})`;
    }

    if (requirement.unit) {
      return requirement.unit.shortName;
    }

    return "General requirement";
  });
}

export async function getQualificationReferenceData(): Promise<QualificationReferenceData> {
  const [categories, qualifications, units, positions, members] = await Promise.all([
    prisma.qualificationCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.qualification.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { label: "asc" }],
    }),
    prisma.unit.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.position.findMany({
      where: { isActive: true },
      include: { unit: true },
      orderBy: [{ unit: { sortOrder: "asc" } }, { title: "asc" }],
    }),
    prisma.memberProfile.findMany({
      where: { isActive: true, deletedAt: null },
      include: { currentUnit: true, user: true },
      orderBy: [{ displayName: "asc" }],
    }),
  ]);

  return {
    categories: categories.map((category) => ({
      id: category.id,
      label: category.label,
      key: category.key,
    })),
    qualifications: qualifications.map((qualification) => ({
      id: qualification.id,
      label: qualification.label,
      key: qualification.key,
      hint: qualification.category.label,
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
    members: members.map((member) => ({
      id: member.id,
      label: getMemberDisplayName(member),
      hint: member.currentUnit?.shortName ?? null,
    })),
  };
}

export async function listQualificationCategories(): Promise<QualificationCategorySummary[]> {
  await requirePermission("qualifications.view");

  const categories = await prisma.qualificationCategory.findMany({
    include: {
      _count: {
        select: {
          qualifications: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return categories.map((category) => ({
    id: category.id,
    key: category.key,
    label: category.label,
    description: category.description,
    sortOrder: category.sortOrder,
    qualificationCount: category._count.qualifications,
  }));
}

export async function listQualifications(
  filters: QualificationCatalogFilters = {},
) {
  await requirePermission("qualifications.view");

  const q = normalizeFilterValue(filters.q);
  const categoryId = normalizeFilterValue(filters.categoryId);
  const state = filters.state ?? "active";
  const where: Prisma.QualificationWhereInput = {
    ...(state === "active"
      ? { isActive: true }
      : state === "archived"
        ? { isActive: false }
        : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { label: { contains: q } },
            { key: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  };

  const qualifications = await prisma.qualification.findMany({
    where,
    include: {
      category: true,
      _count: {
        select: {
          memberRecords: true,
          requirements: true,
        },
      },
    },
    orderBy: [
      { category: { sortOrder: "asc" } },
      { isActive: "desc" },
      { label: "asc" },
    ],
  });

  const grouped = new Map<string, QualificationCatalogItem[]>();

  for (const qualification of qualifications) {
    const categoryLabel = qualification.category.label;
    const entry = mapCatalogItem(qualification);
    grouped.set(categoryLabel, [...(grouped.get(categoryLabel) ?? []), entry]);
  }

  return {
    qualifications: qualifications.map(mapCatalogItem),
    groupedQualifications: Array.from(grouped.entries()).map(([categoryLabel, items]) => ({
      categoryLabel,
      items,
    })),
  };
}

export async function getQualificationDetail(
  qualificationId: string,
): Promise<QualificationDetail | null> {
  await requirePermission("qualifications.view");

  const qualification = await prisma.qualification.findUnique({
    where: { id: qualificationId },
    include: {
      category: true,
      requirements: {
        include: {
          unit: true,
          position: {
            include: {
              unit: {
                select: {
                  shortName: true,
                },
              },
            },
          },
        },
        orderBy: [
          { unit: { sortOrder: "asc" } },
          { position: { sortOrder: "asc" } },
          { createdAt: "asc" },
        ],
      },
      _count: {
        select: {
          memberRecords: true,
          requirements: true,
        },
      },
    },
  });

  if (!qualification) {
    return null;
  }

  const memberRecords = await prisma.memberQualification.findMany({
    where: {
      qualificationId,
    },
    include: {
      awardedBy: true,
      memberProfile: {
        include: {
          currentPosition: true,
          currentUnit: true,
          user: true,
        },
      },
      qualification: {
        include: {
          category: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { awardedAt: "desc" }],
  });

  const latestRecordByMemberId = new Map<string, MemberQualificationWithRelations>();

  for (const record of memberRecords) {
    if (!latestRecordByMemberId.has(record.memberProfileId)) {
      latestRecordByMemberId.set(record.memberProfileId, record);
    }
  }

  const memberPreview: QualificationMemberPreview[] = Array.from(
    latestRecordByMemberId.values(),
  )
    .map((record) => {
      const status = deriveQualificationStatus(record);

      return {
        memberProfileId: record.memberProfileId,
        displayName: getMemberDisplayName(record.memberProfile),
        unitShortName: record.memberProfile.currentUnit?.shortName ?? null,
        positionTitle: record.memberProfile.currentPosition?.title ?? null,
        status,
        statusLabel: getQualificationStatusLabel(status),
        isExpiringSoon: isExpiringSoon(record.expiresAt),
        expiresAt: record.expiresAt,
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));

  const recentActivitySource = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          entityType: "Qualification",
          entityId: qualification.id,
        },
        {
          entityType: "QualificationRequirement",
          entityId: {
            in: qualification.requirements.map((requirement) => requirement.id),
          },
        },
        {
          entityType: "MemberQualification",
          entityId: {
            in: memberRecords.map((record) => record.id),
          },
        },
      ],
    },
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
    take: 10,
  });

  const requiredRequirements = qualification.requirements.filter(
    (requirement) => requirement.isRequired,
  );
  const requiredUnitIds = Array.from(
    new Set(
      requiredRequirements
        .map((requirement) => requirement.unitId)
        .filter((unitId): unitId is string => Boolean(unitId)),
    ),
  );
  const requiredPositionIds = Array.from(
    new Set(
      requiredRequirements
        .map((requirement) => requirement.positionId)
        .filter((positionId): positionId is string => Boolean(positionId)),
    ),
  );

  const relevantMembers =
    requiredUnitIds.length > 0 || requiredPositionIds.length > 0
      ? await prisma.memberProfile.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            OR: [
              ...(requiredUnitIds.length > 0
                ? [{ currentUnitId: { in: requiredUnitIds } }]
                : []),
              ...(requiredPositionIds.length > 0
                ? [{ currentPositionId: { in: requiredPositionIds } }]
                : []),
            ],
          },
          select: {
            id: true,
            currentUnitId: true,
            currentPositionId: true,
          },
        })
      : [];

  let membersMissingRequiredCount = 0;

  for (const member of relevantMembers) {
    const matchingRequirement = requiredRequirements.find(
      (requirement) =>
        (requirement.unitId && requirement.unitId === member.currentUnitId) ||
        (requirement.positionId && requirement.positionId === member.currentPositionId),
    );

    if (!matchingRequirement) {
      continue;
    }

    const latestRecord = latestRecordByMemberId.get(member.id);

    if (!latestRecord || deriveQualificationStatus(latestRecord) !== "qualified") {
      membersMissingRequiredCount += 1;
    }
  }

  return {
    ...mapCatalogItem(qualification),
    abbreviation: getQualificationAbbreviation(qualification.label),
    membersQualifiedCount: memberPreview.filter((entry) => entry.status === "qualified").length,
    membersPendingSignoffCount: memberPreview.filter(
      (entry) => entry.status === "pending_signoff",
    ).length,
    membersMissingRequiredCount,
    expiringSoonCount: memberPreview.filter((entry) => entry.isExpiringSoon).length,
    affectedUnits: Array.from(
      new Map(
        qualification.requirements
          .filter((requirement) => requirement.unit)
          .map((requirement) => [requirement.unit!.id, requirement.unit!]),
      ).values(),
    ),
    affectedPositions: Array.from(
      new Map(
        qualification.requirements
          .filter((requirement) => requirement.position)
          .map((requirement) => [
            requirement.position!.id,
            {
              id: requirement.position!.id,
              title: requirement.position!.title,
              unitShortName: requirement.position!.unit.shortName,
            },
          ]),
      ).values(),
    ),
    recentActivity: recentActivitySource.map(mapQualificationActivityItem),
    memberPreview: memberPreview.slice(0, 8),
    requirements: qualification.requirements.map(mapQualificationRequirement),
  };
}

export async function listMemberQualifications(
  memberProfileId: string,
): Promise<MemberQualificationSummary | null> {
  const user = await requirePermission("qualifications.record.view");
  const scopedWhere = buildMemberScopeWhere(user, "qualifications.record.view");
  const memberProfile = await prisma.memberProfile.findUnique({
    where: { id: memberProfileId },
    include: {
      currentUnit: true,
      currentPosition: true,
      qualifications: {
        include: {
          qualification: {
            include: {
              category: true,
            },
          },
          awardedBy: true,
        },
        orderBy: [{ updatedAt: "desc" }, { awardedAt: "desc" }],
      },
    },
  });

  if (!memberProfile) {
    return null;
  }

  if (
    "currentUnitId" in scopedWhere &&
    scopedWhere.currentUnitId &&
    memberProfile.currentUnitId &&
    !scopedWhere.currentUnitId.in.includes(memberProfile.currentUnitId)
  ) {
    return null;
  }

  if (
    "currentUnitId" in scopedWhere &&
    scopedWhere.currentUnitId &&
    !memberProfile.currentUnitId
  ) {
    return null;
  }

  const requirementScope: Prisma.QualificationRequirementWhereInput[] = [];

  if (memberProfile.currentUnitId) {
    requirementScope.push({ unitId: memberProfile.currentUnitId });
  }

  if (memberProfile.currentPositionId) {
    requirementScope.push({ positionId: memberProfile.currentPositionId });
  }

  const requirements: QualificationRequirementWithDetails[] =
    await prisma.qualificationRequirement.findMany({
    where: requirementScope.length > 0 ? { OR: requirementScope } : { id: noAccessWhere },
    include: {
      unit: true,
      position: {
        include: {
          unit: {
            select: {
              shortName: true,
            },
          },
        },
      },
      qualification: {
        include: {
          category: true,
        },
      },
    },
  });

  const latestRecordByQualificationId = new Map<
    string,
    (typeof memberProfile.qualifications)[number]
  >();

  for (const record of memberProfile.qualifications) {
    if (!latestRecordByQualificationId.has(record.qualificationId)) {
      latestRecordByQualificationId.set(record.qualificationId, record);
    }
  }

  const requirementsByQualificationId = new Map<string, QualificationRequirementWithDetails[]>();

  for (const requirement of requirements) {
    requirementsByQualificationId.set(requirement.qualificationId, [
      ...(requirementsByQualificationId.get(requirement.qualificationId) ?? []),
      requirement,
    ]);
  }

  const earned: MemberQualificationRecord[] = [];
  const pendingSignoff: MemberQualificationRecord[] = [];
  const expiringSoonRecords: MemberQualificationRecord[] = [];
  const revokedOrExpired: MemberQualificationRecord[] = [];

  for (const record of latestRecordByQualificationId.values()) {
    const status = deriveQualificationStatus(record);
    const requiredBy = buildRequiredByLabels(
      (requirementsByQualificationId.get(record.qualificationId) ?? []).map(
        mapQualificationRequirement,
      ),
    );

    const mappedRecord: MemberQualificationRecord = {
      id: record.id,
      qualificationId: record.qualificationId,
      qualificationLabel: record.qualification.label,
      qualificationKey: record.qualification.key,
      categoryLabel: record.qualification.category.label,
      status,
      awardedAt: record.awardedAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      notes: record.notes,
      awardedByDisplayName:
        record.awardedBy?.displayName ??
        record.awardedBy?.name ??
        record.awardedBy?.email ??
        null,
      isRequired: (requirementsByQualificationId.get(record.qualificationId) ?? []).some(
        (requirement) => requirement.isRequired,
      ),
      requiredBy,
      isExpiringSoon: isExpiringSoon(record.expiresAt),
      statusLabel: getQualificationStatusLabel(status),
    };

    if (status === "qualified") {
      earned.push(mappedRecord);

      if (mappedRecord.isExpiringSoon) {
        expiringSoonRecords.push(mappedRecord);
      }
    } else if (status === "pending_signoff") {
      pendingSignoff.push(mappedRecord);
    } else {
      revokedOrExpired.push(mappedRecord);
    }
  }

  const missingRequiredByQualificationId = new Map<
    string,
    MemberQualificationSummary["missingRequired"][number]
  >();

  for (const requirement of requirements.filter((entry) => entry.isRequired)) {
    const latestRecord = latestRecordByQualificationId.get(requirement.qualificationId);

    if (latestRecord && deriveQualificationStatus(latestRecord) === "qualified") {
      continue;
    }

    const existing = missingRequiredByQualificationId.get(requirement.qualificationId);
    const requiredBy = buildRequiredByLabels([mapQualificationRequirement(requirement)]);

    missingRequiredByQualificationId.set(requirement.qualificationId, {
      qualificationId: requirement.qualificationId,
      qualificationLabel: requirement.qualification.label,
      categoryLabel: requirement.qualification.category.label,
      requiredBy: existing
        ? Array.from(new Set([...existing.requiredBy, ...requiredBy]))
        : requiredBy,
    });
  }

  const missingRequired = Array.from(missingRequiredByQualificationId.values());

  return {
    earned: earned.sort((left, right) =>
      left.qualificationLabel.localeCompare(right.qualificationLabel),
    ),
    pendingSignoff: pendingSignoff.sort((left, right) =>
      left.qualificationLabel.localeCompare(right.qualificationLabel),
    ),
    expiringSoon: expiringSoonRecords.sort((left, right) =>
      left.qualificationLabel.localeCompare(right.qualificationLabel),
    ),
    missingRequired,
    revokedOrExpired: revokedOrExpired.sort((left, right) =>
      left.qualificationLabel.localeCompare(right.qualificationLabel),
    ),
  };
}

export async function listQualificationRequirements(qualificationId?: string) {
  await requirePermission("qualifications.requirements.view");

  return prisma.qualificationRequirement.findMany({
    where: qualificationId ? { qualificationId } : undefined,
    include: {
      qualification: {
        include: {
          category: true,
        },
      },
      unit: true,
      position: {
        include: {
          unit: {
            select: {
              shortName: true,
            },
          },
        },
      },
    },
    orderBy: [
      { qualification: { category: { sortOrder: "asc" } } },
      { qualification: { label: "asc" } },
      { createdAt: "asc" },
    ],
  });
}

export async function getQualificationMatrixData(
  filters: QualificationMatrixFilters = {},
): Promise<QualificationMatrixData> {
  const user = await requirePermission("qualifications.matrix.view");
  const q = normalizeFilterValue(filters.q);
  const unitId = normalizeFilterValue(filters.unitId);
  const positionId = normalizeFilterValue(filters.positionId);
  const categoryId = normalizeFilterValue(filters.categoryId);
  const readiness = filters.readiness ?? "";
  const scopedWhere = buildMemberScopeWhere(user, "qualifications.matrix.view");

  const qualificationWhere: Prisma.QualificationWhereInput = {
    isActive: true,
    ...(categoryId ? { categoryId } : {}),
  };
  const memberWhere: Prisma.MemberProfileWhereInput = {
    isActive: true,
    deletedAt: null,
    ...scopedWhere,
    ...(unitId ? { currentUnitId: unitId } : {}),
    ...(positionId ? { currentPositionId: positionId } : {}),
    ...(q
      ? {
          OR: [
            { displayName: { contains: q } },
            { callsign: { contains: q } },
            { user: { is: { displayName: { contains: q } } } },
            { user: { is: { name: { contains: q } } } },
            { user: { is: { email: { contains: q } } } },
          ],
        }
      : {}),
  };

  const [qualifications, members] = await Promise.all([
    prisma.qualification.findMany({
      where: qualificationWhere,
      include: {
        category: true,
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { label: "asc" }],
    }),
    prisma.memberProfile.findMany({
      where: memberWhere,
      include: {
        currentRank: true,
        currentUnit: true,
        currentPosition: true,
        status: true,
        user: true,
        qualifications: {
          include: {
            qualification: {
              include: {
                category: true,
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { awardedAt: "desc" }],
        },
      },
      orderBy: [{ displayName: "asc" }],
    }),
  ]);

  const requirementRows = await prisma.qualificationRequirement.findMany({
    where: {
      qualificationId: {
        in: qualifications.map((qualification) => qualification.id),
      },
    },
    include: {
      unit: true,
      position: {
        include: {
          unit: {
            select: {
              shortName: true,
            },
          },
        },
      },
    },
  });

  const requirementsByQualificationId = new Map<string, typeof requirementRows>();

  for (const requirement of requirementRows) {
    requirementsByQualificationId.set(requirement.qualificationId, [
      ...(requirementsByQualificationId.get(requirement.qualificationId) ?? []),
      requirement,
    ]);
  }

  const columns = qualifications.map((qualification) => ({
    qualificationId: qualification.id,
    label: qualification.label,
    shortLabel: qualification.label.length > 8 ? qualification.label.slice(0, 8) : qualification.label,
    categoryLabel: qualification.category.label,
  }));

  const rows = members
    .map((member) => {
      const latestRecordByQualificationId = new Map<
        string,
        (typeof member.qualifications)[number]
      >();

      for (const record of member.qualifications) {
        if (!latestRecordByQualificationId.has(record.qualificationId)) {
          latestRecordByQualificationId.set(record.qualificationId, record);
        }
      }

      const cells = qualifications.map((qualification) => {
        const latestRecord = latestRecordByQualificationId.get(qualification.id);
        const relatedRequirements = (requirementsByQualificationId.get(qualification.id) ?? []).filter(
          (requirement) =>
            (requirement.unitId && requirement.unitId === member.currentUnitId) ||
            (requirement.positionId && requirement.positionId === member.currentPositionId),
        );
        const isRequired = relatedRequirements.some((requirement) => requirement.isRequired);
        const isRecommended = relatedRequirements.length > 0 && !isRequired;
        const status: QualificationStatus = latestRecord
          ? deriveQualificationStatus(latestRecord)
          : isRequired
            ? "missing"
            : "not-required";
        const expiringSoon = latestRecord ? isExpiringSoon(latestRecord.expiresAt) : false;

        return {
          qualificationId: qualification.id,
          qualificationLabel: qualification.label,
          categoryLabel: qualification.category.label,
          status,
          recordId: latestRecord?.id ?? null,
          isRequired,
          isRecommended,
          isExpiringSoon: expiringSoon,
          summary:
            status === "qualified"
              ? expiringSoon
                ? "Qualified, expiring soon"
                : "Qualified"
              : status === "pending_signoff"
                ? "Pending sign-off"
                : status === "expired"
                  ? "Expired"
                  : status === "revoked"
                    ? "Revoked"
                    : isRequired
                      ? "Missing required qualification"
                      : isRecommended
                        ? "Recommended qualification"
                        : "Not required",
        };
      });

      return {
        memberProfileId: member.id,
        memberDisplayName: getMemberDisplayName(member),
        callsign: member.callsign,
        rankAbbreviation: member.currentRank?.abbreviation ?? null,
        unitShortName: member.currentUnit?.shortName ?? null,
        positionTitle: member.currentPosition?.title ?? null,
        statusLabel: member.status.label,
        cells,
        missingRequiredCount: cells.filter((cell) => cell.status === "missing").length,
      };
    })
    .filter((row) => {
      if (readiness === "missing") {
        return row.missingRequiredCount > 0;
      }

      if (readiness === "expired") {
        return row.cells.some((cell) => cell.status === "expired");
      }

      if (readiness === "expiring") {
        return row.cells.some((cell) => cell.isExpiringSoon);
      }

      return true;
    });

  return {
    columns,
    rows,
    summary: {
      trackedMembers: rows.length,
      displayedQualifications: columns.length,
      expiringSoonCount: rows.reduce(
        (total, row) => total + row.cells.filter((cell) => cell.isExpiringSoon).length,
        0,
      ),
      missingRequiredCount: rows.reduce(
        (total, row) => total + row.missingRequiredCount,
        0,
      ),
    },
  };
}

export async function getQualificationRecordDetail(input: {
  memberProfileId: string;
  qualificationId: string;
}): Promise<QualificationRecordDetail | null> {
  const user = await getCurrentUser();
  const summary = await listMemberQualifications(input.memberProfileId);

  if (!summary) {
    return null;
  }

  const member = await prisma.memberProfile.findUnique({
    where: { id: input.memberProfileId },
    select: {
      displayName: true,
      user: true,
      currentUnit: {
        select: {
          id: true,
          shortName: true,
        },
      },
      currentPosition: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const qualification = await prisma.qualification.findUnique({
    where: { id: input.qualificationId },
    include: {
      category: true,
    },
  });

  if (!member || !qualification) {
    return null;
  }

  const record =
    summary.earned.find((entry) => entry.qualificationId === input.qualificationId) ??
    summary.pendingSignoff.find(
      (entry) => entry.qualificationId === input.qualificationId,
    ) ??
    summary.revokedOrExpired.find(
      (entry) => entry.qualificationId === input.qualificationId,
    ) ??
    null;
  const missing = summary.missingRequired.find(
    (entry) => entry.qualificationId === input.qualificationId,
  );
  const relatedRequirementScope: Prisma.QualificationRequirementWhereInput[] = [];

  if (member.currentUnit?.id) {
    relatedRequirementScope.push({ unitId: member.currentUnit.id });
  }

  if (member.currentPosition) {
    relatedRequirementScope.push({ positionId: member.currentPosition.id });
  }

  const relatedRequirements = await prisma.qualificationRequirement.findMany({
    where: {
      qualificationId: input.qualificationId,
      ...(relatedRequirementScope.length > 0
        ? {
            OR: relatedRequirementScope,
          }
        : {
            id: noAccessWhere,
          }),
    },
    include: {
      unit: true,
      position: {
        include: {
          unit: {
            select: {
              shortName: true,
            },
          },
        },
      },
    },
  });
  const recordHistory = await prisma.memberQualification.findMany({
    where: {
      memberProfileId: input.memberProfileId,
      qualificationId: input.qualificationId,
    },
    orderBy: [{ updatedAt: "desc" }, { awardedAt: "desc" }],
  });
  const activitySource = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          entityType: "MemberQualification",
          entityId: {
            in: recordHistory.map((entry) => entry.id),
          },
        },
        {
          entityType: "QualificationRequirement",
          entityId: {
            in: relatedRequirements.map((entry) => entry.id),
          },
        },
      ],
    },
    include: {
      actor: {
        select: {
          displayName: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 12,
  });
  const isRequired = relatedRequirements.some((entry) => entry.isRequired) || Boolean(missing);
  const isRecommended = relatedRequirements.length > 0 && !isRequired;
  const canSignOff =
    Boolean(user) &&
    Boolean(
      record?.status === "pending_signoff" &&
        (can(
          user!,
          "qualifications.signoff.manage",
          member.currentUnit?.id ? { unitId: member.currentUnit.id } : undefined,
        ) ||
          can(user!, "qualifications.signoff.manage")),
    );

  return {
    memberProfileId: input.memberProfileId,
    memberDisplayName: getMemberDisplayName(member),
    memberUnitShortName: member.currentUnit?.shortName ?? null,
    memberPositionTitle: member.currentPosition?.title ?? null,
    qualificationId: qualification.id,
    qualificationLabel: qualification.label,
    qualificationAbbreviation: getQualificationAbbreviation(qualification.label),
    categoryLabel: qualification.category.label,
    record,
    isRequired,
    isRecommended,
    requiredBy:
      record?.requiredBy ??
      missing?.requiredBy ??
      buildRequiredByLabels(relatedRequirements.map(mapQualificationRequirement)),
    activity: activitySource.map(mapQualificationActivityItem),
    canSignOff,
  };
}

export async function getMemberQualificationReadiness(
  memberProfileId: string,
): Promise<MemberQualificationReadinessSummary | null> {
  const summary = await listMemberQualifications(memberProfileId);

  if (!summary) {
    return null;
  }

  return calculateMemberQualificationReadiness({
    memberProfileId,
    expiringSoonCount: summary.expiringSoon.length,
    missingLabels: summary.missingRequired.map((entry) => entry.qualificationLabel),
    pendingSignoffCount: summary.pendingSignoff.length,
    qualifiedCount: summary.earned.length,
  });
}

export async function listPendingQualificationSignoffs(
  limit = 8,
): Promise<PendingQualificationSignoffItem[]> {
  const user = await requirePermission("qualifications.signoff.manage");
  const scopedWhere = buildMemberScopeWhere(user, "qualifications.signoff.manage");
  const records = await prisma.memberQualification.findMany({
    where: {
      status: "pending_signoff",
      revokedAt: null,
      memberProfile: {
        isActive: true,
        deletedAt: null,
        ...scopedWhere,
      },
    },
    include: {
      awardedBy: true,
      memberProfile: {
        include: {
          currentPosition: true,
          currentUnit: true,
          user: true,
        },
      },
      qualification: true,
    },
    orderBy: [{ awardedAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  return records.map((record) => ({
    recordId: record.id,
    memberProfileId: record.memberProfileId,
    memberDisplayName: getMemberDisplayName(record.memberProfile),
    qualificationId: record.qualificationId,
    qualificationLabel: record.qualification.label,
    unitShortName: record.memberProfile.currentUnit?.shortName ?? null,
    positionTitle: record.memberProfile.currentPosition?.title ?? null,
    awardedAt: record.awardedAt,
    awardedByDisplayName: getActorDisplayName(record.awardedBy),
  }));
}

export async function getQualificationDashboardSummary(): Promise<QualificationDashboardSummary> {
  await requirePermission("qualifications.view");

  const now = new Date();
  const expiringSoonCutoff = new Date(now);
  expiringSoonCutoff.setDate(expiringSoonCutoff.getDate() + EXPIRING_SOON_DAYS);

  const [
    catalogCount,
    archivedCount,
    requiredMappingsCount,
    pendingSignoffCount,
    expiringSoonCount,
  ] = await Promise.all([
    prisma.qualification.count({
      where: {
        isActive: true,
      },
    }),
    prisma.qualification.count({
      where: {
        isActive: false,
      },
    }),
    prisma.qualificationRequirement.count({
      where: {
        isRequired: true,
      },
    }),
    prisma.memberQualification.count({
      where: {
        revokedAt: null,
        status: "pending_signoff",
      },
    }),
    prisma.memberQualification.count({
      where: {
        revokedAt: null,
        expiresAt: {
          gte: now,
          lte: expiringSoonCutoff,
        },
      },
    }),
  ]);

  return {
    catalogCount,
    archivedCount,
    requiredMappingsCount,
    pendingSignoffCount,
    expiringSoonCount,
  };
}

export async function getUnitQualificationReadiness(
  unitId: string,
): Promise<UnitQualificationReadinessSummary | null> {
  const user = await getCurrentUser();

  if (
    !user ||
    (!can(user, "qualifications.matrix.view", { unitId }) &&
      !can(user, "qualifications.matrix.view"))
  ) {
    return null;
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      currentMembers: {
        where: {
          isActive: true,
          deletedAt: null,
        },
        include: {
          currentPosition: true,
          qualifications: {
            orderBy: [{ updatedAt: "desc" }, { awardedAt: "desc" }],
          },
        },
      },
    },
  });

  if (!unit) {
    return null;
  }

  const requirements = await prisma.qualificationRequirement.findMany({
    where: {
      isRequired: true,
      OR: [{ unitId: unit.id }, { position: { unitId: unit.id } }],
    },
    include: {
      qualification: true,
    },
  });

  const uniqueRequiredQualifications = Array.from(
    new Set(requirements.map((requirement) => requirement.qualificationId)),
  );
  const topMissingByQualificationId = new Map<
    string,
    { qualificationId: string; qualificationLabel: string; count: number }
  >();
  let missingRequiredCount = 0;
  let pendingSignoffCount = 0;
  let expiringSoonCount = 0;

  for (const member of unit.currentMembers) {
    const latestRecordByQualificationId = new Map<string, (typeof member.qualifications)[number]>();

    for (const record of member.qualifications) {
      if (!latestRecordByQualificationId.has(record.qualificationId)) {
        latestRecordByQualificationId.set(record.qualificationId, record);
      }
    }

    const memberRequiredQualifications = Array.from(
      new Set(
        requirements
          .filter(
            (requirement) =>
              requirement.unitId === unit.id ||
              requirement.positionId === member.currentPosition?.id,
          )
          .map((requirement) => requirement.qualificationId),
      ),
    );

    for (const qualificationId of memberRequiredQualifications) {
      const qualificationRequirement = requirements.find(
        (entry) => entry.qualificationId === qualificationId,
      );

      if (!qualificationRequirement) {
        continue;
      }

      const latestRecord = latestRecordByQualificationId.get(qualificationId);

      if (!latestRecord) {
        missingRequiredCount += 1;
        topMissingByQualificationId.set(qualificationId, {
          qualificationId,
          qualificationLabel: qualificationRequirement.qualification.label,
          count: (topMissingByQualificationId.get(qualificationId)?.count ?? 0) + 1,
        });
        continue;
      }

      const status = deriveQualificationStatus(latestRecord);

      if (status === "pending_signoff") {
        pendingSignoffCount += 1;
      } else if (status !== "qualified") {
        missingRequiredCount += 1;
        topMissingByQualificationId.set(qualificationId, {
          qualificationId,
          qualificationLabel: qualificationRequirement.qualification.label,
          count: (topMissingByQualificationId.get(qualificationId)?.count ?? 0) + 1,
        });
      } else if (isExpiringSoon(latestRecord.expiresAt)) {
        expiringSoonCount += 1;
      }
    }
  }

  return calculateUnitQualificationReadiness({
    expiringSoonCount,
    missingRequiredCount,
    pendingSignoffCount,
    requiredQualifications: uniqueRequiredQualifications.length,
    topMissingQualifications: Array.from(topMissingByQualificationId.values())
      .sort((left, right) => right.count - left.count || left.qualificationLabel.localeCompare(right.qualificationLabel))
      .slice(0, 5),
    trackedMembers: unit.currentMembers.length,
    unitId: unit.id,
    unitName: unit.name,
  });
}
