import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PortalUser } from "@/features/auth/types";
import { prisma } from "@/server/database/client";
import { createAuditLogEntry } from "@/server/database/repositories/audit-log-repository";
import { listDeploymentResources } from "@/server/deployment-resources/service";
import { getCurrentUser } from "@/server/auth/current-user";
import { can } from "@/server/permissions/access";
import { getPortalBaseUrl } from "@/server/discord/config";
import { sendDiscordNotification } from "@/server/discord/delivery/provider";
import { buildOperationsReleaseDiscordMessage } from "@/server/discord/messages/builders";
import { createNotification } from "@/server/notifications/service";
import { getGoNoGoStatus as evaluateGoNoGoStatus } from "@/server/operations-package/readiness";
import type {
  OperationsPackageData,
  OperationsReleaseHistoryItem,
  OperationsReleasePreview,
  OperationsReleaseStatus,
} from "@/server/operations-package/types";

type PackageIdentityInput = {
  campaignId: string;
  weekNumber: number;
};

export type UpdateOperationsPackagePlanningInput = {
  campaignId: string;
  weekNumber: number;
  planningStatus?: string | null;
  planningNotes?: string | null;
  operationalObjectives?: string | null;
  planningAssumptions?: string | null;
  friendlySituation?: string | null;
  enemySituation?: string | null;
  intelligenceSummary?: string | null;
  logistics?: string | null;
  weather?: string | null;
  specialInstructions?: string | null;
  operationalNotes?: string | null;
  notes?: string | null;
  reason?: string | null;
};

export type UpdateWeeklyTaskingInput = {
  campaignId: string;
  weekNumber: number;
  operationalSummary?: string | null;
  commandersIntent?: string | null;
  friendlySituation?: string | null;
  enemySituation?: string | null;
  intelligenceSummary?: string | null;
  logisticsNotes?: string | null;
  weather?: string | null;
  specialInstructions?: string | null;
  operationalNotes?: string | null;
  timeline?: string | null;
  reason?: string | null;
};

export type UpdateUnitTaskingInput = {
  unitTaskingId: string;
  primaryObjective?: string | null;
  secondaryObjective?: string | null;
  supportingAssets?: string | null;
  specialEquipment?: string | null;
  specialInstructions?: string | null;
  unitNotes?: string | null;
  reason?: string | null;
};

export type UpdateOperationsPackageResourcesInput = PackageIdentityInput & {
  reason?: string | null;
};

export type UpdateOperationsPackageConopInput = PackageIdentityInput & {
  reason?: string | null;
};

export type AssignOperationsPackageZeusInput = PackageIdentityInput & {
  assignmentType?: string | null;
  assignedToUserId?: string | null;
  reason?: string | null;
};

export type CreateOperationsReleaseInput = PackageIdentityInput & {
  amendmentSummary?: string | null;
  releaseNotes?: string | null;
  scheduledFor?: Date | null;
  status?: OperationsReleaseStatus;
  versionBump?: "major" | "minor";
};

export type PublishOperationsPackageInput = PackageIdentityInput & {
  amendmentSummary?: string | null;
  releaseNotes?: string | null;
  scheduledFor?: Date | null;
  versionBump?: "major" | "minor";
};

const planningStatusLabels = new Set([
  "planning",
  "tasking",
  "resources",
  "review",
]);

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizePlanningStatus(value?: string | null) {
  const normalized = normalizeOptionalString(value);

  return normalized && planningStatusLabels.has(normalized) ? normalized : "planning";
}

function canAny(user: PortalUser | null, permissionKeys: string[]) {
  return permissionKeys.some((permissionKey) => can(user, permissionKey));
}

async function requireOperationsPackageUser(permissionKeys: string[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/unauthorized");
  }

  if (!canAny(user, permissionKeys)) {
    redirect("/forbidden");
  }

  return user;
}

function revalidateOperationsPackageRoutes(campaignId: string, weekNumber: number) {
  revalidatePath("/operations");
  revalidatePath("/operations/campaigns");
  revalidatePath(`/operations/campaigns/${campaignId}`);
  revalidatePath(`/operations/packages/${campaignId}/week/${weekNumber}`);
  revalidatePath(`/operations/packages/${campaignId}/week/${weekNumber}/releases`);
  revalidatePath("/operations/weekly-tasking");
}

function revalidateReleaseRoutes(campaignId: string, weekNumber: number) {
  revalidateOperationsPackageRoutes(campaignId, weekNumber);
  revalidatePath("/operations/s3");
}

function parseReleaseVersion(version: string) {
  const match = /^v(\d+)\.(\d+)$/.exec(version);

  return {
    major: Number(match?.[1] ?? 1),
    minor: Number(match?.[2] ?? 0),
  };
}

async function getNextReleaseVersion(input: {
  campaignId: string;
  versionBump?: "major" | "minor";
  weekNumber: number;
}) {
  const latest = await prisma.operationsRelease.findFirst({
    where: {
      campaignId: input.campaignId,
      weekNumber: input.weekNumber,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latest) {
    return "v1.0";
  }

  const parsed = parseReleaseVersion(latest.releaseVersion);

  return input.versionBump === "major"
    ? `v${parsed.major + 1}.0`
    : `v${parsed.major}.${parsed.minor + 1}`;
}

function getReleaseStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapReleaseHistoryItem(release: {
  amendmentSummary: string | null;
  archivedAt: Date | null;
  discordChannelId: string | null;
  discordErrorMessage: string | null;
  discordMessageId: string | null;
  discordStatus: string;
  id: string;
  publishedAt: Date | null;
  publishedBy: {
    displayName: string | null;
    email: string | null;
    name: string | null;
  } | null;
  releaseNotes: string | null;
  releaseVersion: string;
  scheduledFor: Date | null;
  status: string;
}): OperationsReleaseHistoryItem {
  return {
    amendmentSummary: release.amendmentSummary,
    archivedAt: release.archivedAt,
    comparePlaceholderHref: "#compare-placeholder",
    discordChannelId: release.discordChannelId,
    discordErrorMessage: release.discordErrorMessage,
    discordMessageId: release.discordMessageId,
    discordStatus: release.discordStatus,
    id: release.id,
    publishedAt: release.publishedAt,
    publishedByName:
      release.publishedBy?.displayName ?? release.publishedBy?.name ?? release.publishedBy?.email ?? null,
    releaseNotes: release.releaseNotes,
    releaseVersion: release.releaseVersion,
    scheduledFor: release.scheduledFor,
    status: getReleaseStatusLabel(release.status),
  };
}

async function getReleaseHistoryImplementation(input: PackageIdentityInput) {
  const releases = await prisma.operationsRelease.findMany({
    where: {
      campaignId: input.campaignId,
      weekNumber: input.weekNumber,
    },
    include: {
      publishedBy: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return releases.map(mapReleaseHistoryItem);
}

async function getCurrentReleaseImplementation(input: PackageIdentityInput) {
  const release = await prisma.operationsRelease.findFirst({
    where: {
      campaignId: input.campaignId,
      status: "published",
      weekNumber: input.weekNumber,
    },
    include: {
      publishedBy: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return release ? mapReleaseHistoryItem(release) : null;
}

function buildReleaseResourceSnapshots(data: OperationsPackageData) {
  return data.resources.map((resource) => ({
    displayName: resource.displayName,
    downloadUrl: resource.currentVersion?.downloadUrl ?? null,
    resourceType: resource.resourceType,
    resourceTypeLabel: resource.resourceTypeLabel,
    updatedAt: resource.currentVersion?.uploadedAt ?? null,
    versionLabel: resource.currentVersion ? `v${resource.currentVersion.versionNumber}` : "No current version",
  }));
}

function buildReleasePreview(data: OperationsPackageData, releaseVersion: string): OperationsReleasePreview {
  const baseUrl = getPortalBaseUrl();
  const actionUrl = `${baseUrl}/operations/packages/${data.campaign.id}/week/${data.week.weekNumber}`;
  const resources = buildReleaseResourceSnapshots(data);
  const taskingSummary =
    data.weeklyTasking?.operationalSummary ??
    data.week.operationalObjectives ??
    data.week.planningNotes ??
    "Operations Package is ready for review.";
  const resourceLine = (resourceType: string, fallback: string) => {
    const resource = resources.find((entry) => entry.resourceType === resourceType);

    return resource
      ? `${resource.displayName} ${resource.versionLabel}${resource.downloadUrl ? ` / ${resource.downloadUrl}` : ""}`
      : fallback;
  };

  return {
    actionUrl,
    campaignTitle: data.campaign.title,
    discordFields: [
      {
        label: "Operation Header",
        value: `${data.campaign.title} / Week ${data.week.weekNumber} / ${releaseVersion}`,
      },
      {
        label: "Date / Time",
        value: data.weekendOperation
          ? `${data.weekendOperation.startsAt.toLocaleString()}${data.weekendOperation.endsAt ? ` to ${data.weekendOperation.endsAt.toLocaleString()}` : ""}`
          : "Weekend Operation time pending.",
      },
      {
        label: "Commander's Intent",
        value: data.weeklyTasking?.commandersIntent ?? "Intent pending.",
      },
      {
        label: "Tasking",
        value: taskingSummary,
      },
      {
        label: "Unit Taskings",
        value: data.weeklyTasking?.unitTaskings.length
          ? data.weeklyTasking.unitTaskings
              .map((tasking) => `${tasking.unitShortName}: ${tasking.primaryObjective ?? "Objective pending"}`)
              .join("\n")
          : "Unit tasking is pending.",
      },
      {
        label: "CONOP",
        value: resourceLine("CONOP", "No CONOP attached."),
      },
      {
        label: "OPORD",
        value: resourceLine("OPORD", "No OPORD attached."),
      },
      {
        label: "Player Primer",
        value: resourceLine("PLAYER_PRIMER", "No Player Primer attached."),
      },
      {
        label: "Current Mod Preset",
        value: resourceLine("ARMA3_PRESET", "No mod preset attached."),
      },
      {
        label: "RSVP",
        value: data.weekendOperation
          ? `Yes ${data.weekendOperation.rsvpCounts.yes} / No ${data.weekendOperation.rsvpCounts.no} / Maybe ${data.weekendOperation.rsvpCounts.maybe}`
          : "RSVP opens when the Weekend Operation is linked.",
      },
    ],
    footer: `Operations Release ${releaseVersion} / Portal remains the source of truth.`,
    releaseVersion,
    resources,
    summary: taskingSummary,
    title: `${data.campaign.title} Week ${data.week.weekNumber}`,
    unitTaskings: data.weeklyTasking?.unitTaskings ?? [],
    weekendOperation: data.weekendOperation,
    weekNumber: data.week.weekNumber,
    weeklyTasking: data.weeklyTasking,
  };
}

function buildReleaseSnapshot(data: OperationsPackageData, preview: OperationsReleasePreview): Prisma.InputJsonValue {
  return {
    campaign: {
      id: data.campaign.id,
      key: data.campaign.key,
      phase: data.campaign.phase,
      status: data.campaign.status,
      title: data.campaign.title,
      zeusAssignmentType: data.campaign.zeusAssignmentType,
      zeusName: data.campaign.zeusName,
    },
    generatedAt: new Date().toISOString(),
    preview: {
      ...preview,
      resources: preview.resources.map((resource) => ({
        ...resource,
        updatedAt: resource.updatedAt?.toISOString() ?? null,
      })),
      weekendOperation: preview.weekendOperation
        ? {
            ...preview.weekendOperation,
            endsAt: preview.weekendOperation.endsAt?.toISOString() ?? null,
            startsAt: preview.weekendOperation.startsAt.toISOString(),
          }
        : null,
    },
    readiness: data.readiness
      ? {
          blockingIssues: data.readiness.blockingIssues.map((issue) => issue.id),
          operationalScore: data.readiness.operational.score,
          publicationScore: data.readiness.publication.score,
          warnings: data.readiness.warnings.map((issue) => issue.id),
        }
      : null,
    week: {
      id: data.week.id,
      planningStatus: data.week.planningStatus,
      weekNumber: data.week.weekNumber,
    },
  };
}

async function getActiveUnits() {
  return prisma.unit.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

async function findWeekendOperation(campaignId: string, weekNumber: number) {
  return prisma.event.findFirst({
    where: {
      campaignId,
      deletedAt: null,
      deploymentWeek: weekNumber,
      eventType: "operation",
    },
    include: {
      attendanceRecords: true,
      weeklyTasking: {
        include: {
          unitTaskings: {
            include: {
              unit: true,
            },
            orderBy: {
              unit: {
                sortOrder: "asc",
              },
            },
          },
        },
      },
    },
    orderBy: [{ startsAt: "asc" }],
  });
}

async function ensureWeeklyTaskingForEvent(input: {
  actorUserId: string;
  campaignId: string;
  eventId: string;
  weekNumber: number;
}) {
  const existing = await prisma.weeklyTasking.findUnique({
    where: {
      eventId: input.eventId,
    },
    include: {
      unitTaskings: true,
    },
  });

  const weeklyTasking =
    existing ??
    (await prisma.weeklyTasking.create({
      data: {
        campaignId: input.campaignId,
        eventId: input.eventId,
        weekNumber: input.weekNumber,
      },
      include: {
        unitTaskings: true,
      },
    }));

  if (!existing) {
    await createAuditLogEntry({
      action: "weekly_tasking.created",
      actorUserId: input.actorUserId,
      entityId: weeklyTasking.id,
      entityType: "WeeklyTasking",
      newValue: {
        campaignId: input.campaignId,
        eventId: input.eventId,
        weekNumber: input.weekNumber,
      },
      summary: `Week ${input.weekNumber} weekly tasking created.`,
    });
  }

  const activeUnits = await getActiveUnits();
  const existingUnitIds = new Set(weeklyTasking.unitTaskings.map((tasking) => tasking.unitId));

  for (const unit of activeUnits) {
    if (existingUnitIds.has(unit.id)) {
      continue;
    }

    await prisma.unitTasking.create({
      data: {
        unitId: unit.id,
        weeklyTaskingId: weeklyTasking.id,
      },
    });
  }

  return weeklyTasking;
}

async function ensureOperationsPackageImplementation(campaignId: string, weekNumber: number) {
  const actor = await requireOperationsPackageUser([
    "operations.package.edit",
    "operations.planning.edit",
    "operations.tasking.manage",
    "campaigns.edit",
    "deployments.edit",
  ]);
  const existing = await prisma.deploymentWeek.findUnique({
    where: {
      campaignId_weekNumber: {
        campaignId,
        weekNumber,
      },
    },
  });

  const week = await prisma.deploymentWeek.upsert({
    create: {
      campaignId,
      label: `Week ${weekNumber}`,
      weekNumber,
    },
    update: {
      label: existing?.label ?? `Week ${weekNumber}`,
    },
    where: {
      campaignId_weekNumber: {
        campaignId,
        weekNumber,
      },
    },
  });

  if (!existing) {
    await createAuditLogEntry({
      action: "operations_package.created",
      actorUserId: actor.id,
      entityId: week.id,
      entityType: "DeploymentWeek",
      newValue: {
        campaignId,
        weekNumber,
      },
      summary: `Week ${weekNumber} operations package created.`,
    });
  }

  const weekendOperation = await findWeekendOperation(campaignId, weekNumber);

  if (weekendOperation) {
    await ensureWeeklyTaskingForEvent({
      actorUserId: actor.id,
      campaignId,
      eventId: weekendOperation.id,
      weekNumber,
    });
  }

  revalidateOperationsPackageRoutes(campaignId, weekNumber);
}

async function getOperationsPackageImplementation(
  campaignId: string,
  weekNumber: number,
): Promise<OperationsPackageData | null> {
  const user = await requireOperationsPackageUser([
    "operations.package.view",
    "operations.planning.view",
    "operations.tasking.view",
    "campaigns.view",
    "s3.dashboard.view",
  ]);

  const [campaign, activeUnits] = await Promise.all([
    prisma.campaign.findFirst({
      where: {
        deletedAt: null,
        id: campaignId,
      },
      include: {
        deploymentWeeks: true,
        zeus: true,
        zeusAssignmentHistory: {
          include: {
            assignedTo: true,
            changedBy: true,
          },
          orderBy: {
            effectiveAt: "desc",
          },
          take: 8,
        },
      },
    }),
    getActiveUnits(),
  ]);

  if (!campaign) {
    return null;
  }

  const week =
    campaign.deploymentWeeks.find((entry) => entry.weekNumber === weekNumber) ??
    (await prisma.deploymentWeek.create({
      data: {
        campaignId,
        label: `Week ${weekNumber}`,
        weekNumber,
      },
    }));
  const weekendOperation = await findWeekendOperation(campaign.id, weekNumber);

  if (weekendOperation) {
    await ensureWeeklyTaskingForEvent({
      actorUserId: user.id,
      campaignId,
      eventId: weekendOperation.id,
      weekNumber,
    });
  }

  const refreshedWeekendOperation = await findWeekendOperation(campaign.id, weekNumber);
  const weeklyTasking = refreshedWeekendOperation?.weeklyTasking ?? null;
  const resources = can(user, "deployments.resources.view")
    ? await listDeploymentResources({
        campaignId: campaign.id,
        eventId: refreshedWeekendOperation?.id ?? null,
        includeEventSpecific: true,
      })
    : [];
  const discordEventChannelMapped = Boolean(
    await prisma.discordChannelMapping.findFirst({
      where: {
        discordServer: {
          isActive: true,
        },
        isActive: true,
        key: "events",
      },
      select: {
        id: true,
      },
    }),
  );
  const activityEntityIds = [
    campaign.id,
    week.id,
    refreshedWeekendOperation?.id ?? null,
    weeklyTasking?.id ?? null,
  ].filter((id): id is string => Boolean(id));
  const activity = await prisma.auditLog.findMany({
    where: {
      OR: [
        {
          entityId: {
            in: activityEntityIds,
          },
        },
        {
          action: {
            in: [
              "operations_package.created",
              "operations_package.planning_updated",
              "weekly_tasking.created",
              "weekly_tasking.updated",
              "unit_tasking.updated",
              "deployment.zeus_assigned",
              "deployment.resource.version_created",
              "deployment.resource.current_changed",
            ],
          },
        },
      ],
    },
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });
  const expectedAttendance = refreshedWeekendOperation?.attendanceRecords.length ?? 0;
  const yes = refreshedWeekendOperation?.attendanceRecords.filter((record) => record.rsvpStatus === "yes").length ?? 0;
  const no = refreshedWeekendOperation?.attendanceRecords.filter((record) => record.rsvpStatus === "no").length ?? 0;
  const maybe = refreshedWeekendOperation?.attendanceRecords.filter((record) => record.rsvpStatus === "maybe").length ?? 0;
  const present = refreshedWeekendOperation?.attendanceRecords.filter((record) => record.finalStatus === "present").length ?? 0;
  const absent = refreshedWeekendOperation?.attendanceRecords.filter((record) => record.finalStatus === "absent").length ?? 0;
  const excused = refreshedWeekendOperation?.attendanceRecords.filter((record) => record.finalStatus === "excused").length ?? 0;
  const late = refreshedWeekendOperation?.attendanceRecords.filter((record) => record.finalStatus === "late").length ?? 0;
  const loa = refreshedWeekendOperation?.attendanceRecords.filter((record) => record.finalStatus === "loa").length ?? 0;
  const planningValues = [
    week.planningNotes,
    week.operationalObjectives,
    week.planningAssumptions,
    week.friendlySituation,
    week.enemySituation,
    week.intelligenceSummary,
    week.logistics,
    week.weather,
    week.specialInstructions,
    week.operationalNotes,
  ];
  const unitTaskingsComplete =
    weeklyTasking?.unitTaskings.filter((tasking) => normalizeOptionalString(tasking.primaryObjective)).length ?? 0;
  const hasConop = resources.some((resource) => resource.resourceType === "CONOP");
  const completionParts = [
    refreshedWeekendOperation ? 1 : 0,
    weeklyTasking ? 1 : 0,
    hasConop ? 1 : 0,
    resources.length > 0 ? 1 : 0,
    planningValues.filter(Boolean).length / planningValues.length,
    activeUnits.length > 0 ? unitTaskingsComplete / activeUnits.length : 0,
  ];
  const percent = Math.round(
    (completionParts.reduce((total, value) => total + value, 0) / completionParts.length) * 100,
  );

  const canEvaluateReadiness =
    can(user, "operations.readiness.evaluate") || can(user, "operations.readiness.view");
  const canViewReadiness =
    canEvaluateReadiness || can(user, "operations.package.view") || can(user, "s3.dashboard.view");
  const canPublishPackage =
    can(user, "operations.package.publish") ||
    can(user, "deployments.publish") ||
    can(user, "events.publish");
  const packageData: OperationsPackageData = {
    activity: activity.map((entry) => ({
      action: entry.action,
      actorName: entry.actor?.displayName ?? entry.actor?.name ?? entry.actor?.email ?? null,
      createdAt: entry.createdAt,
      id: entry.id,
      summary: entry.summary,
    })),
    campaign: {
      id: campaign.id,
      key: campaign.key,
      phase: campaign.phase,
      status: campaign.status,
      title: campaign.title,
      zeusAssignmentType: campaign.zeusAssignmentType,
      zeusName:
        campaign.zeusAssignmentType === "creator"
          ? "Deployment creator"
          : campaign.zeus?.displayName ?? campaign.zeus?.name ?? campaign.zeus?.email ?? null,
    },
    completion: {
      hasConop,
      hasResources: resources.length > 0,
      hasTasking: Boolean(weeklyTasking),
      hasWeekendOperation: Boolean(refreshedWeekendOperation),
      percent,
      planningFieldsComplete: planningValues.filter(Boolean).length,
      planningFieldsTotal: planningValues.length,
      unitTaskingsComplete,
      unitTaskingsTotal: activeUnits.length,
    },
    permissions: {
      canAssignZeus: can(user, "operations.zeus.assign") || can(user, "s3.zeus.assign"),
      canEvaluateReadiness,
      canEditPlanning:
        can(user, "operations.package.edit") ||
        can(user, "operations.planning.edit") ||
        can(user, "campaigns.edit") ||
        can(user, "deployments.edit"),
      canManageResources:
        can(user, "operations.resources.manage") ||
        can(user, "deployments.resources.upload") ||
        can(user, "deployments.resources.edit"),
      canManageTasking: can(user, "operations.tasking.manage"),
      canPublishPackage,
    },
    readiness: null,
    release: null,
    resources,
    week: {
      endsAt: week.endsAt,
      enemySituation: week.enemySituation,
      friendlySituation: week.friendlySituation,
      id: week.id,
      intelligenceSummary: week.intelligenceSummary,
      label: week.label,
      logistics: week.logistics,
      notes: week.notes,
      operationalNotes: week.operationalNotes,
      operationalObjectives: week.operationalObjectives,
      planningAssumptions: week.planningAssumptions,
      planningNotes: week.planningNotes,
      planningStatus: week.planningStatus,
      specialInstructions: week.specialInstructions,
      startsAt: week.startsAt,
      weather: week.weather,
      weekNumber: week.weekNumber,
    },
    weekendOperation: refreshedWeekendOperation
      ? {
          attendanceSummary: {
            absent,
            excused,
            late,
            loa,
            pending: Math.max(expectedAttendance - (present + absent + excused + late + loa), 0),
            present,
          },
          description: refreshedWeekendOperation.description,
          endsAt: refreshedWeekendOperation.endsAt,
          id: refreshedWeekendOperation.id,
          missionStatus: refreshedWeekendOperation.missionStatus,
          rsvpCounts: {
            maybe,
            missing: Math.max(expectedAttendance - (yes + no + maybe), 0),
            no,
            yes,
          },
          startsAt: refreshedWeekendOperation.startsAt,
          status: refreshedWeekendOperation.status,
          title: refreshedWeekendOperation.title,
        }
      : null,
    weeklyTasking: weeklyTasking
      ? {
          commandersIntent: weeklyTasking.commandersIntent,
          enemySituation: weeklyTasking.enemySituation,
          friendlySituation: weeklyTasking.friendlySituation,
          id: weeklyTasking.id,
          intelligenceSummary: weeklyTasking.intelligenceSummary,
          logisticsNotes: weeklyTasking.logisticsNotes,
          operationalNotes: weeklyTasking.operationalNotes,
          operationalSummary: weeklyTasking.operationalSummary,
          publishStatus: weeklyTasking.publishStatus,
          specialInstructions: weeklyTasking.specialInstructions,
          timeline: weeklyTasking.timeline,
          unitTaskings: weeklyTasking.unitTaskings.map((tasking) => ({
            id: tasking.id,
            primaryObjective: tasking.primaryObjective,
            secondaryObjective: tasking.secondaryObjective,
            specialEquipment: tasking.specialEquipment,
            specialInstructions: tasking.specialInstructions,
            supportingAssets: tasking.supportingAssets,
            unitId: tasking.unitId,
            unitName: tasking.unit.name,
            unitNotes: tasking.unitNotes,
            unitShortName: tasking.unit.shortName,
          })),
          weather: weeklyTasking.weather,
          weekNumber: weeklyTasking.weekNumber,
        }
      : null,
  };

  packageData.readiness = canViewReadiness
    ? evaluateGoNoGoStatus({
        canPublish: canPublishPackage,
        discordEventChannelMapped,
        packageData,
      })
    : null;
  packageData.release = {
    current: await getCurrentReleaseImplementation({ campaignId: campaign.id, weekNumber }),
    history: await getReleaseHistoryImplementation({ campaignId: campaign.id, weekNumber }),
    nextVersion: await getNextReleaseVersion({ campaignId: campaign.id, weekNumber }),
    preview: null,
  };
  packageData.release.preview = buildReleasePreview(
    packageData,
    packageData.release.nextVersion,
  );

  return packageData;
}

async function updateOperationsPackagePlanningImplementation(input: UpdateOperationsPackagePlanningInput) {
  const actor = await requireOperationsPackageUser([
    "operations.package.edit",
    "operations.planning.edit",
    "campaigns.edit",
    "deployments.edit",
  ]);
  const existing = await prisma.deploymentWeek.findUnique({
    where: {
      campaignId_weekNumber: {
        campaignId: input.campaignId,
        weekNumber: input.weekNumber,
      },
    },
  });

  if (!existing) {
    throw new Error("Operations Package not found.");
  }

  const updated = await prisma.deploymentWeek.update({
    where: {
      id: existing.id,
    },
    data: {
      enemySituation: normalizeOptionalString(input.enemySituation),
      friendlySituation: normalizeOptionalString(input.friendlySituation),
      intelligenceSummary: normalizeOptionalString(input.intelligenceSummary),
      logistics: normalizeOptionalString(input.logistics),
      notes: normalizeOptionalString(input.notes),
      operationalNotes: normalizeOptionalString(input.operationalNotes),
      operationalObjectives: normalizeOptionalString(input.operationalObjectives),
      planningAssumptions: normalizeOptionalString(input.planningAssumptions),
      planningNotes: normalizeOptionalString(input.planningNotes),
      planningStatus: normalizePlanningStatus(input.planningStatus),
      specialInstructions: normalizeOptionalString(input.specialInstructions),
      weather: normalizeOptionalString(input.weather),
    },
  });

  await createAuditLogEntry({
    action: "operations_package.planning_updated",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "DeploymentWeek",
    newValue: {
      planningStatus: updated.planningStatus,
    },
    oldValue: {
      planningStatus: existing.planningStatus,
    },
    reason: normalizeOptionalString(input.reason),
    summary: `Week ${updated.weekNumber} operations package planning updated.`,
  });

  revalidateOperationsPackageRoutes(input.campaignId, input.weekNumber);
}

async function updateWeeklyTaskingImplementation(input: UpdateWeeklyTaskingInput) {
  const actor = await requireOperationsPackageUser([
    "operations.tasking.manage",
    "operations.package.edit",
  ]);
  const weekendOperation = await findWeekendOperation(input.campaignId, input.weekNumber);

  if (!weekendOperation) {
    throw new Error("Create or link the Weekend Operation before editing weekly tasking.");
  }

  await ensureWeeklyTaskingForEvent({
    actorUserId: actor.id,
    campaignId: input.campaignId,
    eventId: weekendOperation.id,
    weekNumber: input.weekNumber,
  });

  const updated = await prisma.weeklyTasking.update({
    where: {
      eventId: weekendOperation.id,
    },
    data: {
      commandersIntent: normalizeOptionalString(input.commandersIntent),
      enemySituation: normalizeOptionalString(input.enemySituation),
      friendlySituation: normalizeOptionalString(input.friendlySituation),
      intelligenceSummary: normalizeOptionalString(input.intelligenceSummary),
      logisticsNotes: normalizeOptionalString(input.logisticsNotes),
      operationalNotes: normalizeOptionalString(input.operationalNotes),
      operationalSummary: normalizeOptionalString(input.operationalSummary),
      specialInstructions: normalizeOptionalString(input.specialInstructions),
      timeline: normalizeOptionalString(input.timeline),
      weather: normalizeOptionalString(input.weather),
    },
  });

  await createAuditLogEntry({
    action: "weekly_tasking.updated",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "WeeklyTasking",
    reason: normalizeOptionalString(input.reason),
    summary: `Week ${updated.weekNumber} weekly tasking updated.`,
  });

  revalidateOperationsPackageRoutes(input.campaignId, input.weekNumber);
}

async function updateUnitTaskingImplementation(input: UpdateUnitTaskingInput) {
  const actor = await requireOperationsPackageUser([
    "operations.tasking.manage",
    "operations.package.edit",
  ]);
  const existing = await prisma.unitTasking.findUnique({
    where: {
      id: input.unitTaskingId,
    },
    include: {
      unit: true,
      weeklyTasking: true,
    },
  });

  if (!existing) {
    throw new Error("Unit tasking not found.");
  }

  const updated = await prisma.unitTasking.update({
    where: {
      id: existing.id,
    },
    data: {
      primaryObjective: normalizeOptionalString(input.primaryObjective),
      secondaryObjective: normalizeOptionalString(input.secondaryObjective),
      specialEquipment: normalizeOptionalString(input.specialEquipment),
      specialInstructions: normalizeOptionalString(input.specialInstructions),
      supportingAssets: normalizeOptionalString(input.supportingAssets),
      unitNotes: normalizeOptionalString(input.unitNotes),
    },
  });

  await createAuditLogEntry({
    action: "unit_tasking.updated",
    actorUserId: actor.id,
    entityId: updated.id,
    entityType: "UnitTasking",
    reason: normalizeOptionalString(input.reason),
    summary: `${existing.unit.shortName} Week ${existing.weeklyTasking.weekNumber} unit tasking updated.`,
  });

  revalidateOperationsPackageRoutes(
    existing.weeklyTasking.campaignId ?? "",
    existing.weeklyTasking.weekNumber,
  );
}

export class OperationsPackageService {
  async getPackage(input: PackageIdentityInput) {
    return getOperationsPackageImplementation(input.campaignId, input.weekNumber);
  }

  async getOrCreatePackageForOperationalWeek(input: PackageIdentityInput) {
    await ensureOperationsPackageImplementation(input.campaignId, input.weekNumber);

    return getOperationsPackageImplementation(input.campaignId, input.weekNumber);
  }

  async createPackage(input: PackageIdentityInput) {
    await ensureOperationsPackageImplementation(input.campaignId, input.weekNumber);
  }

  async updatePlanning(input: UpdateOperationsPackagePlanningInput) {
    await updateOperationsPackagePlanningImplementation(input);
  }

  async updateWeeklyTasking(input: UpdateWeeklyTaskingInput) {
    await updateWeeklyTaskingImplementation(input);
  }

  async updateUnitTasking(input: UpdateUnitTaskingInput) {
    await updateUnitTaskingImplementation(input);
  }

  async updateResources(input: UpdateOperationsPackageResourcesInput) {
    const actor = await requireOperationsPackageUser([
      "operations.resources.manage",
      "deployments.resources.upload",
      "deployments.resources.edit",
      "deployments.edit",
    ]);
    const existing = await prisma.deploymentWeek.findUnique({
      where: {
        campaignId_weekNumber: {
          campaignId: input.campaignId,
          weekNumber: input.weekNumber,
        },
      },
    });

    if (!existing) {
      throw new Error("Operations Package not found.");
    }

    await createAuditLogEntry({
      action: "operations_package.resources_updated",
      actorUserId: actor.id,
      entityId: existing.id,
      entityType: "DeploymentWeek",
      reason: normalizeOptionalString(input.reason),
      summary: `Week ${input.weekNumber} operations package resources refreshed.`,
    });

    revalidateOperationsPackageRoutes(input.campaignId, input.weekNumber);
  }

  async updateCONOP(input: UpdateOperationsPackageConopInput) {
    const actor = await requireOperationsPackageUser([
      "operations.resources.manage",
      "deployments.resources.upload",
      "deployments.resources.edit",
      "deployments.edit",
    ]);
    const existing = await prisma.deploymentWeek.findUnique({
      where: {
        campaignId_weekNumber: {
          campaignId: input.campaignId,
          weekNumber: input.weekNumber,
        },
      },
    });

    if (!existing) {
      throw new Error("Operations Package not found.");
    }

    await createAuditLogEntry({
      action: "operations_package.conop_updated",
      actorUserId: actor.id,
      entityId: existing.id,
      entityType: "DeploymentWeek",
      reason: normalizeOptionalString(input.reason),
      summary: `Week ${input.weekNumber} operations package CONOP association updated.`,
    });

    revalidateOperationsPackageRoutes(input.campaignId, input.weekNumber);
  }

  async assignZeus(input: AssignOperationsPackageZeusInput) {
    const actor = await requireOperationsPackageUser([
      "operations.zeus.assign",
      "s3.zeus.assign",
      "campaigns.edit",
      "deployments.edit",
    ]);
    const existing = await prisma.deploymentWeek.findUnique({
      where: {
        campaignId_weekNumber: {
          campaignId: input.campaignId,
          weekNumber: input.weekNumber,
        },
      },
    });

    if (!existing) {
      throw new Error("Operations Package not found.");
    }

    await createAuditLogEntry({
      action: "operations_package.zeus_assignment_requested",
      actorUserId: actor.id,
      entityId: existing.id,
      entityType: "DeploymentWeek",
      newValue: {
        assignedToUserId: normalizeOptionalString(input.assignedToUserId),
        assignmentType: normalizeOptionalString(input.assignmentType),
      },
      reason: normalizeOptionalString(input.reason),
      summary: `Week ${input.weekNumber} operations package Zeus assignment reviewed.`,
    });

    revalidateOperationsPackageRoutes(input.campaignId, input.weekNumber);
  }

  async generatePreview(input: PackageIdentityInput & { versionBump?: "major" | "minor" }) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    if (!existing) {
      throw new Error("Operations Package not found.");
    }

    return buildReleasePreview(
      existing,
      await getNextReleaseVersion({
        campaignId: input.campaignId,
        versionBump: input.versionBump,
        weekNumber: input.weekNumber,
      }),
    );
  }

  async validateForPublication(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    if (!existing?.readiness) {
      throw new Error("Operations Package readiness could not be evaluated.");
    }

    const blockingIssues = existing.readiness.publication.rules.filter((rule) => rule.status === "FAIL");

    return {
      blockingIssues,
      packageData: existing,
      valid: blockingIssues.length === 0,
      warnings: existing.readiness.publication.rules.filter((rule) => rule.status === "WARNING"),
    };
  }

  async createRelease(input: CreateOperationsReleaseInput) {
    const actor = await requireOperationsPackageUser([
      "operations.package.publish",
      "operations.release.publish",
      "deployments.publish",
    ]);
    const validation = await this.validateForPublication(input);

    if (!validation.packageData) {
      throw new Error("Operations Package not found.");
    }

    const releaseVersion = await getNextReleaseVersion({
      campaignId: input.campaignId,
      versionBump: input.versionBump,
      weekNumber: input.weekNumber,
    });
    const preview = buildReleasePreview(validation.packageData, releaseVersion);
    const release = await prisma.operationsRelease.create({
      data: {
        amendmentSummary: normalizeOptionalString(input.amendmentSummary),
        campaignId: input.campaignId,
        deploymentWeekId: validation.packageData.week.id,
        eventId: validation.packageData.weekendOperation?.id ?? null,
        packageSnapshot: buildReleaseSnapshot(validation.packageData, preview),
        publishedByUserId: actor.id,
        releaseNotes: normalizeOptionalString(input.releaseNotes),
        releaseVersion,
        scheduledFor: input.scheduledFor ?? null,
        status: input.status ?? "draft",
        weekNumber: input.weekNumber,
      },
    });

    await createAuditLogEntry({
      action: "operations_release.created",
      actorUserId: actor.id,
      entityId: release.id,
      entityType: "OperationsRelease",
      newValue: {
        releaseVersion,
        status: release.status,
      },
      summary: `Operations Release ${releaseVersion} created for Week ${input.weekNumber}.`,
    });

    revalidateReleaseRoutes(input.campaignId, input.weekNumber);

    return mapReleaseHistoryItem({
      ...release,
      publishedBy: {
        displayName: actor.displayName ?? null,
        email: null,
        name: null,
      },
    });
  }

  async publishPackage(input: PublishOperationsPackageInput) {
    const actor = await requireOperationsPackageUser([
      "operations.package.publish",
      "operations.release.publish",
      "deployments.publish",
    ]);
    const validation = await this.validateForPublication(input);

    if (!validation.valid) {
      throw new Error(
        `Publication blocked: ${validation.blockingIssues.map((issue) => issue.label).join(", ")}`,
      );
    }

    const releaseVersion = await getNextReleaseVersion({
      campaignId: input.campaignId,
      versionBump: input.versionBump,
      weekNumber: input.weekNumber,
    });
    const preview = buildReleasePreview(validation.packageData, releaseVersion);
    const scheduledFor = input.scheduledFor ?? null;

    if (scheduledFor && scheduledFor.getTime() > Date.now()) {
      return this.createRelease({
        ...input,
        scheduledFor,
        status: "scheduled",
      });
    }

    const currentRelease = await getCurrentReleaseImplementation(input);
    const release = await prisma.operationsRelease.create({
      data: {
        amendmentSummary: normalizeOptionalString(input.amendmentSummary),
        campaignId: input.campaignId,
        deploymentWeekId: validation.packageData.week.id,
        discordStatus: "pending",
        eventId: validation.packageData.weekendOperation?.id ?? null,
        packageSnapshot: buildReleaseSnapshot(validation.packageData, preview),
        publishedByUserId: actor.id,
        releaseNotes: normalizeOptionalString(input.releaseNotes),
        releaseVersion,
        status: "approved",
        weekNumber: input.weekNumber,
      },
    });

    await createAuditLogEntry({
      action: currentRelease ? "operations_release.amendment_created" : "operations_release.created",
      actorUserId: actor.id,
      entityId: release.id,
      entityType: "OperationsRelease",
      newValue: {
        releaseVersion,
      },
      summary: `${currentRelease ? "Amendment" : "Operations Release"} ${releaseVersion} prepared for publication.`,
    });

    const notification = await createNotification({
      actionUrl: preview.actionUrl,
      createdByUserId: actor.id,
      message: `${preview.title} ${releaseVersion} is being published to Discord.`,
      metadata: {
        campaignId: input.campaignId,
        releaseId: release.id,
        releaseVersion,
        weekNumber: input.weekNumber,
      },
      title: `${preview.title} ${releaseVersion}`,
      type: currentRelease
        ? "operations.release.amendment_published"
        : "operations.release.published",
    });
    const conopUrl = preview.resources.find((resource) => resource.resourceType === "CONOP")?.downloadUrl ?? null;
    const delivery = await sendDiscordNotification({
      actorUserId: actor.id,
      mappingKey: "events",
      notificationId: notification.id,
      payload: buildOperationsReleaseDiscordMessage({
        actionUrl: preview.actionUrl,
        campaignTitle: preview.campaignTitle,
        conopUrl,
        endsAt: preview.weekendOperation?.endsAt ?? null,
        operationTitle: preview.weekendOperation?.title ?? null,
        releaseVersion,
        resources: preview.resources.map((resource) => ({
          label: resource.displayName,
          url: resource.downloadUrl,
          versionLabel: resource.versionLabel,
        })),
        startsAt: preview.weekendOperation?.startsAt ?? null,
        summary: preview.summary,
        tasking: preview.weeklyTasking
          ? {
              commandersIntent: preview.weeklyTasking.commandersIntent,
              operationalSummary: preview.weeklyTasking.operationalSummary,
              timeline: preview.weeklyTasking.timeline,
              unitTaskings: preview.weeklyTasking.unitTaskings,
              weekNumber: preview.weeklyTasking.weekNumber,
            }
          : null,
        weekNumber: preview.weekNumber,
      }),
    });

    if (delivery.status !== "sent") {
      await prisma.operationsRelease.update({
        where: {
          id: release.id,
        },
        data: {
          discordChannelId: delivery.channelId ?? null,
          discordDeliveryId: delivery.deliveryId,
          discordErrorMessage: delivery.errorMessage ?? "Discord publication failed.",
          discordMessageId: delivery.providerMessageId,
          discordStatus: "failed",
        },
        include: {
          publishedBy: true,
        },
      });

      await createAuditLogEntry({
        action: "operations_release.publication_failed",
        actorUserId: actor.id,
        entityId: release.id,
        entityType: "OperationsRelease",
        reason: delivery.errorMessage,
        summary: `Operations Release ${releaseVersion} failed Discord publication.`,
      });

      revalidateReleaseRoutes(input.campaignId, input.weekNumber);

      throw new Error(delivery.errorMessage ?? `Operations Release ${releaseVersion} could not be published.`);
    }

    await prisma.operationsRelease.updateMany({
      where: {
        campaignId: input.campaignId,
        id: {
          not: release.id,
        },
        status: "published",
        weekNumber: input.weekNumber,
      },
      data: {
        status: "superseded",
        supersededAt: new Date(),
      },
    });
    const publishedRelease = await prisma.operationsRelease.update({
      where: {
        id: release.id,
      },
      data: {
        discordChannelId: delivery.channelId ?? null,
        discordDeliveryId: delivery.deliveryId,
        discordErrorMessage: null,
        discordMessageId: delivery.providerMessageId,
        discordStatus: "sent",
        publishedAt: new Date(),
        status: "published",
      },
      include: {
        publishedBy: true,
      },
    });

    await createAuditLogEntry({
      action: currentRelease ? "operations_release.amendment_published" : "operations_release.published",
      actorUserId: actor.id,
      entityId: publishedRelease.id,
      entityType: "OperationsRelease",
      newValue: {
        discordDeliveryId: delivery.deliveryId,
        discordMessageId: delivery.providerMessageId,
        releaseVersion,
      },
      summary: `Operations Release ${releaseVersion} published.`,
    });
    await createAuditLogEntry({
      action: "operations_release.discord_published",
      actorUserId: actor.id,
      entityId: publishedRelease.id,
      entityType: "OperationsRelease",
      newValue: {
        channelId: delivery.channelId,
        deliveryId: delivery.deliveryId,
      },
      summary: `Operations Release ${releaseVersion} Discord announcement sent.`,
    });

    revalidateReleaseRoutes(input.campaignId, input.weekNumber);

    return mapReleaseHistoryItem(publishedRelease);
  }

  async publishAmendment(input: PublishOperationsPackageInput) {
    return this.publishPackage({
      ...input,
      versionBump: input.versionBump ?? "minor",
    });
  }

  async getReleaseHistory(input: PackageIdentityInput) {
    await requireOperationsPackageUser([
      "operations.release.view",
      "operations.release.history",
      "operations.package.view",
      "s3.dashboard.view",
    ]);

    return getReleaseHistoryImplementation(input);
  }

  async getCurrentRelease(input: PackageIdentityInput) {
    await requireOperationsPackageUser([
      "operations.release.view",
      "operations.package.view",
      "s3.dashboard.view",
    ]);

    return getCurrentReleaseImplementation(input);
  }

  async getPlanningProgress(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    return existing?.completion ?? null;
  }

  async evaluateOperationalReadiness(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    return existing?.readiness?.operational ?? null;
  }

  async evaluatePublicationReadiness(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    return existing?.readiness?.publication ?? null;
  }

  async getGoNoGoStatus(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    return existing?.readiness ?? null;
  }

  async getReadinessSummary(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    if (!existing?.readiness) {
      return null;
    }

    return {
      blockingIssues: existing.readiness.blockingIssues.length,
      lastEvaluatedAt: existing.readiness.lastEvaluatedAt,
      operational: existing.readiness.operational.score,
      publication: existing.readiness.publication.score,
      warnings: existing.readiness.warnings.length,
    };
  }

  async getBlockingIssues(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    return existing?.readiness?.blockingIssues ?? [];
  }

  async getReadinessRecommendations(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    return existing?.readiness?.recommendations ?? [];
  }

  async getPackageActivity(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    return existing?.activity ?? [];
  }

  async validatePackageSkeleton(input: PackageIdentityInput) {
    const existing = await getOperationsPackageImplementation(input.campaignId, input.weekNumber);

    if (!existing) {
      return {
        issues: ["Operations Package not found."],
        valid: false,
      };
    }

    const issues = [
      existing.weekendOperation ? null : "Weekend Operation is not linked.",
      existing.weeklyTasking ? null : "Weekly Tasking is not initialized.",
      existing.completion.unitTaskingsTotal > 0 ? null : "No active units were found for Unit Tasking generation.",
      existing.completion.unitTaskingsComplete === existing.completion.unitTaskingsTotal
        ? null
        : "One or more Unit Taskings are missing a primary objective.",
      existing.completion.hasConop ? null : "CONOP is not attached.",
      existing.completion.hasResources ? null : "Deployment resources are not attached.",
    ].filter((issue): issue is string => Boolean(issue));

    return {
      issues,
      valid: issues.length === 0,
    };
  }
}

export const operationsPackageService = new OperationsPackageService();

export async function ensureOperationsPackage(campaignId: string, weekNumber: number) {
  await operationsPackageService.createPackage({ campaignId, weekNumber });
}

export async function getOperationsPackage(campaignId: string, weekNumber: number) {
  return operationsPackageService.getPackage({ campaignId, weekNumber });
}

export async function updateOperationsPackagePlanning(input: UpdateOperationsPackagePlanningInput) {
  await operationsPackageService.updatePlanning(input);
}

export async function updateWeeklyTasking(input: UpdateWeeklyTaskingInput) {
  await operationsPackageService.updateWeeklyTasking(input);
}

export async function updateUnitTasking(input: UpdateUnitTaskingInput) {
  await operationsPackageService.updateUnitTasking(input);
}
