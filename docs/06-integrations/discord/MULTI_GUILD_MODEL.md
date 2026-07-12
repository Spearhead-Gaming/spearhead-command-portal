# Multi-Guild Model

## Managed Guild

`DiscordServer` is the canonical managed guild entity.

It stores:

- Discord guild ID
- display name and short name
- description
- guild type
- primary community flag
- active/archived state
- icon and invite URL
- timezone and locale
- status
- REST, Gateway, and Interaction status
- last sync and last discovery timestamps

## Guild Types

Supported initial types:

- `community`
- `unit`
- `command`
- `staff`
- `training`
- `development`
- `testing`
- `other`

Types set operational defaults only. They do not authorize access.

## Configuration

`DiscordGuildConfiguration` stores module-specific settings:

- general
- channels
- roles
- applications
- qualifications
- events
- communications
- moderation
- automation
- gateway
- synchronization
- diagnostics
- feature flags

## Inventory

`DiscordGuildChannel` and `DiscordGuildRole` store discovered Discord inventory independently from mappings.

Inventory is reference data. Administrator mappings still decide which channels and roles the portal may use.

## Soft Delete

Guilds should be disabled or archived. Historical records should not be hard-deleted because sync logs, delivery records, audit logs, and member state depend on them.
