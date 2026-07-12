# Discord Timeouts

Timeouts are case-backed Discord REST actions.

## Rules

- A timeout requires `discord.moderation.timeout`.
- A reason is required when guild policy requires reasons.
- Duration must be greater than zero.
- Duration must not exceed `DiscordModerationPolicy.timeoutMaxSeconds`.
- A timeout creates or attaches to a `CommunityCase`.
- The resulting `DiscordModerationAction` stores preview and policy snapshots.
- Removing a timeout uses the same permission and case-backed action model.

## Execution

The Portal calls Discord REST to update the guild member `communication_disabled_until` value.

Gateway observations may later confirm Discord-side timeout state, but Gateway does not execute the timeout.

## Approval

Guild policy can require no approval, single approval, dual approval, or command approval before timeout execution.
