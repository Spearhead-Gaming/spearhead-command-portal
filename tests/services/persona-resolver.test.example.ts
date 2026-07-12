import { describe, expect, it } from "vitest";

import type { PortalUser } from "@/features/auth/types";
import { resolveWorkspaceProfile } from "@/server/personas";

function userWithPermissions(keys: string[]): PortalUser {
  return {
    avatarUrl: null,
    callsign: null,
    discordId: "discord-user",
    discordLinked: true,
    displayName: "Example User",
    email: "example@spearhead.local",
    id: "user-id",
    memberProfileId: "profile-id",
    memberProfileLinked: true,
    permissionGrants: keys.map((key) => ({
      key,
      roleId: "role-id",
      roleLabel: "Example Role",
      unitId: null,
      unitName: null,
    })),
    permissions: keys,
    primaryRole: "Example Role",
    primaryUnitId: null,
    unit: null,
  };
}

describe("persona resolver", () => {
  it("keeps member workspace available for every authenticated user", () => {
    const profile = resolveWorkspaceProfile(userWithPermissions([]));

    expect(profile.workspaceOptions.map((workspace) => workspace.id)).toContain("my_portal");
  });

  it("does not allow an invalid selected workspace to become active", () => {
    const profile = resolveWorkspaceProfile(userWithPermissions(["s3.dashboard.view"]), "developer");

    expect(profile.selectedWorkspace.id).toBe("operations");
  });

  it("supports explicit developer workspace only with developer permissions", () => {
    const profile = resolveWorkspaceProfile(userWithPermissions(["builder.view"]), "developer");

    expect(profile.selectedWorkspace.id).toBe("developer");
  });
});
