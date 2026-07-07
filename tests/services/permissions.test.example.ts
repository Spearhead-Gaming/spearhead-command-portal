import { describe, expect, it } from "vitest";

import { can } from "@/server/permissions";

describe("permission helpers", () => {
  it("authorizes by permission key, not role name", () => {
    expect(
      can(
        {
          permissionGrants: [{ key: "admin.users.view", unitId: null }],
        },
        "admin.users.view",
      ),
    ).toBe(true);
  });

  it("respects unit scope when provided", () => {
    expect(
      can(
        {
          permissionGrants: [{ key: "roster.member.edit", unitId: "unit-a" }],
        },
        "roster.member.edit",
        { unitId: "unit-b" },
      ),
    ).toBe(false);
  });
});
