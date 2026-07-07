import type { PortalUser } from "@/features/auth/types";
import { prisma } from "@/server/database/client";
import { requirePermission } from "@/server/permissions/access";
import { getMemberDisplayName } from "@/server/personnel";
import type { UnitDashboardData, UnitListItem } from "@/server/personnel/types";

const noAccessWhere = { in: ["__no-access__"] };

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

function mapUnitSummary(
  unit: {
    id: string;
    key: string;
    name: string;
    shortName: string;
    parentUnit: { name: string } | null;
    positions: { id: string }[];
    currentMembers: { status: { key: string } }[];
  },
): UnitListItem {
  const activeMembers = unit.currentMembers.filter(
    (member) => member.status.key === "active",
  ).length;
  const loaMembers = unit.currentMembers.filter(
    (member) => member.status.key === "loa",
  ).length;
  const inactiveMembers = unit.currentMembers.filter((member) =>
    ["inactive", "reserve"].includes(member.status.key),
  ).length;

  return {
    id: unit.id,
    key: unit.key,
    name: unit.name,
    shortName: unit.shortName,
    parentUnitName: unit.parentUnit?.name ?? null,
    activeMembers,
    loaMembers,
    inactiveMembers,
    openBillets: Math.max(unit.positions.length - unit.currentMembers.length, 0),
    rosterCount: unit.currentMembers.length,
  };
}

export async function listUnits() {
  const user = await requirePermission("units.view");
  const viewScope = getPermissionScope(user, "units.view");
  const dashboardScope = getPermissionScope(user, "units.dashboard.view");
  const allowedUnitIds = viewScope.global
    ? null
    : Array.from(new Set([...viewScope.unitIds, ...dashboardScope.unitIds]));

  const units = await prisma.unit.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(allowedUnitIds
        ? {
            id: {
              in: allowedUnitIds.length > 0 ? allowedUnitIds : noAccessWhere.in,
            },
          }
        : {}),
    },
    include: {
      parentUnit: true,
      positions: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      },
      currentMembers: {
        where: {
          isActive: true,
          deletedAt: null,
        },
        include: {
          status: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    user,
    units: units.map(mapUnitSummary),
  };
}

export async function getUnitDashboard(unitIdentifier: string): Promise<UnitDashboardData | null> {
  const user = await requirePermission("units.view");
  const unit = await prisma.unit.findFirst({
    where: {
      OR: [{ id: unitIdentifier }, { key: unitIdentifier }],
      isActive: true,
      deletedAt: null,
    },
    include: {
      parentUnit: true,
      positions: {
        where: {
          isActive: true,
        },
        orderBy: [{ isLeadership: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
      },
      currentMembers: {
        where: {
          isActive: true,
          deletedAt: null,
        },
        include: {
          status: true,
          currentRank: true,
          currentPosition: true,
          currentUnit: true,
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
      },
    },
  });

  if (!unit) {
    return null;
  }

  const dashboardScope = getPermissionScope(user, "units.dashboard.view");
  const hasDashboardAccess =
    dashboardScope.global || dashboardScope.unitIds.includes(unit.id);

  if (!hasDashboardAccess) {
    return null;
  }

  const activeAssignments = await prisma.rosterAssignment.findMany({
    where: {
      unitId: unit.id,
      endsAt: null,
      isPrimary: true,
    },
    select: {
      positionId: true,
      memberProfile: {
        select: {
          displayName: true,
          user: {
            select: {
              displayName: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const assignmentByPositionId = new Map(
    activeAssignments
      .filter((assignment) => assignment.positionId)
      .map((assignment) => [
        assignment.positionId as string,
        getMemberDisplayName(assignment.memberProfile),
      ]),
  );

  return {
    ...mapUnitSummary(unit),
    roster: unit.currentMembers.map((member) => ({
      id: member.id,
      displayName: getMemberDisplayName(member),
      callsign: member.callsign,
      joinDate: member.joinDate,
      lastUpdatedAt: member.updatedAt,
      discordLinked: Boolean(member.user?.id),
      rank: member.currentRank,
      unit: member.currentUnit,
      position: member.currentPosition,
      status: member.status,
    })),
    positions: unit.positions.map((position) => ({
      id: position.id,
      title: position.title,
      isLeadership: position.isLeadership,
      assignedMemberName: assignmentByPositionId.get(position.id) ?? null,
    })),
  };
}
