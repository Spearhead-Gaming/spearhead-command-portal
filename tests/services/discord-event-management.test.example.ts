import { formatDiscordScheduledEventDescription, formatDiscordScheduledEventTitle } from "@/server/discord/event-management/formatters";
import { validateDiscordEventTarget } from "@/server/discord/event-management/validator";

describe("Discord Event Management examples", () => {
  it("keeps Discord titles length-safe", () => {
    expect(formatDiscordScheduledEventTitle({ title: "A".repeat(140) })).toHaveLength(100);
  });

  it("truncates long descriptions before preview or publish", () => {
    const result = formatDiscordScheduledEventDescription({
      description: "A".repeat(1200),
      eventId: "event-1",
      eventTypeLabel: "Weekend Operation",
    });

    expect(result.truncated).toBe(true);
    expect(result.description.length).toBeLessThanOrEqual(1000);
  });

  it("blocks voice events without a discovered channel", () => {
    const result = validateDiscordEventTarget({
      channels: [],
      policy: {
        archivedAt: null,
        announcementBehavior: "communication_pipeline",
        automaticCancellation: false,
        automaticCreation: false,
        automaticUpdates: false,
        communicationDomain: null,
        conflictPolicy: "manual_review",
        createdAt: new Date(),
        defaultChannelId: null,
        defaultEntityType: "voice",
        defaultExternalLocation: null,
        discordServerId: "server-1",
        eventImagePolicy: "none",
        eventType: "training",
        guildId: "guild-1",
        id: "policy-1",
        importDiscordEventStatus: false,
        importDiscordInterest: false,
        integrationEnabled: true,
        manualApprovalRequired: true,
        previewRequired: true,
        retentionPolicy: "preserve_history",
        rsvpSourceBehavior: "portal_rsvp_authoritative",
        testMode: true,
        updatedAt: new Date(),
      },
      startsAt: new Date(),
    });

    expect(result.validationStatus).toBe("blocked");
  });
});
