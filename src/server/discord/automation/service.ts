import { randomUUID, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/database/client";
import {
  type DiscordAutomationActionType,
  type DiscordAutomationExecutionMode,
} from "@/server/discord/automation/constants";
import {
  addDiscordGuildRole,
  getDiscordGuildMemberRoleState,
  removeDiscordGuildRole,
} from "@/server/discord/automation/role-actions";
import type {
  DiscordAutomationPlannedAction,
  DiscordAutomationPreview,
  DiscordAutomationSourceEvent,
  DiscordAutomationValidationMessage,
  DiscordAutomationValidationResult,
} from "@/server/discord/automation/types";
import { processCommunicationRequest } from "@/server/communications/pipeline";
import { recordAuditEvent } from "@/server/services/audit-log-service";

type RoleMappingWithRelations = Prisma.DiscordRoleMappingGetPayload<{
  include: {
    discordServer: true;
    qualification: true;
    rank: true;
    role: true;
    unit: true;
  };
}>;

type AutomationDefinitionWithMapping = Prisma.DiscordAutomationDefinitionGetPayload<{
  include: {
    discordRoleMapping: {
      include: {
        discordServer: true;
        qualification: true;
        rank: true;
        role: true;
        unit: true;
      };
    };
  };
}>;

const AUTOMATION_REVALIDATE_PATHS = [
  "/administration/discord",
  "/personnel/qualifications",
  "/training/qualification-matrix",
];

function revalidateAutomationSurfaces() {
  for (const path of AUTOMATION_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function hashKey(parts: Array<string | null | undefined>) {
  return createHash("sha256")
    .update(parts.map((part) => part ?? "none").join(":"))
    .digest("hex")
    .slice(0, 48);
}

function getDefinitionKey(input: {
  actionType: DiscordAutomationActionType;
  mappingId: string;
  triggerType: string;
}) {
  return `discord-role-mapping:${input.mappingId}:${input.triggerType}:${input.actionType}`;
}

function getMappedEntityLabel(mapping: RoleMappingWithRelations) {
  switch (mapping.mappingType) {
    case "qualification":
      return mapping.qualification?.label ?? "Unknown qualification";
    case "unit":
      return mapping.unit?.name ?? "Unknown unit";
    case "portal_role":
      return mapping.role?.label ?? "Unknown portal role";
    case "rank":
      return mapping.rank?.label ?? "Unknown rank";
    default:
      return "Mapped Discord role";
  }
}

function getMappingDefinitions(mapping: RoleMappingWithRelations) {
  const roleName = mapping.discordRoleName ?? mapping.discordRoleId;
  const common = {
    description: `Generated from Discord role mapping for ${getMappedEntityLabel(mapping)}.`,
    discordRoleMappingId: mapping.id,
    enabled: mapping.isActive,
    executionMode: "preview_only" as DiscordAutomationExecutionMode,
    guildScope: {
      discordServerId: mapping.discordServerId,
      guildId: mapping.discordServer.guildId,
    },
    priority: 500,
    rollbackStrategy: "manual_compensation",
  };

  if (mapping.mappingType === "qualification" && mapping.qualificationId) {
    return [
      {
        ...common,
        actionType: "add_role" as const,
        key: getDefinitionKey({
          actionType: "add_role",
          mappingId: mapping.id,
          triggerType: "qualification.awarded",
        }),
        name: `Add ${roleName} when ${mapping.qualification?.label ?? "qualification"} is awarded`,
        owningDomain: "qualifications",
        triggerType: "qualification.awarded",
      },
      {
        ...common,
        actionType: "add_role" as const,
        key: getDefinitionKey({
          actionType: "add_role",
          mappingId: mapping.id,
          triggerType: "qualification.renewed",
        }),
        name: `Verify ${roleName} when ${mapping.qualification?.label ?? "qualification"} is renewed`,
        owningDomain: "qualifications",
        triggerType: "qualification.renewed",
      },
      {
        ...common,
        actionType: "remove_role" as const,
        key: getDefinitionKey({
          actionType: "remove_role",
          mappingId: mapping.id,
          triggerType: "qualification.revoked",
        }),
        name: `Remove ${roleName} when ${mapping.qualification?.label ?? "qualification"} is revoked`,
        owningDomain: "qualifications",
        triggerType: "qualification.revoked",
      },
      {
        ...common,
        actionType: "remove_role" as const,
        key: getDefinitionKey({
          actionType: "remove_role",
          mappingId: mapping.id,
          triggerType: "qualification.expired",
        }),
        name: `Review ${roleName} when ${mapping.qualification?.label ?? "qualification"} expires`,
        owningDomain: "qualifications",
        triggerType: "qualification.expired",
      },
    ];
  }

  if (mapping.mappingType === "unit" && mapping.unitId) {
    return [
      {
        ...common,
        actionType: "add_role" as const,
        key: getDefinitionKey({
          actionType: "add_role",
          mappingId: mapping.id,
          triggerType: "personnel.unit_assigned",
        }),
        name: `Add ${roleName} when assigned to ${mapping.unit?.name ?? "unit"}`,
        owningDomain: "personnel",
        triggerType: "personnel.unit_assigned",
      },
      {
        ...common,
        actionType: "remove_role" as const,
        key: getDefinitionKey({
          actionType: "remove_role",
          mappingId: mapping.id,
          triggerType: "personnel.unit_removed",
        }),
        name: `Remove ${roleName} when removed from ${mapping.unit?.name ?? "unit"}`,
        owningDomain: "personnel",
        triggerType: "personnel.unit_removed",
      },
    ];
  }

  return [];
}

async function getMemberDiscordIdentity(memberProfileId: string) {
  const member = await prisma.memberProfile.findUnique({
    where: {
      id: memberProfileId,
    },
    include: {
      status: true,
      user: {
        select: {
          discordId: true,
          id: true,
        },
      },
      discordMemberLinks: {
        orderBy: {
          lastSeenAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!member) {
    throw new Error("Member profile not found.");
  }

  return {
    discordUserId: member.user?.discordId ?? member.discordMemberLinks[0]?.discordUserId ?? null,
    member,
  };
}

function definitionMatchesSource(
  definition: AutomationDefinitionWithMapping,
  sourceEvent: DiscordAutomationSourceEvent,
) {
  const mapping = definition.discordRoleMapping;

  if (!mapping || !mapping.isActive) {
    return false;
  }

  if (definition.triggerType !== sourceEvent.triggerType) {
    return false;
  }

  if (mapping.mappingType === "qualification") {
    return mapping.qualificationId === sourceEvent.sourceEntityId;
  }

  if (mapping.mappingType === "unit") {
    return mapping.unitId === sourceEvent.sourceEntityId;
  }

  return true;
}

function buildPlannedAction(input: {
  definition: AutomationDefinitionWithMapping;
  discordUserId: string;
  sourceEvent: DiscordAutomationSourceEvent;
}): DiscordAutomationPlannedAction | null {
  const mapping = input.definition.discordRoleMapping;

  if (!mapping) {
    return null;
  }

  const actionDefinition = Array.isArray(input.definition.actions)
    ? (input.definition.actions[0] as { actionType?: string } | undefined)
    : null;
  const actionType = actionDefinition?.actionType;

  if (actionType !== "add_role" && actionType !== "remove_role") {
    return null;
  }

  const idempotencyKey = [
    "discord-automation-action",
    input.sourceEvent.triggerType,
    input.sourceEvent.sourceEntityType,
    input.sourceEvent.sourceEntityId,
    input.definition.id,
    mapping.discordServerId,
    mapping.discordRoleId,
    input.discordUserId,
  ].join(":");

  return {
    actionType,
    definitionId: input.definition.id,
    discordRoleId: mapping.discordRoleId,
    discordRoleName: mapping.discordRoleName,
    discordServerId: mapping.discordServerId,
    discordUserId: input.discordUserId,
    guildId: mapping.discordServer.guildId,
    idempotencyKey,
    memberProfileId: input.sourceEvent.memberProfileId,
    reason: `${input.sourceEvent.triggerType} from ${input.sourceEvent.sourceEntityType}.`,
    sourceDomain: input.sourceEvent.sourceDomain,
    sourceEntityId: input.sourceEvent.sourceEntityId,
    sourceEntityType: input.sourceEvent.sourceEntityType,
    targetRoleId: mapping.discordRoleId,
  };
}

function worstValidationStatus(
  messages: DiscordAutomationValidationMessage[],
): DiscordAutomationValidationResult["status"] {
  if (messages.some((message) => message.status === "blocked")) {
    return "blocked";
  }

  if (messages.some((message) => message.status === "warning")) {
    return "warning";
  }

  if (messages.some((message) => message.status === "no_change")) {
    return "no_change";
  }

  return "pass";
}

async function validatePlannedAction(
  action: DiscordAutomationPlannedAction,
): Promise<DiscordAutomationValidationResult> {
  const messages: DiscordAutomationValidationMessage[] = [];

  const [server, role, guildMemberState, existingCompletedAction, activeException] =
    await Promise.all([
      prisma.discordServer.findUnique({
        where: {
          id: action.discordServerId,
        },
      }),
      action.discordRoleId
        ? prisma.discordGuildRole.findUnique({
            where: {
              discordServerId_roleId: {
                discordServerId: action.discordServerId,
                roleId: action.discordRoleId,
              },
            },
          })
        : Promise.resolve(null),
      prisma.discordGuildMemberState.findUnique({
        where: {
          discordServerId_discordUserId: {
            discordServerId: action.discordServerId,
            discordUserId: action.discordUserId,
          },
        },
      }),
      prisma.discordAutomationActionExecution.findUnique({
        where: {
          idempotencyKey: action.idempotencyKey,
        },
      }),
      prisma.discordAutomationException.findFirst({
        where: {
          AND: [
            {
              OR: [
                {
                  automationDefinitionId: action.definitionId,
                },
                {
                  automationDefinitionId: null,
                },
              ],
            },
            {
              OR: [
                {
                  discordRoleId: action.discordRoleId,
                },
                {
                  discordRoleId: null,
                },
              ],
            },
            {
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
          ],
          isActive: true,
          OR: [{ memberProfileId: action.memberProfileId }, { memberProfileId: null }],
        },
      }),
    ]);

  if (existingCompletedAction && ["succeeded", "no_change"].includes(existingCompletedAction.status)) {
    messages.push({
      message: "This idempotent action already completed.",
      recommendedAction: "No action required.",
      status: "no_change",
      title: "Already completed",
    });
  }

  if (activeException) {
    messages.push({
      message: activeException.reason,
      recommendedAction: "Review or expire the automation exception before execution.",
      status: "blocked",
      title: "Automation exception active",
    });
  }

  if (!server || !server.isActive || server.status === "archived") {
    messages.push({
      message: "The target Discord guild is not active.",
      recommendedAction: "Enable or remap the guild before running automation.",
      status: "blocked",
      title: "Guild disabled",
    });
  }

  if (!action.discordRoleId || !role) {
    messages.push({
      message: "The target Discord role was not found in discovered inventory.",
      recommendedAction: "Run discovery, then remap to the correct Discord role ID.",
      status: "blocked",
      title: "Role missing",
    });
  } else {
    if (role.isArchived || role.isMissing) {
      messages.push({
        message: "The target Discord role is missing or archived.",
        recommendedAction: "Resolve the reconciliation item or remap the automation.",
        status: "blocked",
        title: "Role not available",
      });
    }

    if (role.managed) {
      messages.push({
        message: "Discord marks this role as managed by an integration.",
        recommendedAction: "Select a normal Discord role that the bot is allowed to manage.",
        status: "blocked",
        title: "Discord-managed role",
      });
    }

    if (!role.botManageable) {
      messages.push({
        message: "Bot role hierarchy has not been verified above this role.",
        recommendedAction: "Verify Manage Roles and role hierarchy before enabling automatic execution.",
        status: "warning",
        title: "Hierarchy not verified",
      });
    }
  }

  if (!guildMemberState || guildMemberState.syncStatus !== "present") {
    messages.push({
      message: "The member is not currently known as present in the target guild.",
      recommendedAction: "Sync guild members or invite/link the member before execution.",
      status: "blocked",
      title: "Member absent from guild",
    });
  }

  if (messages.length === 0) {
    messages.push({
      message: "The planned action passed portal-side validation.",
      recommendedAction: "Preview, approve, or execute according to automation mode.",
      status: "pass",
      title: "Validation passed",
    });
  }

  return {
    messages,
    retryable: messages.some((message) =>
      ["Member absent from guild", "Hierarchy not verified"].includes(message.title),
    ),
    status: worstValidationStatus(messages),
  };
}

async function createReconciliationForBlockedAction(input: {
  action: DiscordAutomationPlannedAction;
  executionId: string;
  validation: DiscordAutomationValidationResult;
}) {
  if (input.validation.status !== "blocked") {
    return;
  }

  await prisma.discordReconciliationItem.create({
    data: {
      affectedModules: {
        sourceDomain: input.action.sourceDomain,
        sourceEntityId: input.action.sourceEntityId,
        sourceEntityType: input.action.sourceEntityType,
      },
      changeStatus: "AutomationBlocked",
      discordServerId: input.action.discordServerId,
      guildId: input.action.guildId,
      recommendedAction: input.validation.messages[0]?.recommendedAction ?? "Review automation validation.",
      resourceId: input.action.discordRoleId ?? "unknown-role",
      resourceType: "role",
      severity: "warning",
      summary: input.validation.messages[0]?.message ?? "Discord automation action blocked.",
      title: input.validation.messages[0]?.title ?? "Discord automation blocked",
    },
  });
}

export class DiscordAutomationEngine {
  async syncDefinitionsFromRoleMappings(input: { actorUserId?: string | null } = {}) {
    const mappings = await prisma.discordRoleMapping.findMany({
      include: {
        discordServer: true,
        qualification: true,
        rank: true,
        role: true,
        unit: true,
      },
    });
    let created = 0;
    let updated = 0;

    for (const mapping of mappings) {
      for (const definition of getMappingDefinitions(mapping)) {
        const existing = await prisma.discordAutomationDefinition.findUnique({
          where: {
            key: definition.key,
          },
        });
        const actions = [
          {
            actionType: definition.actionType,
            discordRoleId: mapping.discordRoleId,
            discordRoleName: mapping.discordRoleName,
            discordServerId: mapping.discordServerId,
          },
        ];

        await prisma.discordAutomationDefinition.upsert({
          create: {
            actions,
            conditions: [
              { type: "member_has_linked_discord_identity" },
              { type: "guild_enabled" },
              { type: "target_role_exists" },
              { type: "member_present_in_guild" },
            ],
            conflictPolicy: "manual_review",
            description: definition.description,
            discordRoleMappingId: definition.discordRoleMappingId,
            enabled: definition.enabled,
            executionMode: definition.executionMode,
            guildScope: definition.guildScope,
            key: definition.key,
            name: definition.name,
            notificationPolicy: {
              notifyMember: false,
              notifyStaffOnFailure: true,
            },
            owningDomain: definition.owningDomain,
            priority: definition.priority,
            retryPolicy: {
              maxAttempts: 3,
              retryTransientFailures: true,
            },
            rollbackStrategy: definition.rollbackStrategy,
            targetScope: {
              discordRoleId: mapping.discordRoleId,
              mappingType: mapping.mappingType,
            },
            triggerType: definition.triggerType,
          },
          update: {
            actions,
            archivedAt: mapping.isActive ? null : existing?.archivedAt ?? null,
            enabled: mapping.isActive,
            guildScope: definition.guildScope,
            name: definition.name,
            targetScope: {
              discordRoleId: mapping.discordRoleId,
              mappingType: mapping.mappingType,
            },
            updatedByUserId: input.actorUserId ?? null,
          },
          where: {
            key: definition.key,
          },
        });

        if (existing) {
          updated += 1;
        } else {
          created += 1;
        }
      }
    }

    await recordAuditEvent({
      action: "discord.automation.definitions_synced",
      actorUserId: input.actorUserId ?? null,
      entityType: "DiscordAutomationDefinition",
      metadata: {
        created,
        updated,
      },
      summary: "Discord automation definitions synchronized from role mappings.",
    });
    revalidateAutomationSurfaces();

    return { created, updated };
  }

  async planForSourceEvent(
    sourceEvent: DiscordAutomationSourceEvent,
  ): Promise<DiscordAutomationPreview | null> {
    await this.syncDefinitionsFromRoleMappings({
      actorUserId: sourceEvent.actorUserId,
    });

    const { discordUserId } = await getMemberDiscordIdentity(sourceEvent.memberProfileId);

    if (!discordUserId) {
      return null;
    }

    const definitions = await prisma.discordAutomationDefinition.findMany({
      where: {
        archivedAt: null,
        enabled: true,
        triggerType: sourceEvent.triggerType,
      },
      include: {
        discordRoleMapping: {
          include: {
            discordServer: true,
            qualification: true,
            rank: true,
            role: true,
            unit: true,
          },
        },
      },
      orderBy: [
        {
          priority: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    const plannedActions = definitions
      .filter((definition) => definitionMatchesSource(definition, sourceEvent))
      .map((definition) =>
        buildPlannedAction({
          definition,
          discordUserId,
          sourceEvent,
        }),
      )
      .filter((action): action is DiscordAutomationPlannedAction => action !== null);

    if (plannedActions.length === 0) {
      return null;
    }

    const executionMode = definitions.reduce<DiscordAutomationExecutionMode>(
      (mode, definition) =>
        mode === "automatic" || definition.executionMode === "automatic"
          ? "automatic"
          : mode === "manual_approval" || definition.executionMode === "manual_approval"
            ? "manual_approval"
            : "preview_only",
      "preview_only",
    );
    const executionIdempotencyKey = [
      "discord-automation-execution",
      sourceEvent.triggerType,
      sourceEvent.sourceEntityType,
      sourceEvent.sourceEntityId,
      sourceEvent.memberProfileId,
      hashKey(plannedActions.map((action) => action.idempotencyKey)),
    ].join(":");
    const existing = await prisma.discordAutomationExecution.findUnique({
      where: {
        idempotencyKey: executionIdempotencyKey,
      },
    });

    if (existing) {
      return {
        actionCount: existing.actionCount,
        executionId: existing.id,
        executionMode: existing.executionMode as DiscordAutomationExecutionMode,
        status: existing.status,
        warnings: [],
      };
    }

    const validations = await Promise.all(plannedActions.map(validatePlannedAction));
    const blockedCount = validations.filter((validation) => validation.status === "blocked").length;
    const warningMessages = validations.flatMap((validation) =>
      validation.messages.filter((message) => message.status === "warning" || message.status === "blocked"),
    );
    const initialStatus =
      blockedCount > 0
        ? "reconciliation_required"
        : executionMode === "manual_approval"
          ? "awaiting_approval"
          : executionMode === "automatic"
            ? "approved"
            : "planned";

    const execution = await prisma.$transaction(async (transaction) => {
      const createdExecution = await transaction.discordAutomationExecution.create({
        data: {
          actionCount: plannedActions.length,
          actorUserId: sourceEvent.actorUserId ?? null,
          correlationId: randomUUID(),
          executionMode,
          idempotencyKey: executionIdempotencyKey,
          memberProfileId: sourceEvent.memberProfileId,
          plannedActions: toJson(plannedActions),
          sourceDomain: sourceEvent.sourceDomain,
          sourceEntityId: sourceEvent.sourceEntityId,
          sourceEntityType: sourceEvent.sourceEntityType,
          status: initialStatus,
          triggerType: sourceEvent.triggerType,
          validationSummary: toJson({
            blockedCount,
            warningCount: warningMessages.length,
            warnings: warningMessages,
          }),
        },
      });

      for (let index = 0; index < plannedActions.length; index += 1) {
        const action = plannedActions[index]!;
        const validation = validations[index]!;

        await transaction.discordAutomationActionExecution.create({
          data: {
            actionType: action.actionType,
            desiredFinalState: {
              roleId: action.discordRoleId,
              state: action.actionType === "remove_role" ? "absent" : "present",
            },
            discordServerId: action.discordServerId,
            discordUserId,
            errorMessage: validation.status === "blocked" ? validation.messages[0]?.message : null,
            executionId: createdExecution.id,
            guildId: action.guildId,
            idempotencyKey: action.idempotencyKey,
            memberProfileId: action.memberProfileId,
            priority: 500,
            reason: action.reason,
            retryable: validation.retryable,
            sourceDomain: action.sourceDomain,
            sourceEntityId: action.sourceEntityId,
            sourceEntityType: action.sourceEntityType,
            status: validation.status === "blocked" ? "reconciliation_required" : initialStatus,
            targetRoleId: action.discordRoleId,
            targetRoleName: action.discordRoleName,
            validationMessages: toJson(validation.messages),
            validationStatus: validation.status,
          },
        });
      }

      return createdExecution;
    });

    await Promise.all(
      validations.map((validation, index) =>
        createReconciliationForBlockedAction({
          action: plannedActions[index]!,
          executionId: execution.id,
          validation,
        }),
      ),
    );

    await recordAuditEvent({
      action: "discord.automation.preview_executed",
      actorUserId: sourceEvent.actorUserId ?? null,
      entityId: execution.id,
      entityType: "DiscordAutomationExecution",
      metadata: {
        actionCount: plannedActions.length,
        executionMode,
        sourceEntityId: sourceEvent.sourceEntityId,
        triggerType: sourceEvent.triggerType,
      },
      summary: `Discord automation planned ${plannedActions.length} action${plannedActions.length === 1 ? "" : "s"}.`,
    });

    if (executionMode === "automatic" && initialStatus === "approved") {
      await this.executeAutomationExecution({
        actorUserId: sourceEvent.actorUserId ?? null,
        executionId: execution.id,
      });
    }

    revalidateAutomationSurfaces();

    return {
      actionCount: plannedActions.length,
      executionId: execution.id,
      executionMode,
      status: initialStatus,
      warnings: warningMessages,
    };
  }

  async approveExecution(input: {
    actorUserId: string;
    executionId: string;
    reason?: string | null;
  }) {
    const execution = await prisma.discordAutomationExecution.update({
      where: {
        id: input.executionId,
      },
      data: {
        approvedAt: new Date(),
        approvedByUserId: input.actorUserId,
        status: "approved",
      },
    });

    await prisma.discordAutomationApproval.create({
      data: {
        actorUserId: input.actorUserId,
        decision: "approved",
        executionId: execution.id,
        reason: input.reason ?? null,
      },
    });
    await recordAuditEvent({
      action: "discord.automation.approved",
      actorUserId: input.actorUserId,
      entityId: execution.id,
      entityType: "DiscordAutomationExecution",
      reason: input.reason ?? null,
      summary: "Discord automation execution approved.",
    });
    revalidateAutomationSurfaces();

    return execution;
  }

  async rejectExecution(input: {
    actorUserId: string;
    executionId: string;
    reason?: string | null;
  }) {
    const execution = await prisma.discordAutomationExecution.update({
      where: {
        id: input.executionId,
      },
      data: {
        rejectedAt: new Date(),
        rejectedByUserId: input.actorUserId,
        status: "cancelled",
      },
    });

    await prisma.discordAutomationApproval.create({
      data: {
        actorUserId: input.actorUserId,
        decision: "rejected",
        executionId: execution.id,
        reason: input.reason ?? null,
      },
    });
    await recordAuditEvent({
      action: "discord.automation.rejected",
      actorUserId: input.actorUserId,
      entityId: execution.id,
      entityType: "DiscordAutomationExecution",
      reason: input.reason ?? null,
      summary: "Discord automation execution rejected.",
    });
    revalidateAutomationSurfaces();

    return execution;
  }

  async executeAutomationExecution(input: {
    actorUserId?: string | null;
    executionId: string;
  }) {
    const execution = await prisma.discordAutomationExecution.findUnique({
      where: {
        id: input.executionId,
      },
      include: {
        actionResults: true,
      },
    });

    if (!execution) {
      throw new Error("Discord automation execution not found.");
    }

    if (!["approved", "failed", "partial_success"].includes(execution.status)) {
      throw new Error("Only approved or retryable automation executions can run.");
    }

    await prisma.discordAutomationExecution.update({
      where: {
        id: execution.id,
      },
      data: {
        startedAt: new Date(),
        status: "running",
      },
    });

    let succeededActionCount = 0;
    let failedActionCount = 0;
    let noChangeActionCount = 0;

    for (const action of execution.actionResults) {
      if (action.validationStatus === "blocked") {
        failedActionCount += 1;
        continue;
      }

      if (!action.discordUserId || !action.guildId || !action.targetRoleId) {
        failedActionCount += 1;
        await prisma.discordAutomationActionExecution.update({
          where: {
            id: action.id,
          },
          data: {
            errorMessage: "Action is missing Discord user, guild, or role target.",
            status: "failed",
          },
        });
        continue;
      }

      const currentRoleState = await getDiscordGuildMemberRoleState({
        discordUserId: action.discordUserId,
        guildId: action.guildId,
      });

      if (!currentRoleState.ok) {
        failedActionCount += 1;
        await prisma.discordAutomationActionExecution.update({
          where: {
            id: action.id,
          },
          data: {
            errorMessage: currentRoleState.errorMessage,
            retryable: currentRoleState.statusCode === 429 || currentRoleState.statusCode === null,
            status: "failed",
          },
        });
        continue;
      }

      const roleAlreadyPresent = currentRoleState.roleIds.includes(action.targetRoleId);

      if (action.actionType === "add_role" && roleAlreadyPresent) {
        noChangeActionCount += 1;
        await prisma.discordAutomationActionExecution.update({
          where: {
            id: action.id,
          },
          data: {
            completedAt: new Date(),
            executedAt: new Date(),
            executionResult: {
              reason: "Role already present.",
            },
            status: "no_change",
          },
        });
        continue;
      }

      if (action.actionType === "remove_role" && !roleAlreadyPresent) {
        noChangeActionCount += 1;
        await prisma.discordAutomationActionExecution.update({
          where: {
            id: action.id,
          },
          data: {
            completedAt: new Date(),
            executedAt: new Date(),
            executionResult: {
              reason: "Role already absent.",
            },
            status: "no_change",
          },
        });
        continue;
      }

      const errorMessage =
        action.actionType === "remove_role"
          ? await removeDiscordGuildRole({
              discordRoleId: action.targetRoleId,
              discordUserId: action.discordUserId,
              guildId: action.guildId,
            })
          : await addDiscordGuildRole({
              discordRoleId: action.targetRoleId,
              discordUserId: action.discordUserId,
              guildId: action.guildId,
            });

      if (errorMessage) {
        failedActionCount += 1;
        await prisma.discordAutomationActionExecution.update({
          where: {
            id: action.id,
          },
          data: {
            errorMessage,
            executedAt: new Date(),
            retryable:
              errorMessage.includes("rate-limited") ||
              errorMessage.includes("could not be reached"),
            status: "failed",
          },
        });
        continue;
      }

      succeededActionCount += 1;
      await prisma.discordAutomationActionExecution.update({
        where: {
          id: action.id,
        },
        data: {
          completedAt: new Date(),
          executedAt: new Date(),
          executionResult: {
            roleId: action.targetRoleId,
          },
          status: "succeeded",
        },
      });

      if (action.memberProfileId && action.discordServerId) {
        await prisma.discordManagedRoleAssignment.upsert({
          create: {
            actionExecutionId: action.id,
            assignedByPortalAt: action.actionType === "add_role" ? new Date() : null,
            discordRoleId: action.targetRoleId,
            discordServerId: action.discordServerId,
            discordUserId: action.discordUserId,
            expectedState: action.actionType === "remove_role" ? "absent" : "present",
            guildId: action.guildId,
            idempotencyKey: `managed-role:${action.idempotencyKey}`,
            isCurrent: action.actionType !== "remove_role",
            memberProfileId: action.memberProfileId,
            metadata: {
              actionType: action.actionType,
              sourceDomain: action.sourceDomain,
            },
            observedState: action.actionType === "remove_role" ? "absent" : "present",
            removedByPortalAt: action.actionType === "remove_role" ? new Date() : null,
            sourceEntityId: action.sourceEntityId,
            sourceEntityType: action.sourceEntityType,
          },
          update: {
            actionExecutionId: action.id,
            assignedByPortalAt: action.actionType === "add_role" ? new Date() : undefined,
            expectedState: action.actionType === "remove_role" ? "absent" : "present",
            isCurrent: action.actionType !== "remove_role",
            observedState: action.actionType === "remove_role" ? "absent" : "present",
            removedByPortalAt: action.actionType === "remove_role" ? new Date() : null,
          },
          where: {
            memberProfileId_discordServerId_discordRoleId_sourceEntityType_sourceEntityId: {
              discordRoleId: action.targetRoleId,
              discordServerId: action.discordServerId,
              memberProfileId: action.memberProfileId,
              sourceEntityId: action.sourceEntityId,
              sourceEntityType: action.sourceEntityType,
            },
          },
        });
      }
    }

    const status =
      failedActionCount > 0 && succeededActionCount + noChangeActionCount > 0
        ? "partial_success"
        : failedActionCount > 0
          ? "failed"
          : succeededActionCount > 0
            ? "succeeded"
            : "no_change";
    const updated = await prisma.discordAutomationExecution.update({
      where: {
        id: execution.id,
      },
      data: {
        completedAt: new Date(),
        failedActionCount,
        failedAt: status === "failed" ? new Date() : null,
        noChangeActionCount,
        resultSummary: {
          failedActionCount,
          noChangeActionCount,
          succeededActionCount,
        },
        status,
        succeededActionCount,
      },
    });

    await recordAuditEvent({
      action:
        status === "failed"
          ? "discord.automation.execution_failed"
          : status === "partial_success"
            ? "discord.automation.execution_partial_success"
            : "discord.automation.execution_completed",
      actorUserId: input.actorUserId ?? null,
      entityId: execution.id,
      entityType: "DiscordAutomationExecution",
      metadata: {
        failedActionCount,
        noChangeActionCount,
        succeededActionCount,
      },
      summary: `Discord automation execution ${status.replaceAll("_", " ")}.`,
    });

    if (failedActionCount > 0) {
      await processCommunicationRequest({
        body: `Discord automation execution ${execution.id} has ${failedActionCount} failed action(s).`,
        category: "system",
        idempotencyKey: `discord-automation-failed:${execution.id}`,
        priority: "high",
        relatedEntityId: execution.id,
        relatedEntityType: "DiscordAutomationExecution",
        requestedByUserId: input.actorUserId ?? null,
        requestedChannels: [{ type: "portal" }],
        sourceEvent: "discord.automation.failed",
        sourceModule: "discord",
        targetAudience: [{ type: "permission", permissionKey: "discord.automation.manage" }],
        title: "Discord automation action failed",
        type: "discord.delivery_failed",
      }).catch(() => undefined);
    }

    revalidateAutomationSurfaces();

    return updated;
  }

  async retryExecution(input: {
    actorUserId: string;
    executionId: string;
    reason?: string | null;
  }) {
    const execution = await prisma.discordAutomationExecution.findUnique({
      where: {
        id: input.executionId,
      },
    });

    if (!execution) {
      throw new Error("Discord automation execution not found.");
    }

    await prisma.discordAutomationRetry.create({
      data: {
        attemptNumber: execution.retryCount + 1,
        executionId: execution.id,
        reason: input.reason ?? null,
        status: "requested",
      },
    });
    await prisma.discordAutomationExecution.update({
      where: {
        id: execution.id,
      },
      data: {
        retryCount: {
          increment: 1,
        },
        status: "approved",
      },
    });
    await recordAuditEvent({
      action: "discord.automation.retry_requested",
      actorUserId: input.actorUserId,
      entityId: execution.id,
      entityType: "DiscordAutomationExecution",
      reason: input.reason ?? null,
      summary: "Discord automation retry requested.",
    });

    return this.executeAutomationExecution({
      actorUserId: input.actorUserId,
      executionId: execution.id,
    });
  }
}

export const discordAutomationEngine = new DiscordAutomationEngine();
