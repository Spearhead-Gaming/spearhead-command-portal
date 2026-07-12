import {
  CURRENT_DISCORD_APPLICATION_TYPES,
  DISCORD_APPLICATION_CATALOG_DEFINITIONS,
  isDiscordApplicationTypeKey,
} from "@/server/discord/applications/catalog";

describe("discord application integration", () => {
  it("keeps current Discord application types limited to implemented Portal workflows", () => {
    expect(CURRENT_DISCORD_APPLICATION_TYPES).toEqual([
      "recruit_application",
      "rasp_application",
      "unit_transfer_request",
    ]);
  });

  it("keeps future application catalog entries disabled until Phase 5 providers exist", () => {
    const futureEntries = DISCORD_APPLICATION_CATALOG_DEFINITIONS.filter(
      (entry) => !CURRENT_DISCORD_APPLICATION_TYPES.includes(entry.applicationTypeKey),
    );

    expect(futureEntries.every((entry) => entry.enabled === false)).toBe(true);
  });

  it("rejects unknown application type keys", () => {
    expect(isDiscordApplicationTypeKey("rasp_application")).toBe(true);
    expect(isDiscordApplicationTypeKey("discord_only_application")).toBe(false);
  });
});
