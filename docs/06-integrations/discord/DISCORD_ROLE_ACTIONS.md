# Discord Role Actions

## Supported Actions

Initial role actions are intentionally small:

- `add_role`
- `remove_role`
- `replace_role`
- `sync_managed_roles`

The current production executor implements add/remove semantics and desired-state tracking. Replace and full sync are modeled for follow-up work and must use the same planner, validator, approval, audit, and retry path.

## Role Identity

Discord role IDs are canonical. Role names are display metadata only.

Automation must use discovered `DiscordGuildRole.discordRoleId` or administrator-created `DiscordRoleMapping.discordRoleId`. It must never resolve a role by name during execution.

## Execution Rules

- Check current member role state before changing roles.
- Treat already-present add actions and already-absent remove actions as `no_change`.
- Only touch explicitly mapped or portal-managed roles.
- Never modify unmapped Discord roles.
- Record desired state in `DiscordManagedRoleAssignment`.
- Record failed actions without rolling back Portal domain changes.

## Bot Requirements

The Discord bot must have `Manage Roles` and must be higher than the target role in Discord role hierarchy. The engine records hierarchy and permission validation warnings where inventory is available, but live Discord configuration must still be tested in a development guild.

