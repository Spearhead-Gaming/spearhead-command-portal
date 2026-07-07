import { getDiscordSlashCommandDefinition } from "@/server/discord/commands/catalog";
import { executeDiscordSlashCommand } from "@/server/discord/commands/execute";
import { getPortalUserByDiscordId } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { getPortalBaseUrl } from "@/server/discord/config";
import {
  handleDiscordRsvpInteraction,
  handleDiscordViewEventInteraction,
} from "@/server/discord/interactions/event-rsvp";
import {
  completeInteractionSession,
  continueInteractionSession,
  startInteractionSession,
} from "@/server/discord/interactions/sessions";
import { failSession } from "@/server/discord/interactions/sessions/service";
import { validateDiscordInteractionRequest } from "@/server/discord/interactions/validation";
import {
  completePatrolAsActor,
  startPatrolAsActor,
  togglePatrolInterestAsActor,
} from "@/server/patrols/service";
import { submitAarAsActor } from "@/server/s3/service";

const DISCORD_PING = 1;
const DISCORD_APPLICATION_COMMAND = 2;
const DISCORD_MESSAGE_COMPONENT = 3;
const DISCORD_MODAL_SUBMIT = 5;

const DISCORD_PONG_RESPONSE = 1;
const DISCORD_CHANNEL_MESSAGE_WITH_SOURCE = 4;
const DISCORD_MODAL_RESPONSE = 9;

type DiscordInteractionPayload = {
  data?: {
    custom_id?: string;
    name?: string;
    options?: Array<{
      name?: string;
      options?: Array<{
        name?: string;
        type?: number;
        value?: boolean | number | string;
      }>;
      type?: number;
      value?: boolean | number | string;
    }>;
    resolved?: {
      attachments?: Record<
        string,
        {
          content_type?: string;
          filename: string;
          id: string;
          proxy_url?: string;
          size?: number;
          url: string;
        }
      >;
    };
    components?: Array<{
      components?: Array<{
        custom_id?: string;
        value?: string;
      }>;
    }>;
  };
  id: string;
  channel_id?: string;
  guild_id?: string;
  member?: {
    user?: {
      id?: string;
    };
  };
  token: string;
  type: number;
  user?: {
    id?: string;
  };
};

type DiscordResponseAction = {
  customId?: string;
  label: string;
  style: "danger" | "link" | "primary" | "secondary" | "success";
  url?: string;
};

function buildButtonStyle(style: DiscordResponseAction["style"]) {
  switch (style) {
    case "primary":
      return 1;
    case "secondary":
      return 2;
    case "success":
      return 3;
    case "danger":
      return 4;
    case "link":
      return 5;
    default:
      return 2;
  }
}

function buildEphemeralPlaceholderResponse(
  content: string,
  actions?: DiscordResponseAction[],
) {
  return Response.json({
    data: {
      components: actions?.length
        ? [
            {
              components: actions.slice(0, 5).map((action) =>
                action.style === "link"
                  ? {
                      label: action.label,
                      style: buildButtonStyle(action.style),
                      type: 2,
                      url: action.url,
                    }
                  : {
                      custom_id: action.customId,
                      label: action.label,
                      style: buildButtonStyle(action.style),
                      type: 2,
                    },
              ),
              type: 1,
            },
          ]
        : undefined,
      content,
      flags: 64,
    },
    type: DISCORD_CHANNEL_MESSAGE_WITH_SOURCE,
  });
}

function buildAarModalResponse(customId = "aar-submit", patrolEventValue?: string | null) {
  return Response.json({
    data: {
      custom_id: customId,
      title: "Submit Patrol AAR",
      components: [
        {
          type: 1,
          components: [
            {
              custom_id: "patrol_event",
              label: "Patrol/event and patrol leader",
              max_length: 400,
              min_length: 3,
              placeholder: "Event ID/title - Leader name",
              required: true,
              style: 1,
              type: 4,
              value: patrolEventValue ?? undefined,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "tasking",
              label: "Tasking",
              max_length: 1000,
              min_length: 5,
              required: true,
              style: 2,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "callsigns",
              label: "Callsigns",
              max_length: 1000,
              required: false,
              style: 1,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "casualty_report",
              label: "FKIA / FWIA / FMIA / EKIA",
              max_length: 1000,
              required: false,
              style: 2,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "report",
              label: "Report",
              max_length: 1000,
              min_length: 5,
              required: true,
              style: 2,
              type: 4,
            },
          ],
        },
      ],
    },
    type: DISCORD_MODAL_RESPONSE,
  });
}

function buildPatrolAarModalResponse(customId = "patrol-aar-submit", patrolEventValue?: string | null) {
  return buildAarModalResponseWithCustomId(customId, patrolEventValue);
}

function buildAarModalResponseWithCustomId(customId: string, patrolEventValue?: string | null) {
  return Response.json({
    data: {
      custom_id: customId,
      title: "Submit Patrol AAR",
      components: [
        {
          type: 1,
          components: [
            {
              custom_id: "patrol_event",
              label: "Patrol/event and patrol leader",
              max_length: 400,
              min_length: 3,
              placeholder: "Event ID/title - Leader name",
              required: true,
              style: 1,
              type: 4,
              value: patrolEventValue ?? undefined,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "tasking",
              label: "Tasking",
              max_length: 1000,
              min_length: 5,
              required: true,
              style: 2,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "callsigns",
              label: "Callsigns",
              max_length: 1000,
              required: false,
              style: 1,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "casualty_report",
              label: "FKIA / FWIA / FMIA / EKIA",
              max_length: 1000,
              required: false,
              style: 2,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "report",
              label: "Report",
              max_length: 1000,
              min_length: 5,
              required: true,
              style: 2,
              type: 4,
            },
          ],
        },
      ],
    },
    type: DISCORD_MODAL_RESPONSE,
  });
}

function buildPatrolCreateModalResponse(customId = "patrol-create-submit") {
  return Response.json({
    data: {
      custom_id: customId,
      title: "Start Patrol",
      components: [
        {
          type: 1,
          components: [
            {
              custom_id: "patrol_name",
              label: "Patrol Name",
              max_length: 120,
              min_length: 3,
              placeholder: "Route Leopard Recon",
              required: true,
              style: 1,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "patrol_type",
              label: "Patrol Type",
              max_length: 80,
              placeholder: "Recon, Combat Patrol, Logistics, QRF, Training, Intel, Other",
              required: true,
              style: 1,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "duration",
              label: "Estimated Duration",
              max_length: 20,
              placeholder: "60, 90, 2h",
              required: false,
              style: 1,
              type: 4,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              custom_id: "description",
              label: "Description",
              max_length: 1000,
              required: false,
              style: 2,
              type: 4,
            },
          ],
        },
      ],
    },
    type: DISCORD_MODAL_RESPONSE,
  });
}

function getSubcommandName(payload: DiscordInteractionPayload) {
  return payload.data?.options?.find((option) => option.type === 1)?.name ?? "";
}

function getModalSessionId(customId: string) {
  return customId.split(":")[1] ?? null;
}

async function createModalSession(input: {
  commandName: string;
  discordUserId: string;
  payload: DiscordInteractionPayload;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  temporaryPayload?: Record<string, unknown>;
  workflowType: "PATROL_AAR" | "PATROL_CREATE";
}) {
  return startInteractionSession({
    channelId: input.payload.channel_id ?? null,
    commandName: input.commandName,
    currentStep: "MODAL_OPENED",
    discordUserId: input.discordUserId,
    guildId: input.payload.guild_id ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    requireLinkedUser: true,
    temporaryPayload: {
      interactionId: input.payload.id,
      ...(input.temporaryPayload ?? {}),
      tokenPresent: Boolean(input.payload.token),
    },
    workflowType: input.workflowType,
  });
}

function getModalValue(payload: DiscordInteractionPayload, customId: string) {
  for (const row of payload.data?.components ?? []) {
    const component = row.components?.find((entry) => entry.custom_id === customId);

    if (component?.value) {
      return component.value.trim();
    }
  }

  return "";
}

function parsePatrolEventAndLeader(value: string) {
  const [eventPart, ...leaderParts] = value.split(" - ");
  const leaderName = leaderParts.join(" - ").trim();

  return {
    eventLookup: eventPart.trim() || value.trim(),
    patrolLeaderName: leaderName || null,
  };
}

function getCasualtyValue(value: string, key: string) {
  const match = value.match(new RegExp(`${key}\\s*[:=-]\\s*([^\\n;|]+)`, "i"));

  return match?.[1]?.trim() ?? null;
}

async function handleAarModalSubmit(
  payload: DiscordInteractionPayload,
  discordUserId: string,
  sessionId?: string | null,
) {
  const actor = await getPortalUserByDiscordId(discordUserId);

  if (!actor) {
    return buildEphemeralPlaceholderResponse(
      "Your Discord account is not linked to a portal user yet. Sign in to the portal first, then try again.",
    );
  }

  const patrolEvent = getModalValue(payload, "patrol_event");
  const tasking = getModalValue(payload, "tasking");
  const callsigns = getModalValue(payload, "callsigns");
  const casualtyReport = getModalValue(payload, "casualty_report");
  const report = getModalValue(payload, "report");
  const parsedPatrol = parsePatrolEventAndLeader(patrolEvent);

  if (sessionId) {
    try {
      await continueInteractionSession({
        currentStep: "AAR_TEXT_SUBMITTED",
        id: sessionId,
        temporaryPayload: {
          callsigns,
          casualtyReport,
          patrolEvent,
          report,
          tasking,
          waitingFor: "AAR_SCREENSHOT_UPLOAD",
        },
      });
    } catch (error) {
      return buildEphemeralPlaceholderResponse(
        error instanceof Error
          ? error.message
          : "This Discord AAR session could not continue.",
      );
    }
  }

  const event = parsedPatrol.eventLookup
    ? await prisma.event.findFirst({
        where: {
          eventType: "patrol",
          OR: [
            {
              id: parsedPatrol.eventLookup,
            },
            {
              title: {
                contains: parsedPatrol.eventLookup,
              },
            },
          ],
        },
        orderBy: {
          startsAt: "desc",
        },
      })
    : null;

  if (!event) {
    if (sessionId) {
      await failSession({
        id: sessionId,
        reason: "AAR modal could not resolve a Patrol event.",
      }).catch(() => null);
    }

    return buildEphemeralPlaceholderResponse(
      "I could not match that to a Patrol event. Use the patrol event ID or an exact patrol title, then try /aar again.",
    );
  }

  try {
    const aar = await submitAarAsActor(
      {
        callsigns,
        campaignId: event.campaignId,
        ekia: getCasualtyValue(casualtyReport, "EKIA"),
        eventId: event.id,
        fkia: getCasualtyValue(casualtyReport, "FKIA"),
        fmia: getCasualtyValue(casualtyReport, "FMIA"),
        fwia: getCasualtyValue(casualtyReport, "FWIA"),
        patrolLeaderName:
          parsedPatrol.patrolLeaderName ?? actor.displayName ?? actor.email ?? "Discord submitter",
        reason: `Patrol AAR submitted from Discord by ${discordUserId}.`,
        report,
        summary: report,
        tasking,
        title: `${event.title} Patrol AAR`,
      },
      actor,
    );
    await prisma.pendingDiscordAarSubmission.create({
      data: {
        aarId: aar.id,
        channelId: payload.channel_id ?? null,
        discordUserId,
        eventId: event.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        interactionId: payload.id,
        status: "awaiting-screenshot",
        submittedByUserId: actor.id,
      },
    });
    if (sessionId) {
      await completeInteractionSession({
        id: sessionId,
        relatedEntityId: aar.id,
        relatedEntityType: "Aar",
        temporaryPayload: {
          aarId: aar.id,
          eventId: event.id,
          pendingContinuation: "AAR_SCREENSHOT_UPLOAD",
          screenshotRequired: true,
        },
      });
    }
    await startInteractionSession({
      channelId: payload.channel_id ?? null,
      commandName: "patrol screenshot",
      currentStep: "WAITING_FOR_SCREENSHOT",
      discordUserId,
      guildId: payload.guild_id ?? null,
      portalUserId: actor.id,
      memberProfileId: actor.memberProfileId,
      relatedEntityId: aar.id,
      relatedEntityType: "Aar",
      temporaryPayload: {
        aarId: aar.id,
        eventId: event.id,
        patrolTitle: event.title,
        uploadCommand: "/patrol screenshot",
      },
      ttlMinutes: 60,
      workflowType: "AAR_SCREENSHOT_UPLOAD",
    });
  } catch (error) {
    if (sessionId) {
      await failSession({
        id: sessionId,
        reason: error instanceof Error ? error.message : "AAR modal submit failed.",
      }).catch(() => null);
    }

    return buildEphemeralPlaceholderResponse(
      error instanceof Error ? error.message : "The Patrol AAR could not be submitted.",
    );
  }

  return buildEphemeralPlaceholderResponse(
    `Patrol AAR text received for ${event.title}. Upload the required map screenshot with /patrol screenshot image:<file> before S3 can mark it reviewed.`,
  );
}

function parseDurationMinutes(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const hourMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*h/);

  if (hourMatch?.[1]) {
    return Math.round(Number(hourMatch[1]) * 60);
  }

  const parsed = Number(normalized.replace(/[^0-9.]/g, ""));

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function normalizePatrolType(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");

  switch (normalized) {
    case "combat":
    case "combat-patrol":
      return "combat-patrol";
    case "qrf":
      return "qrf";
    case "logistics":
    case "recon":
    case "training":
    case "intel":
    case "other":
      return normalized;
    default:
      return "other";
  }
}

async function handlePatrolCreateModalSubmit(
  payload: DiscordInteractionPayload,
  discordUserId: string,
  sessionId?: string | null,
) {
  const actor = await getPortalUserByDiscordId(discordUserId);

  if (!actor) {
    return buildEphemeralPlaceholderResponse(
      "Your Discord account is not linked to a portal user yet. Sign in to the portal first, then try again.",
    );
  }

  try {
    if (sessionId) {
      await continueInteractionSession({
        currentStep: "PATROL_DETAILS_SUBMITTED",
        id: sessionId,
        temporaryPayload: {
          description: getModalValue(payload, "description"),
          duration: getModalValue(payload, "duration"),
          patrolName: getModalValue(payload, "patrol_name"),
          patrolType: getModalValue(payload, "patrol_type"),
        },
      });
    }

    const patrol = await startPatrolAsActor(
      {
        description: getModalValue(payload, "description"),
        estimatedDurationMinutes: parseDurationMinutes(getModalValue(payload, "duration")),
        patrolName: getModalValue(payload, "patrol_name"),
        patrolType: normalizePatrolType(getModalValue(payload, "patrol_type")),
        reason: `Patrol started from Discord by ${discordUserId}.`,
        source: "discord",
      },
      actor,
    );

    if (sessionId) {
      await completeInteractionSession({
        id: sessionId,
        relatedEntityId: patrol.id,
        relatedEntityType: "Event",
        temporaryPayload: {
          eventId: patrol.id,
          patrolCallsign: patrol.patrolCallsign,
          title: patrol.title,
        },
      });
    }

    return buildEphemeralPlaceholderResponse(
      `Patrol started: ${patrol.title} (${patrol.patrolCallsign ?? patrol.id}). View it in the portal: ${getPortalBaseUrl()}/operations/patrols?inspect=${patrol.id}`,
    );
  } catch (error) {
    if (sessionId) {
      await failSession({
        id: sessionId,
        reason: error instanceof Error ? error.message : "Patrol create modal submit failed.",
      }).catch(() => null);
    }

    return buildEphemeralPlaceholderResponse(
      error instanceof Error ? error.message : "The Patrol could not be started.",
    );
  }
}

async function handlePatrolRsvpInteraction(input: {
  customId: string;
  discordUserId: string;
}) {
  const [, patrolId, status] = input.customId.split(":");

  if (!patrolId || status !== "interested") {
    return buildEphemeralPlaceholderResponse("That patrol interest action is invalid or expired.");
  }

  const actor = await getPortalUserByDiscordId(input.discordUserId);

  if (!actor) {
    return buildEphemeralPlaceholderResponse(
      "Your Discord account is not linked to a portal user yet. Sign in to the portal first, then try again.",
    );
  }

  try {
    const result = await togglePatrolInterestAsActor({
      actor,
      discordUserId: input.discordUserId,
      patrolId,
      source: "discord",
    });

    return buildEphemeralPlaceholderResponse(
      result.state === "added"
        ? "Interest recorded. This is not final attendance; patrol leaders can confirm participants after the patrol."
        : "Interest removed. You are no longer marked interested for this patrol.",
    );
  } catch (error) {
    return buildEphemeralPlaceholderResponse(
      error instanceof Error ? error.message : "Patrol interest could not be recorded.",
    );
  }
}

async function handleViewPatrolInteraction(input: {
  customId: string;
  discordUserId: string;
}) {
  const [, patrolId] = input.customId.split(":");

  if (!patrolId) {
    return buildEphemeralPlaceholderResponse("That patrol link is invalid or expired.");
  }

  const [actor, patrol] = await Promise.all([
    getPortalUserByDiscordId(input.discordUserId),
    prisma.event.findUnique({
      where: { id: patrolId },
    }),
  ]);

  if (!actor) {
    return buildEphemeralPlaceholderResponse(
      "Your Discord account is not linked to a portal user yet.",
    );
  }

  if (!patrol || patrol.eventType !== "patrol") {
    return buildEphemeralPlaceholderResponse("That patrol could not be found.");
  }

  return buildEphemeralPlaceholderResponse(
    `Open ${patrol.title} in the portal: ${getPortalBaseUrl()}/operations/patrols?inspect=${patrol.id}`,
  );
}

async function handleEndPatrolInteraction(input: {
  customId: string;
  discordUserId: string;
}) {
  const [, patrolId] = input.customId.split(":");

  if (!patrolId) {
    return buildEphemeralPlaceholderResponse("That patrol completion action is invalid or expired.");
  }

  const actor = await getPortalUserByDiscordId(input.discordUserId);

  if (!actor) {
    return buildEphemeralPlaceholderResponse(
      "Your Discord account is not linked to a portal user yet.",
    );
  }

  try {
    const patrol = await completePatrolAsActor(
      {
        patrolId,
        reason: "Patrol completed from Discord button.",
        source: "discord",
      },
      actor,
    );

    return buildEphemeralPlaceholderResponse(
      `Patrol completed: ${patrol.title}.\nPlease submit your AAR and required map screenshot.`,
      [
        {
          customId: `patrol-aar:${patrol.id}`,
          label: "Submit AAR",
          style: "primary",
        },
        {
          label: "View Patrol",
          style: "link",
          url: `${getPortalBaseUrl()}/operations/patrols?inspect=${patrol.id}`,
        },
      ],
    );
  } catch (error) {
    return buildEphemeralPlaceholderResponse(
      error instanceof Error ? error.message : "Patrol could not be completed.",
    );
  }
}

async function handleSubmitPatrolAarInteraction(input: {
  customId: string;
  discordUserId: string;
  payload: DiscordInteractionPayload;
}) {
  const [, patrolId] = input.customId.split(":");

  if (!patrolId) {
    return buildEphemeralPlaceholderResponse("That AAR action is invalid or expired.");
  }

  const patrol = await prisma.event.findUnique({
    where: {
      id: patrolId,
    },
  });

  if (!patrol || patrol.eventType !== "patrol") {
    return buildEphemeralPlaceholderResponse("That patrol could not be found.");
  }

  try {
    const session = await createModalSession({
      commandName: "patrol aar",
      discordUserId: input.discordUserId,
      payload: input.payload,
      relatedEntityId: patrol.id,
      relatedEntityType: "Event",
      temporaryPayload: {
        patrolId: patrol.id,
      },
      workflowType: "PATROL_AAR",
    });

    return buildPatrolAarModalResponse(
      `patrol-aar-submit:${session.id}`,
      `${patrol.patrolCallsign ?? patrol.id} - ${patrol.title}`,
    );
  } catch (error) {
    return buildEphemeralPlaceholderResponse(
      error instanceof Error
        ? error.message
        : "This Discord modal could not start a portal session.",
    );
  }
}

export async function handleDiscordInteractionRequest(request: Request) {
  const rawBody = await request.text();
  const validation = validateDiscordInteractionRequest({
    rawBody,
    signature: request.headers.get("x-signature-ed25519"),
    timestamp: request.headers.get("x-signature-timestamp"),
  });

  if (!validation.ok) {
    return Response.json(
      {
        error: validation.message,
      },
      {
        status: validation.status,
      },
    );
  }

  let payload: DiscordInteractionPayload;

  try {
    payload = JSON.parse(rawBody) as DiscordInteractionPayload;
  } catch {
    return Response.json(
      {
        error: "Discord interaction payload could not be parsed.",
      },
      {
        status: 400,
      },
    );
  }

  if (payload.type === DISCORD_PING) {
    return Response.json({ type: DISCORD_PONG_RESPONSE });
  }

  if (payload.type === DISCORD_APPLICATION_COMMAND) {
    const commandName = payload.data?.name ?? "";
    const definition = getDiscordSlashCommandDefinition(commandName);

    if (!definition) {
      return buildEphemeralPlaceholderResponse(
        "This Discord command is not registered in the portal foundation yet.",
      );
    }

    const discordUserId = payload.member?.user?.id ?? payload.user?.id ?? "";

    if (!discordUserId) {
      return buildEphemeralPlaceholderResponse("Discord user identity could not be resolved.");
    }

    if (definition.name === "aar") {
      try {
        const session = await createModalSession({
          commandName: "aar",
          discordUserId,
          payload,
          workflowType: "PATROL_AAR",
        });

        return buildAarModalResponse(`aar-submit:${session.id}`);
      } catch (error) {
        return buildEphemeralPlaceholderResponse(
          error instanceof Error
            ? error.message
            : "This Discord modal could not start a portal session.",
        );
      }
    }

    if (definition.name === "patrol") {
      const subcommandName = getSubcommandName(payload);

      if (subcommandName === "create") {
        try {
          const session = await createModalSession({
            commandName: "patrol create",
            discordUserId,
            payload,
            workflowType: "PATROL_CREATE",
          });

          return buildPatrolCreateModalResponse(`patrol-create-submit:${session.id}`);
        } catch (error) {
          return buildEphemeralPlaceholderResponse(
            error instanceof Error
              ? error.message
              : "This Discord modal could not start a portal session.",
          );
        }
      }

      if (subcommandName === "aar") {
        try {
          const session = await createModalSession({
            commandName: "patrol aar",
            discordUserId,
            payload,
            workflowType: "PATROL_AAR",
          });

          return buildPatrolAarModalResponse(`patrol-aar-submit:${session.id}`);
        } catch (error) {
          return buildEphemeralPlaceholderResponse(
            error instanceof Error
              ? error.message
              : "This Discord modal could not start a portal session.",
          );
        }
      }
    }

    const result = await executeDiscordSlashCommand({
      commandName: definition.name,
      discordUserId,
      options: payload.data?.options,
      resolvedAttachments: payload.data?.resolved?.attachments,
    });

    return buildEphemeralPlaceholderResponse(result.content, result.actions);
  }

  if (payload.type === DISCORD_MESSAGE_COMPONENT) {
    const customId = payload.data?.custom_id ?? "";
    const discordUserId = payload.member?.user?.id ?? payload.user?.id ?? "";

    if (!discordUserId) {
      return buildEphemeralPlaceholderResponse("Discord user identity could not be resolved.");
    }

    if (customId.startsWith("rsvp:")) {
      return handleDiscordRsvpInteraction({
        customId,
        discordUserId,
      });
    }

    if (customId.startsWith("view-event:")) {
      return handleDiscordViewEventInteraction({
        customId,
        discordUserId,
      });
    }

    if (customId.startsWith("patrol-rsvp:")) {
      return handlePatrolRsvpInteraction({
        customId,
        discordUserId,
      });
    }

    if (customId.startsWith("view-patrol:")) {
      return handleViewPatrolInteraction({
        customId,
        discordUserId,
      });
    }

    if (customId.startsWith("patrol-end:")) {
      return handleEndPatrolInteraction({
        customId,
        discordUserId,
      });
    }

    if (customId.startsWith("patrol-aar:")) {
      return handleSubmitPatrolAarInteraction({
        customId,
        discordUserId,
        payload,
      });
    }

    return buildEphemeralPlaceholderResponse(
      "This Discord component is recognized, but its workflow is not implemented yet.",
    );
  }

  if (payload.type === DISCORD_MODAL_SUBMIT) {
    const customId = payload.data?.custom_id ?? "";
    const discordUserId = payload.member?.user?.id ?? payload.user?.id ?? "";

    if (!discordUserId) {
      return buildEphemeralPlaceholderResponse("Discord user identity could not be resolved.");
    }

    if (customId === "aar-submit" || customId.startsWith("aar-submit:")) {
      return handleAarModalSubmit(payload, discordUserId, getModalSessionId(customId));
    }

    if (customId === "patrol-aar-submit" || customId.startsWith("patrol-aar-submit:")) {
      return handleAarModalSubmit(payload, discordUserId, getModalSessionId(customId));
    }

    if (
      customId === "patrol-create-submit" ||
      customId.startsWith("patrol-create-submit:")
    ) {
      return handlePatrolCreateModalSubmit(
        payload,
        discordUserId,
        getModalSessionId(customId),
      );
    }

    return buildEphemeralPlaceholderResponse(
      "This Discord modal is recognized, but its workflow is not implemented yet.",
    );
  }

  return buildEphemeralPlaceholderResponse(
    "Discord interaction received. Additional workflow handlers will be attached in a future milestone.",
  );
}
