import { gatewayIntentFeatureMatrix } from "@/server/discord/gateway/intents";

describe("Discord Gateway Event Platform examples", () => {
  it("documents that MessageContent is disabled by default", () => {
    const messageContent = gatewayIntentFeatureMatrix.find((intent) => intent.intent === "MessageContent");

    expect(messageContent?.defaultEnabled).toBe(false);
    expect(messageContent?.privileged).toBe(true);
  });

  it("documents that scheduled event observation has a dedicated intent", () => {
    const scheduledEvents = gatewayIntentFeatureMatrix.find((intent) => intent.intent === "GuildScheduledEvents");

    expect(scheduledEvents?.features).toContain("External scheduled event observation");
  });
});
