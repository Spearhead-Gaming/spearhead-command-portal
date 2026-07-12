# Communication Routing Engine

## Purpose

The routing engine resolves a communication event into concrete guild/channel delivery targets.

Input:

- domain.
- communication type.
- audience.
- optional guild routing targets.
- template key and variables.
- related entity context.

Output:

- resolved guilds.
- resolved channel mappings.
- warnings.
- requested delivery channels for the unified communication pipeline.

## Guild Targets

Supported initial routing targets:

- primary community guild.
- all active guilds.
- specific unit guilds.
- specific guild IDs.

Default routing is conservative. Sensitive domains such as moderation, administration, developer, health, diagnostics, and applications route to the primary community/staff configuration unless explicitly expanded.

## Channel Resolution

The engine resolves:

Communication domain

Guild

Configured domain mapping or default mapping key

Active `DiscordChannelMapping`

Delivery request with mapping ID

Missing mappings create warnings and should generate recommendations.

## Configuration

Guild-specific domain overrides may be stored in `DiscordGuildConfiguration.communicationConfig`:

```json
{
  "domainMappings": {
    "patrols": "patrols",
    "operational_releases": "campaign-updates",
    "moderation": "staff-alerts"
  }
}
```

Discord channel names are never canonical.

