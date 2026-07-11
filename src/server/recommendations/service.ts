import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { can } from "@/server/permissions/access";
import type {
  AffectedRecommendationEntity,
  CommandRecommendationProvider,
  CommandRecommendationView,
  CommandRuleSource,
  DraftCommandRecommendation,
  RecommendationPriority,
  RecommendationProviderContext,
  RecommendationAuditEntry,
  SupportingRecommendationRule,
} from "@/server/recommendations/types";

type RecommendationIdentityInput = {
  campaignId: string;
  weekNumber: number;
};

export type UpdateIntentAssessmentInput = RecommendationIdentityInput & {
  assessmentSummary?: string | null;
  lessonsLearned?: string | null;
  nextWeekRecommendations?: string | null;
  status: string;
  supportingEvidence?: string | null;
};

const recommendationProviders = new Map<string, CommandRecommendationProvider>();

function registerRecommendationProvider(provider: CommandRecommendationProvider) {
  recommendationProviders.set(provider.id, provider);
}

function getRecommendationProviders() {
  return Array.from(recommendationProviders.values()).sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
}

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function severityToPriority(severity: string): RecommendationPriority {
  switch (severity) {
    case "CRITICAL":
    case "blocking":
      return "critical";
    case "HIGH":
      return "high";
    case "MEDIUM":
    case "warning":
      return "medium";
    case "LOW":
    case "info":
      return "low";
    default:
      return "informational";
  }
}

function priorityRank(priority: RecommendationPriority) {
  switch (priority) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

function toSupportingRule(rule: CommandRuleSource): SupportingRecommendationRule {
  return {
    category: rule.category,
    id: rule.id,
    message: rule.message,
    providerId: "providerId" in rule ? rule.providerId : null,
    recommendedAction: rule.recommendedAction,
    relatedEntityId: rule.relatedEntityId,
    relatedEntityType: rule.relatedEntityType,
    severity: rule.severity,
    status: rule.status,
    title: "title" in rule ? rule.title : rule.label,
  };
}

function createDraftFromRule(input: {
  campaignId: string;
  category: string;
  details?: string;
  providerId: string;
  rule: CommandRuleSource;
  weekNumber: number;
}): DraftCommandRecommendation {
  const supportingRule = toSupportingRule(input.rule);

  return {
    category: input.category,
    details: input.details ?? input.rule.description,
    priority: severityToPriority(input.rule.severity),
    reason: input.rule.message,
    recommendedAction: input.rule.recommendedAction,
    relatedEntityId: input.rule.relatedEntityId,
    relatedEntityType: input.rule.relatedEntityType,
    severity: input.rule.severity,
    sourceKey: `operations:${input.campaignId}:${input.weekNumber}:${input.providerId}:${input.rule.id}`,
    summary: input.rule.message,
    supportingRules: [supportingRule],
    title: supportingRule.title,
  };
}

function createPlanningRecommendationProvider(): CommandRecommendationProvider {
  const providerId = "operations.recommendations.planning";

  return {
    category: "planning",
    evaluate: ({ packageData }) => {
      const healthRules = packageData.health?.categories.planning.rules ?? [];
      const readinessRules = packageData.readiness?.operational.rules ?? [];

      return [...healthRules, ...readinessRules]
        .filter((rule) => rule.status === "FAIL" || rule.status === "WARNING")
        .map((rule) =>
          createDraftFromRule({
            campaignId: packageData.campaign.id,
            category: rule.relatedEntityType === "DeploymentResource" ? "resources" : "planning",
            providerId,
            rule,
            weekNumber: packageData.week.weekNumber,
          }),
        );
    },
    id: providerId,
    name: "Planning Recommendation Provider",
    priority: 10,
  };
}

function createExecutionRecommendationProvider(): CommandRecommendationProvider {
  const providerId = "operations.recommendations.execution";

  return {
    category: "execution",
    evaluate: ({ packageData }) =>
      (packageData.health?.categories.execution.rules ?? [])
        .filter((rule) => rule.status === "FAIL" || rule.status === "WARNING")
        .map((rule) =>
          createDraftFromRule({
            campaignId: packageData.campaign.id,
            category: rule.id.includes("patrol") ? "patrols" : "execution",
            providerId,
            rule,
            weekNumber: packageData.week.weekNumber,
          }),
        ),
    id: providerId,
    name: "Execution Recommendation Provider",
    priority: 20,
  };
}

function createCommunityRecommendationProvider(): CommandRecommendationProvider {
  const providerId = "operations.recommendations.community";

  return {
    category: "community",
    evaluate: ({ packageData }) =>
      (packageData.health?.categories.community.rules ?? [])
        .filter((rule) => rule.status === "FAIL" || rule.status === "WARNING")
        .map((rule) =>
          createDraftFromRule({
            campaignId: packageData.campaign.id,
            category: rule.id.includes("attendance") ? "attendance" : "community",
            providerId,
            rule,
            weekNumber: packageData.week.weekNumber,
          }),
        ),
    id: providerId,
    name: "Community Recommendation Provider",
    priority: 30,
  };
}

function createPublicationRecommendationProvider(): CommandRecommendationProvider {
  const providerId = "operations.recommendations.publication";

  return {
    category: "planning",
    evaluate: ({ packageData }) =>
      (packageData.readiness?.publication.rules ?? [])
        .filter((rule) => rule.status === "FAIL" || rule.status === "WARNING")
        .map((rule) =>
          createDraftFromRule({
            campaignId: packageData.campaign.id,
            category: rule.id.includes("discord") ? "discord" : "planning",
            providerId,
            rule,
            weekNumber: packageData.week.weekNumber,
          }),
        ),
    id: providerId,
    name: "Publication Recommendation Provider",
    priority: 40,
  };
}

registerRecommendationProvider(createPlanningRecommendationProvider());
registerRecommendationProvider(createExecutionRecommendationProvider());
registerRecommendationProvider(createCommunityRecommendationProvider());
registerRecommendationProvider(createPublicationRecommendationProvider());

function getSupportingRulesJson(rules: SupportingRecommendationRule[]): Prisma.InputJsonValue {
  return rules.map((rule) => ({
    category: rule.category,
    id: rule.id,
    message: rule.message,
    providerId: rule.providerId,
    recommendedAction: rule.recommendedAction,
    relatedEntityId: rule.relatedEntityId,
    relatedEntityType: rule.relatedEntityType,
    severity: rule.severity,
    status: rule.status,
    title: rule.title,
  }));
}

function parseSupportingRules(value: Prisma.JsonValue): SupportingRecommendationRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, Prisma.JsonValue> => typeof entry === "object" && entry !== null && !Array.isArray(entry))
    .map((entry) => ({
      category: String(entry.category ?? "planning"),
      id: String(entry.id ?? "unknown"),
      message: String(entry.message ?? ""),
      providerId: entry.providerId ? String(entry.providerId) : null,
      recommendedAction: String(entry.recommendedAction ?? ""),
      relatedEntityId: entry.relatedEntityId ? String(entry.relatedEntityId) : null,
      relatedEntityType: entry.relatedEntityType ? String(entry.relatedEntityType) : null,
      severity: String(entry.severity ?? "LOW"),
      status: String(entry.status ?? "NOT_APPLICABLE"),
      title: String(entry.title ?? "Rule"),
    }));
}

type RecommendationRecord = {
  category: string;
  campaign?: {
    id: string;
    title: string;
  } | null;
  createdAt: Date;
  deploymentWeek?: {
    id: string;
    label: string | null;
    weekNumber: number;
  } | null;
  details: string | null;
  dismissedAt: Date | null;
  id: string;
  priority: string;
  reason: string;
  recommendedAction: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  resolvedAt: Date | null;
  severity: string;
  status: string;
  summary: string;
  supportingRules: Prisma.JsonValue;
  title: string;
  updatedAt: Date;
  weekNumber?: number | null;
};

function getRelatedEntityHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) {
    return null;
  }

  switch (entityType) {
    case "Campaign":
      return `/operations/campaigns/${entityId}`;
    case "Event":
      return `/operations/events/${entityId}`;
    case "MemberProfile":
      return `/personnel/members/${entityId}`;
    case "Unit":
      return `/units/${entityId}`;
    default:
      return null;
  }
}

function getRelatedEntityLabel(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) {
    return null;
  }

  return `${entityType.replace(/([a-z])([A-Z])/g, "$1 $2")} ${entityId.slice(0, 8)}`;
}

function addAffectedEntity(
  entities: AffectedRecommendationEntity[],
  entity: AffectedRecommendationEntity | null,
) {
  if (!entity || entities.some((existing) => existing.type === entity.type && existing.id === entity.id)) {
    return;
  }

  entities.push(entity);
}

function getAffectedEntities(recommendation: RecommendationRecord): AffectedRecommendationEntity[] {
  const entities: AffectedRecommendationEntity[] = [];

  if (recommendation.campaign) {
    addAffectedEntity(entities, {
      href: `/operations/campaigns/${recommendation.campaign.id}`,
      id: recommendation.campaign.id,
      label: recommendation.campaign.title,
      type: "Deployment",
    });
  }

  if (recommendation.deploymentWeek) {
    addAffectedEntity(entities, {
      href: recommendation.campaign
        ? `/operations/packages/${recommendation.campaign.id}/week/${recommendation.deploymentWeek.weekNumber}`
        : null,
      id: recommendation.deploymentWeek.id,
      label: recommendation.deploymentWeek.label ?? `Week ${recommendation.deploymentWeek.weekNumber}`,
      type: "Operational Week",
    });
  }

  const relatedLabel = getRelatedEntityLabel(recommendation.relatedEntityType, recommendation.relatedEntityId);

  if (recommendation.relatedEntityType && recommendation.relatedEntityId && relatedLabel) {
    addAffectedEntity(entities, {
      href: getRelatedEntityHref(recommendation.relatedEntityType, recommendation.relatedEntityId),
      id: recommendation.relatedEntityId,
      label: relatedLabel,
      type: recommendation.relatedEntityType.replace(/([a-z])([A-Z])/g, "$1 $2"),
    });
  }

  return entities;
}

function mapRecommendation(
  recommendation: RecommendationRecord,
  auditHistory: RecommendationAuditEntry[] = [],
): CommandRecommendationView {
  return {
    affectedEntities: getAffectedEntities(recommendation),
    auditHistory,
    category: recommendation.category,
    createdAt: recommendation.createdAt,
    details: recommendation.details,
    dismissedAt: recommendation.dismissedAt,
    id: recommendation.id,
    priority: recommendation.priority as CommandRecommendationView["priority"],
    reason: recommendation.reason,
    recommendedAction: recommendation.recommendedAction,
    relatedEntityId: recommendation.relatedEntityId,
    relatedEntityType: recommendation.relatedEntityType,
    resolvedAt: recommendation.resolvedAt,
    severity: recommendation.severity,
    status: recommendation.status as CommandRecommendationView["status"],
    summary: recommendation.summary,
    supportingRules: parseSupportingRules(recommendation.supportingRules),
    title: recommendation.title,
    updatedAt: recommendation.updatedAt,
  };
}

async function withRecommendationAuditHistory(recommendations: RecommendationRecord[]) {
  if (recommendations.length === 0) {
    return [];
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityId: {
        in: recommendations.map((recommendation) => recommendation.id),
      },
      entityType: "CommandRecommendation",
    },
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 60,
  });
  const logsByRecommendationId = new Map<string, RecommendationAuditEntry[]>();

  for (const log of auditLogs) {
    if (!log.entityId) {
      continue;
    }

    const entries = logsByRecommendationId.get(log.entityId) ?? [];
    entries.push({
      action: log.action,
      actorName: log.actor?.displayName ?? log.actor?.name ?? log.actor?.email ?? null,
      createdAt: log.createdAt,
      id: log.id,
      summary: log.summary,
    });
    logsByRecommendationId.set(log.entityId, entries);
  }

  return recommendations.map((recommendation) =>
    mapRecommendation(recommendation, logsByRecommendationId.get(recommendation.id) ?? []),
  );
}

async function requireRecommendationUser(permissionKeys: string[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/unauthorized");
  }

  if (!permissionKeys.some((permissionKey) => can(user, permissionKey))) {
    redirect("/forbidden");
  }

  return user;
}

function revalidateRecommendationRoutes(campaignId?: string | null, weekNumber?: number | null) {
  revalidatePath("/operations");
  revalidatePath("/operations/s3");

  if (campaignId && weekNumber) {
    revalidatePath(`/operations/packages/${campaignId}/week/${weekNumber}`);
  }
}

export async function generateRecommendationsForPackage(packageData: RecommendationProviderContext["packageData"]) {
  const drafts = getRecommendationProviders().flatMap((provider) => provider.evaluate({ packageData }));
  const activeSourceKeys = new Set(drafts.map((draft) => draft.sourceKey));

  for (const draft of drafts) {
    const existing = await prisma.commandRecommendation.findUnique({
      where: {
        sourceKey: draft.sourceKey,
      },
    });

    if (existing && ["dismissed", "resolved"].includes(existing.status)) {
      continue;
    }

    if (existing) {
      await prisma.commandRecommendation.update({
        where: {
          id: existing.id,
        },
        data: {
          category: draft.category,
          details: draft.details ?? null,
          priority: draft.priority,
          reason: draft.reason,
          recommendedAction: draft.recommendedAction,
          relatedEntityId: draft.relatedEntityId ?? null,
          relatedEntityType: draft.relatedEntityType ?? null,
          severity: draft.severity,
          status: "active",
          summary: draft.summary,
          supportingRules: getSupportingRulesJson(draft.supportingRules),
          title: draft.title,
        },
      });

      continue;
    }

    const created = await prisma.commandRecommendation.create({
      data: {
        campaignId: packageData.campaign.id,
        category: draft.category,
        deploymentWeekId: packageData.week.id,
        details: draft.details ?? null,
        priority: draft.priority,
        reason: draft.reason,
        recommendedAction: draft.recommendedAction,
        relatedEntityId: draft.relatedEntityId ?? null,
        relatedEntityType: draft.relatedEntityType ?? null,
        severity: draft.severity,
        sourceKey: draft.sourceKey,
        status: "active",
        summary: draft.summary,
        supportingRules: getSupportingRulesJson(draft.supportingRules),
        title: draft.title,
        weekNumber: packageData.week.weekNumber,
      },
    });

    if (draft.priority === "critical") {
      await createAuditLogEntry({
        action: "recommendation.generated",
        entityId: created.id,
        entityType: "CommandRecommendation",
        newValue: {
          priority: draft.priority,
          sourceKey: draft.sourceKey,
        },
        summary: `Critical recommendation generated: ${draft.title}`,
      });
    }
  }

  await prisma.commandRecommendation.updateMany({
    where: {
      campaignId: packageData.campaign.id,
      sourceKey: {
        notIn: Array.from(activeSourceKeys),
      },
      status: "active",
      weekNumber: packageData.week.weekNumber,
    },
    data: {
      status: "expired",
    },
  });
}

export async function listRecommendationsForPackage(input: RecommendationIdentityInput) {
  const recommendations = await prisma.commandRecommendation.findMany({
    where: {
      campaignId: input.campaignId,
      status: "active",
      weekNumber: input.weekNumber,
    },
    include: {
      campaign: true,
      deploymentWeek: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const hydratedRecommendations = await withRecommendationAuditHistory(recommendations);

  return hydratedRecommendations.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

export async function listRecommendationHistory(input: RecommendationIdentityInput) {
  const recommendations = await prisma.commandRecommendation.findMany({
    where: {
      campaignId: input.campaignId,
      weekNumber: input.weekNumber,
    },
    include: {
      campaign: true,
      deploymentWeek: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 20,
  });

  return withRecommendationAuditHistory(recommendations);
}

export async function dismissRecommendation(input: { recommendationId: string; reason?: string | null }) {
  const actor = await requireRecommendationUser(["recommendations.manage", "operations.command.manage"]);
  const recommendation = await prisma.commandRecommendation.update({
    where: {
      id: input.recommendationId,
    },
    data: {
      dismissedAt: new Date(),
      dismissedByUserId: actor.id,
      status: "dismissed",
    },
  });

  await createAuditLogEntry({
    action: "recommendation.dismissed",
    actorUserId: actor.id,
    entityId: recommendation.id,
    entityType: "CommandRecommendation",
    reason: normalizeOptionalString(input.reason),
    summary: `Recommendation dismissed: ${recommendation.title}`,
  });
  revalidateRecommendationRoutes(recommendation.campaignId, recommendation.weekNumber);
}

export async function resolveRecommendation(input: { recommendationId: string; reason?: string | null }) {
  const actor = await requireRecommendationUser(["recommendations.manage", "operations.command.manage"]);
  const recommendation = await prisma.commandRecommendation.update({
    where: {
      id: input.recommendationId,
    },
    data: {
      resolvedAt: new Date(),
      resolvedByUserId: actor.id,
      status: "resolved",
    },
  });

  await createAuditLogEntry({
    action: "recommendation.resolved",
    actorUserId: actor.id,
    entityId: recommendation.id,
    entityType: "CommandRecommendation",
    reason: normalizeOptionalString(input.reason),
    summary: `Recommendation resolved: ${recommendation.title}`,
  });
  revalidateRecommendationRoutes(recommendation.campaignId, recommendation.weekNumber);
}

export async function getIntentAssessment(input: RecommendationIdentityInput) {
  const assessment = await prisma.commanderIntentAssessment.findUnique({
    where: {
      campaignId_weekNumber: {
        campaignId: input.campaignId,
        weekNumber: input.weekNumber,
      },
    },
    include: {
      assessedBy: true,
    },
  });

  if (!assessment) {
    return null;
  }

  return {
    assessedAt: assessment.assessedAt,
    assessedByName:
      assessment.assessedBy?.displayName ?? assessment.assessedBy?.name ?? assessment.assessedBy?.email ?? null,
    assessmentSummary: assessment.assessmentSummary,
    id: assessment.id,
    lessonsLearned: assessment.lessonsLearned,
    nextWeekRecommendations: assessment.nextWeekRecommendations,
    status: assessment.status,
    supportingEvidence: assessment.supportingEvidence,
  };
}

export async function updateIntentAssessment(input: UpdateIntentAssessmentInput) {
  const actor = await requireRecommendationUser(["operations.command.manage", "operations.package.edit"]);
  const week = await prisma.deploymentWeek.findUnique({
    where: {
      campaignId_weekNumber: {
        campaignId: input.campaignId,
        weekNumber: input.weekNumber,
      },
    },
  });

  if (!week) {
    throw new Error("Operations Package not found.");
  }

  const assessment = await prisma.commanderIntentAssessment.upsert({
    create: {
      assessedAt: new Date(),
      assessedByUserId: actor.id,
      assessmentSummary: normalizeOptionalString(input.assessmentSummary),
      campaignId: input.campaignId,
      deploymentWeekId: week.id,
      lessonsLearned: normalizeOptionalString(input.lessonsLearned),
      nextWeekRecommendations: normalizeOptionalString(input.nextWeekRecommendations),
      status: input.status,
      supportingEvidence: normalizeOptionalString(input.supportingEvidence),
      weekNumber: input.weekNumber,
    },
    update: {
      assessedAt: new Date(),
      assessedByUserId: actor.id,
      assessmentSummary: normalizeOptionalString(input.assessmentSummary),
      lessonsLearned: normalizeOptionalString(input.lessonsLearned),
      nextWeekRecommendations: normalizeOptionalString(input.nextWeekRecommendations),
      status: input.status,
      supportingEvidence: normalizeOptionalString(input.supportingEvidence),
    },
    where: {
      campaignId_weekNumber: {
        campaignId: input.campaignId,
        weekNumber: input.weekNumber,
      },
    },
  });

  await createAuditLogEntry({
    action: "intent_assessment.updated",
    actorUserId: actor.id,
    entityId: assessment.id,
    entityType: "CommanderIntentAssessment",
    newValue: {
      status: assessment.status,
    },
    summary: `Commander intent assessment updated for Week ${input.weekNumber}.`,
  });
  revalidateRecommendationRoutes(input.campaignId, input.weekNumber);
}
