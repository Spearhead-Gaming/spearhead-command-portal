import { prisma } from "@/server/database/client";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function formatOptionalTimestamp(value: Date | null) {
  return value ? formatTimestamp(value) : null;
}

export async function getDiscordAutomationOverview() {
  const [
    definitions,
    recentExecutions,
    pendingApprovals,
    failedActions,
    managedRoleCount,
    openDriftCount,
    openConflictCount,
    activeExceptionCount,
  ] = await Promise.all([
    prisma.discordAutomationDefinition.findMany({
      include: {
        discordRoleMapping: {
          include: {
            discordServer: true,
            qualification: true,
            unit: true,
          },
        },
      },
      orderBy: [
        {
          owningDomain: "asc",
        },
        {
          triggerType: "asc",
        },
        {
          name: "asc",
        },
      ],
      take: 100,
    }),
    prisma.discordAutomationExecution.findMany({
      include: {
        actionResults: true,
        memberProfile: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.discordAutomationExecution.findMany({
      include: {
        actionResults: true,
        memberProfile: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
      where: {
        status: "awaiting_approval",
      },
    }),
    prisma.discordAutomationActionExecution.findMany({
      include: {
        execution: true,
        memberProfile: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 25,
      where: {
        status: "failed",
      },
    }),
    prisma.discordManagedRoleAssignment.count({
      where: {
        isCurrent: true,
      },
    }),
    prisma.discordRoleDrift.count({
      where: {
        status: "open",
      },
    }),
    prisma.discordAutomationConflict.count({
      where: {
        status: "open",
      },
    }),
    prisma.discordAutomationException.count({
      where: {
        isActive: true,
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: new Date(),
            },
          },
        ],
      },
    }),
  ]);

  return {
    definitions: definitions.map((definition) => ({
      archivedAtLabel: formatOptionalTimestamp(definition.archivedAt),
      domain: definition.owningDomain,
      enabled: definition.enabled,
      executionMode: definition.executionMode,
      id: definition.id,
      key: definition.key,
      mappingLabel:
        definition.discordRoleMapping?.qualification?.label ??
        definition.discordRoleMapping?.unit?.name ??
        definition.discordRoleMapping?.discordRoleName ??
        null,
      name: definition.name,
      serverName: definition.discordRoleMapping?.discordServer.name ?? null,
      triggerType: definition.triggerType,
      updatedAtLabel: formatTimestamp(definition.updatedAt),
    })),
    failedActions: failedActions.map((action) => ({
      actionType: action.actionType,
      errorMessage: action.errorMessage,
      executionId: action.executionId,
      id: action.id,
      memberName: action.memberProfile?.displayName ?? action.discordUserId ?? "Unknown member",
      retryable: action.retryable,
      roleLabel: action.targetRoleName ?? action.targetRoleId ?? "Unknown role",
      sourceLabel: `${action.sourceEntityType} ${action.sourceEntityId.slice(0, 8)}`,
      updatedAtLabel: formatTimestamp(action.updatedAt),
    })),
    recentExecutions: recentExecutions.map((execution) => ({
      actionCount: execution.actionCount,
      completedAtLabel: formatOptionalTimestamp(execution.completedAt),
      createdAtLabel: formatTimestamp(execution.createdAt),
      executionMode: execution.executionMode,
      failedActionCount: execution.failedActionCount,
      id: execution.id,
      memberName: execution.memberProfile?.displayName ?? "Unknown member",
      sourceLabel: `${execution.sourceEntityType} ${execution.sourceEntityId.slice(0, 8)}`,
      status: execution.status,
      succeededActionCount: execution.succeededActionCount,
      triggerType: execution.triggerType,
    })),
    summary: {
      activeExceptionCount,
      automaticDefinitionCount: definitions.filter((definition) => definition.executionMode === "automatic").length,
      definitionCount: definitions.length,
      enabledDefinitionCount: definitions.filter((definition) => definition.enabled && !definition.archivedAt).length,
      failedActionCount: failedActions.length,
      managedRoleCount,
      openConflictCount,
      openDriftCount,
      pendingApprovalCount: pendingApprovals.length,
      previewOnlyDefinitionCount: definitions.filter((definition) => definition.executionMode === "preview_only").length,
    },
    pendingApprovals: pendingApprovals.map((execution) => ({
      actionCount: execution.actionCount,
      createdAtLabel: formatTimestamp(execution.createdAt),
      executionMode: execution.executionMode,
      id: execution.id,
      memberName: execution.memberProfile?.displayName ?? "Unknown member",
      sourceLabel: `${execution.sourceEntityType} ${execution.sourceEntityId.slice(0, 8)}`,
      status: execution.status,
      triggerType: execution.triggerType,
    })),
  };
}

export type DiscordAutomationOverview = Awaited<ReturnType<typeof getDiscordAutomationOverview>>;
