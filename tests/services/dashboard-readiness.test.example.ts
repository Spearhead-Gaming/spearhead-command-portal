import { describe, expect, it } from "vitest";

import { getReadinessTone } from "@/server/dashboard/readiness";

describe("dashboard readiness helpers", () => {
  it("maps high readiness to the success tone", () => {
    expect(getReadinessTone(92)).toBe("success");
  });

  it("maps missing data to the muted tone", () => {
    expect(getReadinessTone(null)).toBe("muted");
  });
});
