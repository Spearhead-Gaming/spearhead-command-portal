import assert from "node:assert/strict";

type ManagedGuild = {
  archivedAt: Date | null;
  guildId: string;
  guildType: string;
  isPrimary: boolean;
};

function findPrimaryGuild(guilds: ManagedGuild[]) {
  return guilds.find((guild) => guild.isPrimary && !guild.archivedAt) ?? null;
}

function hasDuplicateGuildIds(guilds: ManagedGuild[]) {
  return new Set(guilds.map((guild) => guild.guildId)).size !== guilds.length;
}

function guildTypeGrantsPermission() {
  return false;
}

// Example contract tests for Phase 4 once the repository adopts a real test runner.
const guilds: ManagedGuild[] = [
  {
    archivedAt: null,
    guildId: "111111111111111111",
    guildType: "community",
    isPrimary: true,
  },
  {
    archivedAt: null,
    guildId: "222222222222222222",
    guildType: "unit",
    isPrimary: false,
  },
];

assert.equal(findPrimaryGuild(guilds)?.guildId, "111111111111111111");
assert.equal(hasDuplicateGuildIds(guilds), false);
assert.equal(guildTypeGrantsPermission(), false);
