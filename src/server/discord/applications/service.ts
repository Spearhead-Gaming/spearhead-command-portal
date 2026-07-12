import crypto from "node:crypto";

import type { Prisma } from "@prisma/client";

import { getPortalUserByDiscordId } from "@/server/auth/current-user";
import { processCommunicationRequest } from "@/server/communications/pipeline";
import { prisma } from "@/server/database/client";
import { getPortalBaseUrl } from "@/server/discord/config";
import {
  CURRENT_DISCORD_APPLICATION_TYPES,
  DISCORD_APPLICATION_CATALOG_DEFINITIONS,
  isDiscordApplicationTypeKey,
} from "@/server/discord/applications/catalog";
import type {
  ApplicationEligibilityResult,
  DiscordApplicationCatalogItem,
  DiscordApplicationTypeKey,
} from "@/server/discord/applications/types";
import { startInteractionSession } from "@/server/discord/interactions/sessions";
import { can } from "@/server/permissions/access";
import type { PortalUser } from "@/features/auth/types";
import { recordAuditEvent } from "@/server/services/audit-log-service";

const CONTINUATION_TTL_MINUTES = 30;
const RASP_MINIMUM_3ID_DAYS = 30;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getConfiguredUnitKeys(envName: string, fallback: string[]) {
  const configured = process.env[envName]
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return configured?.length ? configured : fallback;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signContinuationToken(input: {
  applicationTypeKey: string;
  discordUserId: string;
  expiresAt: Date;
  sessionId: string;
}) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "development-only-application-continuation";
  const payload = Buffer.from(
    JSON.stringify({
      applicationTypeKey: input.applicationTypeKey,
      discordUserId: input.discordUserId,
      expiresAt: input.expiresAt.toISOString(),
      sessionId: input.sessionId,
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function verifyContinuationToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "development-only-application-continuation";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      applicationTypeKey: string;
      discordUserId: string;
      expiresAt: string;
      sessionId: string;
    };
  } catch {
    return null;
  }
}

async function ensureCatalogEntries() {
  await Promise.all(
    DISCORD_APPLICATION_CATALOG_DEFINITIONS.map((entry) =>
      prisma.discordApplicationCatalogEntry.upsert({
        create: {
          applicantScope: entry.applicantScope,
          applicationTypeKey: entry.applicationTypeKey,
          availability: entry.availability,
          communicationDomain: entry.communicationDomain,
          description: entry.description,
          discordStartBehavior: entry.discordStartBehavior,
          displayName: entry.displayName,
          eligibilitySummary: entry.eligibilitySummary,
          isEnabled: entry.enabled,
          owningDomain: entry.owningDomain,
          phase5ProviderKey: entry.phase5ProviderKey,
          portalRoute: entry.portalRoute,
          reviewDestination: entry.reviewDestination,
          sortOrder: entry.sortOrder,
        },
        update: {
          applicantScope: entry.applicantScope,
          availability: entry.availability,
          communicationDomain: entry.communicationDomain,
          description: entry.description,
          discordStartBehavior: entry.discordStartBehavior,
          displayName: entry.displayName,
          eligibilitySummary: entry.eligibilitySummary,
          owningDomain: entry.owningDomain,
          phase5ProviderKey: entry.phase5ProviderKey,
          portalRoute: entry.portalRoute,
          reviewDestination: entry.reviewDestination,
          sortOrder: entry.sortOrder,
        },
        where: {
          applicationTypeKey: entry.applicationTypeKey,
        },
      }),
    ),
  );
}

async function resolveDiscordServer(guildId?: string | null) {
  if (guildId) {
    return prisma.discordServer.findUnique({
      where: {
        guildId,
      },
    });
  }

  return prisma.discordServer.findFirst({
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    where: {
      isActive: true,
    },
  });
}

export async function getOrCreateDiscordApplicationGuildPolicy(guildId?: string | null) {
  const server = await resolveDiscordServer(guildId);

  if (!server) {
    return null;
  }

  return prisma.discordApplicationGuildPolicy.upsert({
    create: {
      discordServerId: server.id,
      guildId: server.guildId,
      visibleApplicationTypes: toJson(CURRENT_DISCORD_APPLICATION_TYPES),
    },
    update: {},
    where: {
      discordServerId: server.id,
    },
  });
}

async function getEnabledTemplate(applicationTypeKey: DiscordApplicationTypeKey) {
  return prisma.formTemplate.findFirst({
    where: {
      archivedAt: null,
      deletedAt: null,
      formType: applicationTypeKey,
      isEnabled: true,
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });
}

async function getActiveSubmissionForType(input: {
  applicationTypeKey: DiscordApplicationTypeKey;
  userId: string;
}) {
  return prisma.formSubmission.findFirst({
    include: {
      status: true,
      template: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    where: {
      submittedByUserId: input.userId,
      template: {
        formType: input.applicationTypeKey,
      },
      status: {
        isTerminal: false,
      },
    },
  });
}

async function getUnitByConfiguredKeys(envName: string, fallback: string[]) {
  const keys = getConfiguredUnitKeys(envName, fallback);

  return prisma.unit.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      key: {
        in: keys,
      },
    },
  });
}

function buildEligibility(input: Partial<ApplicationEligibilityResult> & {
  explanation: string;
  status: ApplicationEligibilityResult["status"];
}): ApplicationEligibilityResult {
  return {
    blockingReasons: input.blockingReasons ?? [],
    directPortalUrl: input.directPortalUrl ?? null,
    explanation: input.explanation,
    nextAction: input.nextAction ?? "Open the Portal to continue.",
    remainingDays: input.remainingDays ?? null,
    requiredRuleIds: input.requiredRuleIds ?? [],
    status: input.status,
    warnings: input.warnings ?? [],
  };
}

async function evaluateRaspEligibility(actor: PortalUser | null, directPortalUrl: string) {
  if (!actor?.memberProfileId) {
    return buildEligibility({
      blockingReasons: ["RASP requires a linked active member profile."],
      directPortalUrl,
      explanation: "Link your Discord account to an existing Portal member profile before applying for RASP.",
      nextAction: "Sign in to the Portal and confirm your member profile link.",
      requiredRuleIds: ["rasp.identity_required"],
      status: "IdentityRequired",
    });
  }

  const [sourceUnit, targetUnit, member, activeSubmission] = await Promise.all([
    getUnitByConfiguredKeys("APPLICATION_RASP_SOURCE_UNIT_KEYS", ["reaper"]),
    getUnitByConfiguredKeys("APPLICATION_RASP_TARGET_UNIT_KEYS", ["misfit"]),
    prisma.memberProfile.findUnique({
      include: {
        currentUnit: true,
        rosterAssignments: {
          include: {
            unit: true,
          },
          orderBy: {
            startsAt: "asc",
          },
        },
        status: true,
      },
      where: {
        id: actor.memberProfileId,
      },
    }),
    getActiveSubmissionForType({
      applicationTypeKey: "rasp_application",
      userId: actor.id,
    }),
  ]);

  if (activeSubmission) {
    return buildEligibility({
      directPortalUrl: `${getPortalBaseUrl()}/applications/${activeSubmission.id}`,
      explanation: `You already have a ${activeSubmission.template.title} in ${activeSubmission.status.label}.`,
      nextAction: "Open your existing submission.",
      requiredRuleIds: ["rasp.already_applied"],
      status: "AlreadyApplied",
    });
  }

  if (!member || !member.isActive || member.deletedAt) {
    return buildEligibility({
      blockingReasons: ["An active Portal member profile is required."],
      directPortalUrl,
      explanation: "RASP requires an active member profile.",
      requiredRuleIds: ["rasp.active_member_required"],
      status: "Ineligible",
    });
  }

  if (!sourceUnit || !targetUnit) {
    return buildEligibility({
      blockingReasons: ["RASP source or destination unit configuration is missing."],
      directPortalUrl,
      explanation: "RASP eligibility cannot be evaluated until unit configuration is complete.",
      requiredRuleIds: ["rasp.unit_configuration_missing"],
      status: "NeedsReview",
    });
  }

  const now = new Date();
  const qualifyingAssignments = member.rosterAssignments.filter((assignment) => assignment.unitId === sourceUnit.id);
  const qualifyingDays = qualifyingAssignments.reduce((total, assignment) => {
    const end = assignment.endsAt && assignment.endsAt < now ? assignment.endsAt : now;
    const ms = Math.max(0, end.getTime() - assignment.startsAt.getTime());

    return total + Math.floor(ms / (1000 * 60 * 60 * 24));
  }, 0);

  if (member.currentUnitId === targetUnit.id) {
    return buildEligibility({
      directPortalUrl,
      explanation: `You are already assigned to ${targetUnit.name}.`,
      requiredRuleIds: ["rasp.already_ranger"],
      status: "NotApplicable",
    });
  }

  if (qualifyingDays < RASP_MINIMUM_3ID_DAYS) {
    return buildEligibility({
      blockingReasons: [`${RASP_MINIMUM_3ID_DAYS} days in ${sourceUnit.name} are required.`],
      directPortalUrl,
      explanation: `RASP targets ${targetUnit.name}. You have ${qualifyingDays} qualifying day${qualifyingDays === 1 ? "" : "s"} in ${sourceUnit.name}.`,
      nextAction: `You can apply after ${RASP_MINIMUM_3ID_DAYS - qualifyingDays} more day${RASP_MINIMUM_3ID_DAYS - qualifyingDays === 1 ? "" : "s"} of qualifying service.`,
      remainingDays: RASP_MINIMUM_3ID_DAYS - qualifyingDays,
      requiredRuleIds: ["rasp.minimum_3id_service_days"],
      status: "Ineligible",
    });
  }

  return buildEligibility({
    directPortalUrl,
    explanation: `Eligible for RASP. Destination Unit: ${targetUnit.name}.`,
    nextAction: "Open the Portal to continue. Target Unit and Prior Experience are not requested for RASP.",
    requiredRuleIds: ["rasp.minimum_3id_service_days", "rasp.fixed_destination"],
    status: "Eligible",
    warnings: ["RASP personnel changes remain Portal-owned after review."],
  });
}

async function evaluateTransferEligibility(actor: PortalUser | null, directPortalUrl: string) {
  if (!actor?.memberProfileId) {
    return buildEligibility({
      blockingReasons: ["Unit transfers require a linked member profile."],
      directPortalUrl,
      explanation: "Link your Discord account to an existing Portal member profile before requesting transfer.",
      requiredRuleIds: ["transfer.identity_required"],
      status: "IdentityRequired",
    });
  }

  const [commandUnit, detachment7, activeSubmission] = await Promise.all([
    getUnitByConfiguredKeys("APPLICATION_TRANSFER_COMMAND_UNIT_KEYS", ["spearhead-command"]),
    getUnitByConfiguredKeys("APPLICATION_TRANSFER_INVITE_ONLY_UNIT_KEYS", ["viking"]),
    getActiveSubmissionForType({
      applicationTypeKey: "unit_transfer_request",
      userId: actor.id,
    }),
  ]);

  if (activeSubmission) {
    return buildEligibility({
      directPortalUrl: `${getPortalBaseUrl()}/applications/${activeSubmission.id}`,
      explanation: `You already have a ${activeSubmission.template.title} in ${activeSubmission.status.label}.`,
      nextAction: "Open your existing submission.",
      requiredRuleIds: ["transfer.already_applied"],
      status: "AlreadyApplied",
    });
  }

  return buildEligibility({
    directPortalUrl,
    explanation: "Eligible to start the Portal transfer request flow.",
    nextAction: "Open the Portal and choose an allowed destination unit.",
    requiredRuleIds: ["transfer.portal_destination_filtering"],
    status: "Eligible",
    warnings: [
      commandUnit ? `${commandUnit.name} cannot be selected as a normal transfer destination.` : "Command destination configuration should be reviewed.",
      detachment7 ? `${detachment7.name} is invite-only and leadership-managed.` : "Invite-only detachment configuration should be reviewed.",
      "75th Ranger Regiment entry should use RASP where policy requires it.",
    ],
  });
}

async function evaluateRecruitEligibility(actor: PortalUser | null, directPortalUrl: string) {
  if (!actor) {
    return buildEligibility({
      blockingReasons: ["Discord OAuth linking is required before starting from Discord."],
      directPortalUrl,
      explanation: "Recruit applications can start from Discord, but the Portal must bind the application to your Discord identity.",
      nextAction: "Sign in with Discord, then return to the application link.",
      requiredRuleIds: ["recruit.discord_identity_required"],
      status: "IdentityRequired",
    });
  }

  const activeSubmission = await getActiveSubmissionForType({
    applicationTypeKey: "recruit_application",
    userId: actor.id,
  });

  if (activeSubmission) {
    return buildEligibility({
      directPortalUrl: `${getPortalBaseUrl()}/applications/${activeSubmission.id}`,
      explanation: `You already have a ${activeSubmission.template.title} in ${activeSubmission.status.label}.`,
      nextAction: "Open your existing submission.",
      requiredRuleIds: ["recruit.already_applied"],
      status: "AlreadyApplied",
    });
  }

  return buildEligibility({
    directPortalUrl,
    explanation: "Eligible to start the recruit application in the Portal.",
    nextAction: "Open the Portal to answer the configurable recruit application questions.",
    requiredRuleIds: ["recruit.portal_form_required"],
    status: "Eligible",
    warnings: [
      "Discord display name is identity context, not a trusted answer field.",
      "Approved recruits are assigned through Portal personnel services.",
    ],
  });
}

export async function evaluateApplicationEligibility(input: {
  actor: PortalUser | null;
  applicationTypeKey: DiscordApplicationTypeKey;
  templateId: string | null;
}) {
  const directPortalUrl = `${getPortalBaseUrl()}/applications?type=${encodeURIComponent(input.applicationTypeKey)}`;

  if (!input.templateId && CURRENT_DISCORD_APPLICATION_TYPES.includes(input.applicationTypeKey)) {
    return buildEligibility({
      blockingReasons: ["No enabled Portal form template exists for this application type."],
      directPortalUrl: `${getPortalBaseUrl()}/applications`,
      explanation: "This application is configured for Discord, but the Portal form template is not enabled yet.",
      nextAction: "Ask staff to enable the Portal application template.",
      requiredRuleIds: ["application.template_missing"],
      status: "ApplicationUnavailable",
    });
  }

  switch (input.applicationTypeKey) {
    case "recruit_application":
      return evaluateRecruitEligibility(input.actor, directPortalUrl);
    case "rasp_application":
      return evaluateRaspEligibility(input.actor, directPortalUrl);
    case "unit_transfer_request":
      return evaluateTransferEligibility(input.actor, directPortalUrl);
    default:
      return buildEligibility({
        blockingReasons: ["This application type is reserved for Phase 5."],
        directPortalUrl: `${getPortalBaseUrl()}/applications`,
        explanation: "This application entry is documented but not available from Discord yet.",
        nextAction: "Use the Portal or wait for Phase 5 application providers.",
        requiredRuleIds: ["application.phase5_deferred"],
        status: "ApplicationUnavailable",
      });
  }
}

export async function listDiscordApplicationCatalog(input: {
  discordUserId?: string | null;
  guildId?: string | null;
  includeUnavailable?: boolean;
}): Promise<DiscordApplicationCatalogItem[]> {
  await ensureCatalogEntries();

  const [actor, policy, entries] = await Promise.all([
    input.discordUserId ? getPortalUserByDiscordId(input.discordUserId) : Promise.resolve(null),
    getOrCreateDiscordApplicationGuildPolicy(input.guildId),
    prisma.discordApplicationCatalogEntry.findMany({
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    }),
  ]);
  const visibleTypes = Array.isArray(policy?.visibleApplicationTypes)
    ? policy.visibleApplicationTypes.map((entry) => String(entry))
    : CURRENT_DISCORD_APPLICATION_TYPES;
  const results: DiscordApplicationCatalogItem[] = [];

  for (const entry of entries) {
    if (!isDiscordApplicationTypeKey(entry.applicationTypeKey)) {
      continue;
    }

    const visible = visibleTypes.includes(entry.applicationTypeKey);
    const template = await getEnabledTemplate(entry.applicationTypeKey);
    const eligibility = await evaluateApplicationEligibility({
      actor,
      applicationTypeKey: entry.applicationTypeKey,
      templateId: template?.id ?? null,
    });
    const enabled =
      Boolean(entry.isEnabled) &&
      !entry.maintenanceMode &&
      Boolean(policy?.applicationIntegrationEnabled ?? true) &&
      (policy?.commandAvailability ?? "enabled") === "enabled" &&
      visible &&
      eligibility.status !== "ApplicationUnavailable";

    if (!input.includeUnavailable && !enabled) {
      continue;
    }

    results.push({
      applicantScope: entry.applicantScope,
      applicationTypeKey: entry.applicationTypeKey,
      availability: entry.availability,
      communicationDomain: entry.communicationDomain,
      description: entry.description,
      discordStartBehavior: entry.discordStartBehavior,
      displayName: entry.displayName,
      enabled,
      eligibility,
      maintenanceMode: entry.maintenanceMode,
      owningDomain: entry.owningDomain,
      phase5ProviderKey: entry.phase5ProviderKey,
      portalRoute: entry.portalRoute,
      reviewDestination: entry.reviewDestination,
      templateId: template?.id ?? null,
    });
  }

  return results;
}

export async function startDiscordApplication(input: {
  applicationTypeKey: string;
  channelId?: string | null;
  discordUserId: string;
  guildId?: string | null;
}) {
  if (!isDiscordApplicationTypeKey(input.applicationTypeKey)) {
    throw new Error("Unknown application type.");
  }

  const actor = await getPortalUserByDiscordId(input.discordUserId);
  const catalog = await listDiscordApplicationCatalog({
    discordUserId: input.discordUserId,
    guildId: input.guildId,
    includeUnavailable: true,
  });
  const entry = catalog.find((item) => item.applicationTypeKey === input.applicationTypeKey);

  if (!entry) {
    throw new Error("Application type is not configured.");
  }

  if (!entry.enabled && entry.eligibility.status !== "AlreadyApplied") {
    throw new Error(entry.eligibility.explanation);
  }

  if (!["Eligible", "AlreadyApplied", "NeedsReview"].includes(entry.eligibility.status)) {
    throw new Error(entry.eligibility.explanation);
  }

  const session = await startInteractionSession({
    channelId: input.channelId ?? null,
    commandName: "apply start",
    currentStep: "ELIGIBILITY_CHECKED",
    discordUserId: input.discordUserId,
    guildId: input.guildId ?? null,
    memberProfileId: actor?.memberProfileId,
    portalUserId: actor?.id,
    requireLinkedUser: entry.applicationTypeKey !== "recruit_application",
    temporaryPayload: {
      applicationTypeKey: entry.applicationTypeKey,
      eligibility: entry.eligibility,
      phase5ProviderKey: entry.phase5ProviderKey,
    },
    ttlMinutes: CONTINUATION_TTL_MINUTES,
    workflowType: "APPLICATION_START",
  });
  const expiresAt = new Date(Date.now() + CONTINUATION_TTL_MINUTES * 60 * 1000);
  const token = signContinuationToken({
    applicationTypeKey: entry.applicationTypeKey,
    discordUserId: input.discordUserId,
    expiresAt,
    sessionId: session.id,
  });

  await prisma.discordApplicationContinuationToken.create({
    data: {
      applicationTypeKey: entry.applicationTypeKey,
      discordUserId: input.discordUserId,
      expiresAt,
      guildId: input.guildId ?? null,
      memberProfileId: actor?.memberProfileId ?? null,
      portalUserId: actor?.id ?? null,
      sessionId: session.id,
      tokenHash: hashToken(token),
    },
  });

  await recordAuditEvent({
    action: "discord.application.started",
    actorUserId: actor?.id ?? null,
    entityId: session.id,
    entityType: "DiscordInteractionSession",
    metadata: {
      applicationTypeKey: entry.applicationTypeKey,
      guildId: input.guildId ?? null,
    },
    summary: `Discord application start created for ${entry.displayName}.`,
  });

  return {
    continuationUrl: `${getPortalBaseUrl()}/api/discord/applications/continue?session=${encodeURIComponent(session.id)}&token=${encodeURIComponent(token)}`,
    entry,
    expiresAt,
    session,
  };
}

export async function validateDiscordApplicationContinuation(input: {
  sessionId: string;
  token: string;
}) {
  const parsed = verifyContinuationToken(input.token);

  if (!parsed || parsed.sessionId !== input.sessionId) {
    throw new Error("Application continuation link is invalid.");
  }

  if (new Date(parsed.expiresAt) <= new Date()) {
    throw new Error("Application continuation link has expired.");
  }

  const record = await prisma.discordApplicationContinuationToken.findUnique({
    where: {
      tokenHash: hashToken(input.token),
    },
  });

  if (!record || record.status !== "active" || record.expiresAt <= new Date()) {
    throw new Error("Application continuation link is no longer active.");
  }

  await prisma.discordApplicationContinuationToken.update({
    data: {
      status: "used",
      usedAt: new Date(),
    },
    where: {
      id: record.id,
    },
  });

  await prisma.discordInteractionSession.update({
    data: {
      currentStep: "AWAITING_PORTAL_COMPLETION",
      temporaryPayload: {
        applicationTypeKey: record.applicationTypeKey,
        continuationUsedAt: new Date().toISOString(),
      },
    },
    where: {
      id: record.sessionId,
    },
  }).catch(() => null);

  return {
    applicationTypeKey: record.applicationTypeKey,
    redirectUrl: `/applications?type=${encodeURIComponent(record.applicationTypeKey)}&discordSession=${encodeURIComponent(record.sessionId)}`,
  };
}

export async function listDiscordApplicationStatuses(input: {
  actor: PortalUser;
}) {
  const submissions = await prisma.formSubmission.findMany({
    include: {
      status: true,
      template: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 8,
    where: {
      submittedByUserId: input.actor.id,
      template: {
        formType: {
          in: [...CURRENT_DISCORD_APPLICATION_TYPES],
        },
      },
    },
  });

  return submissions;
}

export async function publishApplicationReviewMessage(input: {
  actorUserId?: string | null;
  submissionId: string;
}) {
  const submission = await prisma.formSubmission.findUnique({
    include: {
      status: true,
      submittedBy: true,
      targetUnit: true,
      template: true,
    },
    where: {
      id: input.submissionId,
    },
  });

  if (!submission || !isDiscordApplicationTypeKey(submission.template.formType)) {
    throw new Error("Application submission is not available for Discord review routing.");
  }

  const server = await resolveDiscordServer(null);
  const portalUrl = `${getPortalBaseUrl()}/applications/${submission.id}`;
  const communication = await processCommunicationRequest({
    body: [
      `${submission.titleSnapshot} entered the Portal review queue.`,
      `Applicant: ${submission.submittedBy?.displayName ?? submission.submittedBy?.name ?? submission.submittedBy?.email ?? "Unknown applicant"}`,
      `Status: ${submission.status.label}`,
      "Sensitive answers remain in the Portal.",
    ].join("\n"),
    category: submission.template.formType === "recruit_application" ? "recruitment" : "applications",
    idempotencyKey: `discord-application-review:${submission.id}:${submission.status.key}`,
    priority: "high",
    relatedEntityId: submission.id,
    relatedEntityType: "FormSubmission",
    requestedByUserId: input.actorUserId ?? null,
    requestedChannels: [{ mappingKey: "staff-alerts", type: "discord_channel", unitIds: [submission.targetUnitId] }],
    sourceEvent: "application.review_message.requested",
    sourceModule: "discord-applications",
    targetAudience: [{ mappingKey: "staff-alerts", type: "discord_channel", unitIds: [submission.targetUnitId] }],
    title: `Application review: ${submission.titleSnapshot}`,
    type: "form.review_requested",
    providerPayload: {
      actionUrl: portalUrl,
      actions: [
        {
          customId: `application-review:open:${submission.id}`,
          label: "Open Application",
          style: "primary",
        },
        {
          customId: `application-review:assign:${submission.id}`,
          label: "Assign to Me",
          style: "secondary",
        },
        {
          customId: `application-review:request_information:${submission.id}`,
          label: "Request Info",
          style: "secondary",
        },
        {
          customId: `application-review:approve:${submission.id}`,
          label: "Approve",
          style: "success",
        },
        {
          customId: `application-review:deny:${submission.id}`,
          label: "Deny",
          style: "danger",
        },
      ],
      fields: [
        {
          label: "Workflow Status",
          value: submission.status.label,
        },
        {
          label: "Review Boundary",
          value: "Sensitive answers and decision reasons stay in the Portal.",
        },
      ],
      footer: "Portal remains the source of truth for applications.",
      visibility: "staff",
    },
  });

  const existingReviewMessage = await prisma.discordApplicationReviewMessage.findFirst({
    where: {
      submissionId: submission.id,
    },
  });

  if (existingReviewMessage) {
    await prisma.discordApplicationReviewMessage.update({
      data: {
        lastPublishedAt: new Date(),
        routingSummary: "Routed through Multi-Guild Communication Platform using staff-alerts mapping.",
        status: "requested",
      },
      where: {
        id: existingReviewMessage.id,
      },
    });
  } else {
    await prisma.discordApplicationReviewMessage.create({
      data: {
        applicationType: submission.template.formType,
        discordServerId: server?.id ?? null,
        guildId: server?.guildId ?? null,
        lastPublishedAt: new Date(),
        routingSummary: "Routed through Multi-Guild Communication Platform using staff-alerts mapping.",
        status: "requested",
        submissionId: submission.id,
      },
    });
  }

  await recordAuditEvent({
    action: "discord.application.review_message_published",
    actorUserId: input.actorUserId ?? null,
    entityId: submission.id,
    entityType: "FormSubmission",
    metadata: {
      communicationId: communication.id,
      formType: submission.template.formType,
    },
    summary: `Discord review routing requested for ${submission.titleSnapshot}.`,
  });

  return communication;
}

export async function handleDiscordApplicationReviewQuickAction(input: {
  action: "approve" | "assign" | "deny" | "open" | "request_information";
  discordUserId: string;
  submissionId: string;
}) {
  const actor = await getPortalUserByDiscordId(input.discordUserId);

  if (!actor) {
    throw new Error("Your Discord account is not linked to a Portal reviewer.");
  }

  const submission = await prisma.formSubmission.findUnique({
    include: {
      status: true,
      targetUnit: true,
      template: true,
    },
    where: {
      id: input.submissionId,
    },
  });

  if (!submission) {
    throw new Error("Application submission was not found.");
  }

  const portalUrl = `${getPortalBaseUrl()}/applications/${submission.id}`;

  if (input.action === "open") {
    return {
      content: `Open ${submission.titleSnapshot} in the Portal: ${portalUrl}`,
      portalUrl,
    };
  }

  if (input.action === "assign") {
    if (!can(actor, "discord.applications.review.assign") && !can(actor, "forms.assign_reviewer", { unitId: submission.targetUnitId })) {
      throw new Error("You do not have permission to assign this application review.");
    }

    const underReview = await prisma.submissionStatus.findUnique({
      where: {
        key: "under_review",
      },
    });

    await prisma.formSubmission.update({
      data: {
        reviewerUserId: actor.id,
        submissionStatusId: underReview?.id ?? submission.submissionStatusId,
      },
      where: {
        id: submission.id,
      },
    });

    await recordAuditEvent({
      action: "discord.application.review_assigned",
      actorUserId: actor.id,
      entityId: submission.id,
      entityType: "FormSubmission",
      summary: `${submission.titleSnapshot} was assigned from a Discord review action.`,
    });

    return {
      content: `Assigned ${submission.titleSnapshot} to you. Continue review in the Portal: ${portalUrl}`,
      portalUrl,
    };
  }

  const permissionByAction = {
    approve: "discord.applications.review.approve",
    deny: "discord.applications.review.deny",
    request_information: "discord.applications.review.request_information",
  } as const;

  if (!can(actor, permissionByAction[input.action]) && !can(actor, "forms.review", { unitId: submission.targetUnitId })) {
    throw new Error("You do not have permission to perform that application review action.");
  }

  await recordAuditEvent({
    action: `discord.application.review_${input.action}.portal_required`,
    actorUserId: actor.id,
    entityId: submission.id,
    entityType: "FormSubmission",
    summary: `${submission.titleSnapshot} ${input.action} was requested from Discord and redirected to Portal review.`,
  });

  return {
    content: `Open ${submission.titleSnapshot} in the Portal to ${input.action.replaceAll("_", " ")}. Sensitive review context and required reasons stay Portal-owned: ${portalUrl}`,
    portalUrl,
  };
}

export async function getDiscordApplicationIntegrationOverview() {
  await ensureCatalogEntries();

  const [
    catalog,
    policies,
    activeSessions,
    expiredTokens,
    reviewMessages,
    pendingReviews,
  ] = await Promise.all([
    prisma.discordApplicationCatalogEntry.findMany({
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    }),
    prisma.discordApplicationGuildPolicy.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    }),
    prisma.discordInteractionSession.count({
      where: {
        status: "ACTIVE",
        workflowType: "APPLICATION_START",
      },
    }),
    prisma.discordApplicationContinuationToken.count({
      where: {
        expiresAt: {
          lte: new Date(),
        },
        status: "active",
      },
    }),
    prisma.discordApplicationReviewMessage.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 20,
    }),
    prisma.formSubmission.count({
      where: {
        status: {
          isTerminal: false,
        },
        template: {
          formType: {
            in: [...CURRENT_DISCORD_APPLICATION_TYPES],
          },
        },
      },
    }),
  ]);

  return {
    catalog,
    policies,
    reviewMessages,
    summary: {
      activeCatalogEntries: catalog.filter((entry) => entry.isEnabled && !entry.maintenanceMode).length,
      activeSessions,
      expiredTokens,
      pendingReviews,
      policyCount: policies.length,
      reviewMessageCount: reviewMessages.length,
    },
  };
}

export function canViewDiscordApplications(user: PortalUser) {
  return can(user, "discord.applications.view") || can(user, "discord.applications.catalog.view");
}
