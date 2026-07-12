# Guild Configuration

Each managed guild has a `DiscordGuildConfiguration` row.

## Module Configuration

Modules are independently configurable:

- General
- Channels
- Roles
- Applications
- Qualifications
- Events
- Communications
- Moderation
- Automation
- Gateway
- Synchronization
- Diagnostics
- Feature Flags

## Defaults

Default configuration follows these guardrails:

- Portal is the source of truth.
- Channel mappings are explicit.
- Role mappings are explicit.
- Unmapped Discord roles are never modified.
- Discovery does not overwrite administrator configuration.
- Gateway is optional.
- Automation is scaffolded but disabled until a future Epic implements rules.

## Authorization

Guild configuration does not authorize users. Portal permissions remain authoritative.

Relevant permissions:

- `discord.guilds.manage`
- `discord.guilds.discover`
- `discord.guilds.health.view`
- `discord.guilds.diagnostics.view`
- `discord.guilds.audit.view`
- `discord.servers.manage`
- `discord.channels.manage`
- `discord.roles.manage`

Never authorize by Discord role, Discord guild type, unit name, or rank name.
