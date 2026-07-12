import { getPreferredMemberDisplayName } from "@/server/personnel/display-name";

describe("getPreferredMemberDisplayName", () => {
  it("uses Discord display name before profile, username, email, or unknown fallback", () => {
    expect(
      getPreferredMemberDisplayName({
        discordDisplayName: "SpearheadDisplay",
        profileDisplayName: "Portal Name",
        discordUsername: "discord_user",
        email: "member@example.com",
      }),
    ).toBe("SpearheadDisplay");
  });

  it("does not require first or last name", () => {
    expect(
      getPreferredMemberDisplayName({
        discordDisplayName: null,
        profileDisplayName: null,
        discordUsername: null,
        email: null,
      }),
    ).toBe("Unknown Member");
  });
});
