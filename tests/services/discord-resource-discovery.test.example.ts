import { strictEqual, ok } from "node:assert";

import { buildDiscordDiscoveryDiffsForTest } from "@/server/discord/discovery";

const renamed = buildDiscordDiscoveryDiffsForTest({
  current: [{ id: "channel-1", name: "operations-updated" }],
  prior: [{ id: "channel-1", name: "operations" }],
  resourceType: "channel",
});

ok(renamed.some((diff) => diff.status === "Renamed"));

const missingMapped = buildDiscordDiscoveryDiffsForTest({
  activeMappings: [
    {
      id: "mapping-1",
      key: "events",
      resourceId: "channel-2",
      resourceType: "channel",
    },
  ],
  current: [],
  prior: [{ id: "channel-2", name: "events" }],
  resourceType: "channel",
});

strictEqual(missingMapped[0]?.status, "OrphanedMapping");
strictEqual(missingMapped[0]?.severity, "danger");

const recreatedWithSameName = buildDiscordDiscoveryDiffsForTest({
  current: [{ id: "role-new", name: "Zeus" }],
  prior: [{ id: "role-old", name: "Zeus" }],
  resourceType: "role",
});

ok(recreatedWithSameName.some((diff) => diff.status === "Added"));
ok(recreatedWithSameName.some((diff) => diff.status === "Missing"));
