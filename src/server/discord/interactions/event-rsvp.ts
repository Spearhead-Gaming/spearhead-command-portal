import { can } from "@/server/permissions/access";
import { getPortalBaseUrl } from "@/server/discord/config";
import { getPortalUserByDiscordId } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { updateRsvpFromDiscord } from "@/server/attendance/service";
import { isRsvpStatus } from "@/server/events/utils";

function buildEphemeralInteractionResponse(content: string) {
  return Response.json({
    data: {
      content,
      flags: 64,
    },
    type: 4,
  });
}

async function getEventForInteraction(eventId: string) {
  return prisma.event.findUnique({
    where: {
      id: eventId,
    },
    include: {
      hostUnit: true,
    },
  });
}

export async function handleDiscordRsvpInteraction(input: {
  customId: string;
  discordUserId: string;
}) {
  const [, eventId, rsvpStatus] = input.customId.split(":");

  if (!eventId || !rsvpStatus || !isRsvpStatus(rsvpStatus)) {
    return buildEphemeralInteractionResponse("That RSVP action is invalid or expired.");
  }

  try {
    const result = await updateRsvpFromDiscord({
      discordUserId: input.discordUserId,
      eventId,
      reason: "RSVP updated from Discord event announcement.",
      rsvpStatus,
    });

    return buildEphemeralInteractionResponse(
      `Your RSVP for ${result.event.title} is now ${rsvpStatus.toUpperCase()}. The portal attendance record has been updated.`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Your RSVP could not be updated right now.";

    return buildEphemeralInteractionResponse(message);
  }
}

export async function handleDiscordViewEventInteraction(input: {
  customId: string;
  discordUserId: string;
}) {
  const [, eventId] = input.customId.split(":");

  if (!eventId) {
    return buildEphemeralInteractionResponse("That event link is invalid or expired.");
  }

  const [user, event] = await Promise.all([
    getPortalUserByDiscordId(input.discordUserId),
    getEventForInteraction(eventId),
  ]);

  if (!user) {
    return buildEphemeralInteractionResponse(
      "Your Discord account is not linked to a portal user yet.",
    );
  }

  if (!event) {
    return buildEphemeralInteractionResponse("That event could not be found.");
  }

  const eventScope = event.hostUnitId ? { unitId: event.hostUnitId } : undefined;

  if (!can(user, "events.view", eventScope) && !can(user, "events.view")) {
    return buildEphemeralInteractionResponse(
      "You do not have permission to view that event in the portal.",
    );
  }

  return buildEphemeralInteractionResponse(
    `Open ${event.title} in the portal: ${getPortalBaseUrl()}/operations/events/${event.id}`,
  );
}
