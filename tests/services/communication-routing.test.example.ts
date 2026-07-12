import assert from "node:assert/strict";

type GuildRoute = {
  guildId: string;
  mappingKey: string | null;
  routeStatus: "resolved" | "missing_mapping";
};

function routeDomainToGuilds(input: {
  defaultMappingKey: string;
  guilds: Array<{ guildId: string; mappings: string[] }>;
}) {
  return input.guilds.map<GuildRoute>((guild) => ({
    guildId: guild.guildId,
    mappingKey: guild.mappings.includes(input.defaultMappingKey) ? input.defaultMappingKey : null,
    routeStatus: guild.mappings.includes(input.defaultMappingKey) ? "resolved" : "missing_mapping",
  }));
}

function allGuildDeliveriesAreIndependent(routes: GuildRoute[]) {
  return routes.some((route) => route.routeStatus === "resolved") &&
    routes.some((route) => route.routeStatus === "missing_mapping");
}

const routes = routeDomainToGuilds({
  defaultMappingKey: "patrols",
  guilds: [
    { guildId: "community", mappings: ["patrols", "events"] },
    { guildId: "unit-alpha", mappings: ["events"] },
  ],
});

assert.equal(routes[0]?.routeStatus, "resolved");
assert.equal(routes[1]?.routeStatus, "missing_mapping");
assert.equal(allGuildDeliveriesAreIndependent(routes), true);

