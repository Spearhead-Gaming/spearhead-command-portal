import { getMemberDisplayName } from "@/server/personnel";
import { prisma } from "@/server/database/client";
import { can, requirePermission } from "@/server/permissions/access";
import {
  evaluateCommunityManagementRules,
  getCommunityRecommendationsFromRules,
} from "@/server/community-management/rules";
import { listCaseTypeDefinitions } from "@/server/community-management/registry";
import type {
  CommunityManagementCaseListItem,
  CommunityManagementCenterData,
  CommunityHealthIndicator,
} from "@/server/community-management/types";

function getUserLabel(user?: { displayName: string | null; email: string | null; name: string | null } | null) {
  return user?.displayName ?? user?.name ?? user?.email ?? null;
}

function canViewConfidentiality(
  user: Awaited<ReturnType<typeof requirePermission>>,
  confidentiality: string,
) {
  if (confidentiality === "administrator_only") {
    return can(user, "admin.users.manage") || can(user, "cases.restricted.view");
  }

  if (confidentiality === "command_only") {
    return can(user, "cases.command.view") || can(user, "cases.restricted.view");
  }

  if (confidentiality === "restricted") {
    return can(user, "cases.restricted.view");
  }

  return true;
}

type CaseRecord = Awaited<ReturnType<typeof prisma.communityCase.findMany>>[number] & {
  assignedTo: { displayName: string | null; email: string | null; name: string | null } | null;
  relatedMember:
    | ({
        user: { displayName: string | null; email: string | null; name: string | null } | null;
      } & { displayName: string })
    | null;
  timelineEntries: Array<{ title: string }>;
};

function mapCase(record: CaseRecord): CommunityManagementCaseListItem {
  return {
    assignedToName: getUserLabel(record.assignedTo),
    caseNumber: record.caseNumber,
    caseType: record.caseType,
    confidentiality: record.confidentiality,
    createdAt: record.createdAt,
    dueAt: record.dueAt,
    id: record.id,
    latestTimeline: record.timelineEntries[0]?.title ?? null,
    priority: record.priority,
    relatedMemberName: record.relatedMember ? getMemberDisplayName(record.relatedMember) : null,
    status: record.status,
    title: record.title,
  };
}

function indicator(input: CommunityHealthIndicator): CommunityHealthIndicator {
  return input;
}

export async function getCommunityManagementCenterData(): Promise<CommunityManagementCenterData> {
  const user = await requirePermission("community.view");
  const now = new Date();
  const caseInclude = {
    assignedTo: {
      select: {
        displayName: true,
        email: true,
        name: true,
      },
    },
    relatedMember: {
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
    timelineEntries: {
      orderBy: {
        createdAt: "desc" as const,
      },
      select: {
        title: true,
      },
      take: 1,
    },
  };
  const [cases, moderationActions, staffWorkloadRows, missingEvidenceSeriousCases, members, activeUsers, discordServers] = await Promise.all([
    prisma.communityCase.findMany({
      include: caseInclude,
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      take: 80,
    }),
    prisma.discordModerationAction.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    }),
    prisma.communityCase.groupBy({
      by: ["assignedToUserId"],
      where: {
        assignedToUserId: {
          not: null,
        },
        status: {
          in: ["open", "under_review", "awaiting_information", "pending_decision", "reopened"],
        },
      },
      _count: {
        id: true,
      },
    }),
    prisma.communityCase.count({
      where: {
        evidence: {
          none: {},
        },
        priority: {
          in: ["critical", "high"],
        },
        status: {
          in: ["open", "under_review", "awaiting_information", "pending_decision", "reopened"],
        },
      },
    }),
    prisma.memberProfile.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        displayName: "asc",
      },
      take: 100,
      where: {
        deletedAt: null,
        isActive: true,
      },
    }),
    prisma.user.findMany({
      orderBy: {
        displayName: "asc",
      },
      select: {
        displayName: true,
        email: true,
        id: true,
        name: true,
      },
      take: 100,
      where: {
        isActive: true,
      },
    }),
    prisma.discordServer.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
      where: {
        isActive: true,
      },
    }),
  ]);
  const visibleCases = cases.filter((record) => canViewConfidentiality(user, record.confidentiality));
  const openStatuses = ["open", "under_review", "awaiting_information", "pending_decision", "reopened"];
  const openCases = visibleCases.filter((record) => openStatuses.includes(record.status));
  const criticalCases = openCases.filter((record) => record.priority === "critical");
  const awaitingAssignment = openCases.filter((record) => !record.assignedToUserId);
  const awaitingDecision = openCases.filter((record) => record.status === "pending_decision");
  const pendingAppeals = visibleCases.filter((record) => record.caseType === "APPEAL" && openStatuses.includes(record.status));
  const overdueCases = openCases.filter((record) => record.dueAt && record.dueAt < now);
  const failedModerationActions = moderationActions.filter((action) => action.result === "failed" || action.result === "pending_provider");
  const userIds = staffWorkloadRows
    .map((row) => row.assignedToUserId)
    .filter((id): id is string => Boolean(id));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          displayName: true,
          email: true,
          id: true,
          name: true,
        },
      })
    : [];
  const usersById = new Map(users.map((staff) => [staff.id, staff]));
  const staffWorkload = staffWorkloadRows
    .map((row) => ({
      assignedCount: row._count.id,
      userId: row.assignedToUserId ?? "unassigned",
      userName: getUserLabel(usersById.get(row.assignedToUserId ?? "")) ?? "Unknown Staff",
    }))
    .sort((left, right) => right.assignedCount - left.assignedCount);
  const ruleOutput = await evaluateCommunityManagementRules({
    awaitingAssignment: awaitingAssignment.length,
    awaitingDecision: awaitingDecision.length,
    criticalCases: criticalCases.length,
    failedModerationActions: failedModerationActions.length,
    missingEvidenceSeriousCases,
    overdueCases: overdueCases.length,
    staffOverloadCount: staffWorkload.filter((entry) => entry.assignedCount >= 5).length,
  });

  return {
    appeals: pendingAppeals.map(mapCase),
    cases: visibleCases.map(mapCase),
    caseTypes: listCaseTypeDefinitions(),
    healthIndicators: [
      indicator({
        hint: "Active cases that need ownership or review.",
        label: "Open Cases",
        tone: openCases.length > 0 ? "info" : "success",
        value: String(openCases.length),
      }),
      indicator({
        hint: "Cases marked critical by staff.",
        label: "Critical Cases",
        tone: criticalCases.length > 0 ? "danger" : "success",
        value: String(criticalCases.length),
      }),
      indicator({
        hint: "Active cases past their due date.",
        label: "Overdue",
        tone: overdueCases.length > 0 ? "warning" : "success",
        value: String(overdueCases.length),
      }),
      indicator({
        hint: "Discord moderation actions needing staff follow-up.",
        label: "Moderation Follow-up",
        tone: failedModerationActions.length > 0 ? "warning" : "success",
        value: String(failedModerationActions.length),
      }),
    ],
    moderationActions: moderationActions.map((action) => ({
      action: action.action,
      createdAt: action.createdAt,
      errorMessage: action.errorMessage,
      id: action.id,
      reason: action.reason,
      result: action.result,
      targetDiscordUserId: action.targetDiscordUserId,
    })),
    reference: {
      discordServers,
      members: members.map((member) => ({
        displayName: getMemberDisplayName(member),
        id: member.id,
        userId: member.userId,
      })),
      users: activeUsers.map((activeUser) => ({
        displayName: getUserLabel(activeUser) ?? "Unknown User",
        id: activeUser.id,
      })),
    },
    queues: {
      awaitingAssignment: awaitingAssignment.length,
      awaitingDecision: awaitingDecision.length,
      criticalCases: criticalCases.length,
      openCases: openCases.length,
      overdueCases: overdueCases.length,
      pendingAppeals: pendingAppeals.length,
    },
    recommendations: getCommunityRecommendationsFromRules(ruleOutput.results),
    ruleSignals: ruleOutput.results
      .filter((rule) => rule.status !== "PASS")
      .map((rule) => ({
        id: rule.id,
        message: rule.message,
        recommendedAction: rule.recommendedAction,
        severity: rule.severity,
        status: rule.status,
        title: rule.title,
      })),
    staffWorkload,
  };
}
