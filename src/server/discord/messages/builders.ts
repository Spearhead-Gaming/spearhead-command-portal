import type { DiscordMessagePayload } from "@/server/discord/types";

type BaseDiscordMessageInput = {
  actionLabel?: string | null;
  actionUrl?: string | null;
  footer?: string | null;
  summary: string;
  title: string;
};

function buildBaseDiscordMessage(input: BaseDiscordMessageInput): DiscordMessagePayload {
  return {
    actionLabel: input.actionLabel ?? null,
    actionUrl: input.actionUrl ?? null,
    body: input.summary,
    footer: input.footer ?? "Portal remains the source of truth.",
    title: input.title,
    visibility: "public",
  };
}

function formatDiscordTimestamp(date: Date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

export function buildEventAnnouncementDiscordMessage(input: {
  actionUrl: string;
  campaignTitle?: string | null;
  endsAt?: Date | null;
  eventId: string;
  eventTitle: string;
  eventTypeLabel: string;
  hostUnitName?: string | null;
  resources?: Array<{
    label: string;
    url: string;
  }>;
  startsAt: Date;
  tasking?: {
    commandersIntent?: string | null;
    operationalSummary?: string | null;
    timeline?: string | null;
    unitTaskings?: Array<{
      primaryObjective?: string | null;
      secondaryObjective?: string | null;
      specialInstructions?: string | null;
      unitShortName: string;
    }>;
    weekNumber: number;
  } | null;
}) {
  return {
    ...buildBaseDiscordMessage({
      actionLabel: "Open Event",
      actionUrl: input.actionUrl,
      summary: `${input.eventTitle} is live in the portal and ready for RSVP tracking.`,
      title: "Event Announcement",
    }),
    actions: [
      {
        customId: `rsvp:${input.eventId}:yes`,
        label: "RSVP Yes",
        style: "success",
      },
      {
        customId: `rsvp:${input.eventId}:no`,
        label: "RSVP No",
        style: "danger",
      },
      {
        customId: `rsvp:${input.eventId}:maybe`,
        label: "RSVP Maybe",
        style: "secondary",
      },
      {
        customId: `view-event:${input.eventId}`,
        label: "View Event",
        style: "primary",
      },
    ],
    fields: [
      {
        label: "Operation Information",
        value: `${input.eventTypeLabel} / ${input.campaignTitle ?? "No linked deployment"}`,
      },
      {
        label: "Community Brief",
        value: input.tasking?.operationalSummary ?? `${input.eventTitle} is published for RSVP tracking.`,
      },
      {
        label: "Weekly Tasking",
        value: input.tasking
          ? `Week ${input.tasking.weekNumber}${input.tasking.commandersIntent ? ` / Intent: ${input.tasking.commandersIntent}` : ""}`
          : "Weekly tasking has not been published yet.",
      },
      {
        label: "Unit Taskings",
        value: input.tasking?.unitTaskings?.length
          ? input.tasking.unitTaskings
              .slice(0, 8)
              .map((tasking) => `${tasking.unitShortName}: ${tasking.primaryObjective ?? "Objective pending"}`)
              .join("\n")
          : "Unit tasking is pending.",
      },
      {
        label: "Timeline",
        value:
          input.tasking?.timeline ??
          `${formatDiscordTimestamp(input.startsAt)}${input.endsAt ? ` to ${formatDiscordTimestamp(input.endsAt)}` : ""}`,
      },
      {
        label: "Deployment Resources",
        value: input.resources?.length
          ? input.resources
              .slice(0, 6)
              .map((resource) => `${resource.label}: ${resource.url}`)
              .join("\n")
          : "No deployment resources are attached yet.",
      },
      {
        label: "Attendance / RSVP",
        value: `Host: ${input.hostUnitName ?? "Community-wide"} / Use the buttons below to RSVP.`,
      },
    ],
  } satisfies DiscordMessagePayload;
}

export function buildOperationsReleaseDiscordMessage(input: {
  actionUrl: string;
  campaignTitle: string;
  conopUrl?: string | null;
  endsAt?: Date | null;
  operationTitle?: string | null;
  releaseVersion: string;
  resources: Array<{
    label: string;
    url: string | null;
    versionLabel: string;
  }>;
  startsAt?: Date | null;
  summary: string;
  tasking?: {
    commandersIntent?: string | null;
    operationalSummary?: string | null;
    timeline?: string | null;
    unitTaskings?: Array<{
      primaryObjective?: string | null;
      secondaryObjective?: string | null;
      specialInstructions?: string | null;
      unitShortName: string;
    }>;
    weekNumber: number;
  } | null;
  weekNumber: number;
}) {
  return {
    ...buildBaseDiscordMessage({
      actionLabel: "Open Operations Package",
      actionUrl: input.actionUrl,
      footer: `Operations Release ${input.releaseVersion} / Portal remains the source of truth.`,
      summary: input.summary,
      title: "Operations Release",
    }),
    actions: [
      ...(input.operationTitle
        ? [
            {
              customId: `rsvp-release:${input.weekNumber}:yes`,
              label: "RSVP Yes",
              style: "success" as const,
            },
            {
              customId: `rsvp-release:${input.weekNumber}:no`,
              label: "RSVP No",
              style: "danger" as const,
            },
            {
              customId: `rsvp-release:${input.weekNumber}:maybe`,
              label: "RSVP Maybe",
              style: "secondary" as const,
            },
          ]
        : []),
      {
        label: "View Portal",
        style: "link",
        url: input.actionUrl,
      },
    ],
    fields: [
      {
        label: "Operation Header",
        value: `${input.campaignTitle} / Week ${input.weekNumber} / ${input.releaseVersion}`,
      },
      {
        label: "Date / Time",
        value:
          input.startsAt
            ? `${formatDiscordTimestamp(input.startsAt)}${input.endsAt ? ` to ${formatDiscordTimestamp(input.endsAt)}` : ""}`
            : "Weekend Operation time pending.",
      },
      {
        label: "Commander's Intent",
        value: input.tasking?.commandersIntent ?? "Intent pending.",
      },
      {
        label: "Tasking Summary",
        value: input.tasking?.operationalSummary ?? input.summary,
      },
      {
        label: "Unit Taskings",
        value: input.tasking?.unitTaskings?.length
          ? input.tasking.unitTaskings
              .slice(0, 8)
              .map((tasking) => `${tasking.unitShortName}: ${tasking.primaryObjective ?? "Objective pending"}`)
              .join("\n")
          : "Unit tasking is pending.",
      },
      {
        label: "Timeline",
        value: input.tasking?.timeline ?? "Timeline pending.",
      },
      {
        label: "Deployment Resources",
        value: input.resources.length
          ? input.resources
              .slice(0, 8)
              .map((resource) => `${resource.label} ${resource.versionLabel}: ${resource.url ?? "No link"}`)
              .join("\n")
          : "No deployment resources attached.",
      },
      {
        label: "CONOP",
        value: input.conopUrl ?? "No CONOP attached.",
      },
      {
        label: "Attendance / RSVP",
        value: input.operationTitle
          ? `RSVP for ${input.operationTitle} using the buttons below.`
          : "RSVP opens when the Weekend Operation is linked.",
      },
    ],
  } satisfies DiscordMessagePayload;
}

export function buildRsvpDiscordMessage(input: {
  eventTitle: string;
  rsvpWindowLabel: string;
  actionUrl?: string | null;
}) {
  return {
    ...buildBaseDiscordMessage({
      actionLabel: "Respond in Portal",
      actionUrl: input.actionUrl,
      summary: `RSVP tracking for ${input.eventTitle} is open through ${input.rsvpWindowLabel}.`,
      title: "RSVP Reminder",
    }),
    fields: [
      {
        label: "Response Options",
        value: "Yes, No, Maybe",
      },
    ],
  } satisfies DiscordMessagePayload;
}

export function buildPatrolAnnouncementDiscordMessage(input: {
  actionUrl: string;
  deploymentTitle?: string | null;
  description?: string | null;
  estimatedDurationLabel?: string | null;
  leaderName?: string | null;
  patrolId: string;
  patrolName: string;
  patrolTypeLabel?: string | null;
  startsAt: Date;
  voiceUrl?: string | null;
  weekNumber?: number | null;
}) {
  return {
    ...buildBaseDiscordMessage({
      actionLabel: "View Patrol",
      actionUrl: input.actionUrl,
      summary: `${input.patrolName} is starting now. RSVP means interested, not final attendance.`,
      title: "Patrol Starting",
    }),
    actions: [
      {
        customId: `patrol-rsvp:${input.patrolId}:interested`,
        label: "Interested",
        style: "success",
      },
      {
        customId: `view-patrol:${input.patrolId}`,
        label: "View Patrol",
        style: "primary",
      },
      ...(input.voiceUrl
        ? [
            {
              label: "Join Voice",
              style: "link" as const,
              url: input.voiceUrl,
            },
          ]
        : []),
    ],
    fields: [
      {
        label: "Patrol",
        value: `${input.patrolTypeLabel ?? "Patrol"} / ${input.leaderName ?? "Leader TBD"}`,
      },
      {
        label: "Deployment",
        value: `${input.deploymentTitle ?? "Current deployment"}${input.weekNumber ? ` / Week ${input.weekNumber}` : ""}`,
      },
      {
        label: "Start Time",
        value: formatDiscordTimestamp(input.startsAt),
      },
      {
        label: "Estimated Duration",
        value: input.estimatedDurationLabel ?? "Not specified",
      },
      {
        label: "Description",
        value: input.description ?? "No additional patrol description provided.",
      },
    ],
  } satisfies DiscordMessagePayload;
}

export function buildCampaignUpdateDiscordMessage(input: {
  campaignTitle: string;
  phaseLabel: string;
  actionUrl?: string | null;
}) {
  return buildBaseDiscordMessage({
    actionLabel: "Open Campaign",
    actionUrl: input.actionUrl,
      summary: `${input.campaignTitle} is currently in the ${input.phaseLabel} phase.`,
      title: "Deployment Update",
  });
}

export function buildQualificationNoticeDiscordMessage(input: {
  memberName: string;
  qualificationName: string;
  actionUrl?: string | null;
}) {
  return buildBaseDiscordMessage({
    actionLabel: "View Qualification",
    actionUrl: input.actionUrl,
    summary: `${input.memberName} has a qualification update for ${input.qualificationName}.`,
    title: "Qualification Notice",
  });
}

export function buildFormApplicationAlertDiscordMessage(input: {
  actionUrl?: string | null;
  submissionId?: string | null;
  statusLabel: string;
  summary: string;
  title: string;
}) {
  return {
    ...buildBaseDiscordMessage({
      actionLabel: "Review Submission",
      actionUrl: input.actionUrl,
      summary: input.summary,
      title: input.title,
    }),
    fields: [
      {
        label: "Workflow Status",
        value: input.statusLabel,
      },
    ],
    actions: [
      ...(input.submissionId
        ? [
            {
              customId: `application-review:open:${input.submissionId}`,
              label: "Open Application",
              style: "primary" as const,
            },
            {
              customId: `application-review:assign:${input.submissionId}`,
              label: "Assign to Me",
              style: "secondary" as const,
            },
            {
              customId: `application-review:request_information:${input.submissionId}`,
              label: "Request Info",
              style: "secondary" as const,
            },
            {
              customId: `application-review:approve:${input.submissionId}`,
              label: "Approve",
              style: "success" as const,
            },
            {
              customId: `application-review:deny:${input.submissionId}`,
              label: "Deny",
              style: "danger" as const,
            },
          ]
        : []),
    ],
    visibility: "staff",
  } satisfies DiscordMessagePayload;
}

export function buildAttendanceSummaryDiscordMessage(input: {
  actionUrl?: string | null;
  eventTitle: string;
  summary: string;
}) {
  return {
    ...buildBaseDiscordMessage({
      actionLabel: "Open Attendance",
      actionUrl: input.actionUrl,
      summary: input.summary,
      title: "Attendance Finalized",
    }),
    fields: [
      {
        label: "Event",
        value: input.eventTitle,
      },
    ],
    visibility: "staff",
  } satisfies DiscordMessagePayload;
}

export function buildStaffAlertDiscordMessage(input: {
  alertTitle: string;
  summary: string;
  actionUrl?: string | null;
}) {
  return {
    ...buildBaseDiscordMessage({
      actionLabel: "Review in Portal",
      actionUrl: input.actionUrl,
      summary: input.summary,
      title: input.alertTitle,
    }),
    visibility: "staff",
  } satisfies DiscordMessagePayload;
}
