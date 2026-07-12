import { getModerationApprovalMode } from "@/server/discord/moderation/policy";

describe("Discord moderation platform examples", () => {
  it("uses policy approval mode for timeout actions", () => {
    const policy = {
      banApprovalMode: "command_approval",
      kickApprovalMode: "single_approval",
      timeoutApprovalMode: "dual_approval",
    };

    expect(getModerationApprovalMode({ action: "timeout", policy })).toBe("dual_approval");
    expect(getModerationApprovalMode({ action: "remove_timeout", policy })).toBe("dual_approval");
  });

  it("uses high-impact approval modes for kick and ban actions", () => {
    const policy = {
      banApprovalMode: "command_approval",
      kickApprovalMode: "single_approval",
      timeoutApprovalMode: "none",
    };

    expect(getModerationApprovalMode({ action: "kick", policy })).toBe("single_approval");
    expect(getModerationApprovalMode({ action: "ban", policy })).toBe("command_approval");
    expect(getModerationApprovalMode({ action: "unban", policy })).toBe("command_approval");
  });

  it("does not require Discord REST approval for Portal-owned warnings", () => {
    const policy = {
      banApprovalMode: "command_approval",
      kickApprovalMode: "single_approval",
      timeoutApprovalMode: "dual_approval",
    };

    expect(getModerationApprovalMode({ action: "warning", policy })).toBe("not_required");
    expect(getModerationApprovalMode({ action: "internal_note", policy })).toBe("not_required");
  });
});
