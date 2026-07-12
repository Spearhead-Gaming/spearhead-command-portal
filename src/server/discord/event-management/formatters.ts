import { getPortalBaseUrl } from "@/server/discord/config";

const MAX_DISCORD_EVENT_DESCRIPTION_LENGTH = 1000;

export function formatDiscordScheduledEventTitle(input: {
  title: string;
}) {
  return input.title.trim().slice(0, 100);
}

export function formatDiscordScheduledEventDescription(input: {
  campaignTitle?: string | null;
  description?: string | null;
  eventId: string;
  eventTypeLabel: string;
  hostUnitName?: string | null;
}) {
  const portalUrl = `${getPortalBaseUrl()}/operations/events/${input.eventId}`;
  const lines = [
    input.description?.trim() ?? `${input.eventTypeLabel} scheduled through the Spearhead Command Portal.`,
    input.hostUnitName ? `Host: ${input.hostUnitName}` : null,
    input.campaignTitle ? `Deployment: ${input.campaignTitle}` : null,
    `Portal: ${portalUrl}`,
  ].filter((line): line is string => Boolean(line));
  const description = lines.join("\n");

  if (description.length <= MAX_DISCORD_EVENT_DESCRIPTION_LENGTH) {
    return {
      description,
      truncated: false,
    };
  }

  return {
    description: `${description.slice(0, MAX_DISCORD_EVENT_DESCRIPTION_LENGTH - 24)}\n[Truncated in preview]`,
    truncated: true,
  };
}
