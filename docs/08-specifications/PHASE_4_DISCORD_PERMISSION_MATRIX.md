# Phase 4 Discord Permission Matrix

## Rules

- Use Portal permission keys only.
- Never authorize by Discord role, channel access, Unit name, rank, or position.
- Read permissions and manage permissions must remain separate.

## Permission Families

| Family | Read | Manage / Execute |
| --- | --- | --- |
| Guilds | `discord.view`, `discord.guilds.health.view`, `discord.guilds.diagnostics.view` | `discord.servers.manage`, `discord.guilds.manage`, `discord.guilds.discover` |
| Channels | `discord.view` | `discord.channels.manage`, `discord.mappings.manage` |
| Roles | `discord.sync.view`, `discord.roles.view` | `discord.roles.manage`, `discord.sync.run` |
| Automation | `discord.automation.view`, `discord.automation.history.view` | `discord.automation.manage`, `discord.automation.preview`, `discord.automation.approve`, `discord.automation.execute` |
| Communications | `discord.communications.view`, `communications.delivery.view` | `discord.communications.manage`, `discord.notifications.send` |
| Events | `discord.events.view`, `discord.events.history.view` | `discord.events.manage`, `discord.events.preview`, `discord.events.publish`, `discord.events.cancel` |
| Moderation | `discord.moderation.view`, `discord.moderation.history.view` | `discord.moderation.warn`, `discord.moderation.timeout`, `discord.moderation.kick`, `discord.moderation.ban`, `discord.moderation.case.manage` |
| Applications | `discord.applications.view`, `discord.applications.catalog.view` | `discord.applications.manage`, `discord.applications.review.assign`, `discord.applications.review.approve`, `discord.applications.review.deny` |
| Diagnostics | `discord.bot.health.view`, `discord.applications.diagnostics.view` | `admin.discord.manage` |

## Audit Expectation

Manage and execute actions should create audit logs. Routine read-only diagnostics should not create noisy audit records.
