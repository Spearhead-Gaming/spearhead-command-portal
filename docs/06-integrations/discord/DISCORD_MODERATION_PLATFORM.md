# Discord Moderation Platform

## Purpose

The Discord Moderation Platform gives staff a case-backed way to warn, note, timeout, kick, ban, unban, and review appeals across managed Discord guilds.

The Portal is authoritative. Discord is only the enforcement surface.

## Architecture

Moderation follows this flow:

1. Moderator requests an action in the Portal.
2. The moderation service creates or attaches to a `CommunityCase`.
3. The service validates Portal permissions and guild policy.
4. Staff preview the expected Discord outcome.
5. Policy may require approval before execution.
6. Discord REST executes timeout, kick, ban, or unban actions.
7. Gateway observations record Discord-side state changes.
8. Audit, case timeline, communications, rules, and recommendations preserve history.

No Discord moderation action should exist without case context.

## Case Integration

Every `DiscordModerationAction` references a `CommunityCase`.

Case history owns:

- warnings
- moderator notes
- evidence
- appeals
- action history
- policy snapshots
- execution results
- Gateway observations

Discord never owns moderation history.

## Guild Policy

Each `DiscordServer` can have one `DiscordModerationPolicy`.

Policies control:

- enabled actions
- timeout maximum
- kick approval mode
- ban approval mode
- appeal support
- evidence requirements
- reason requirements
- moderator notifications
- cross-guild behavior
- retention guidance

Policies are independent per guild. Primary community guild settings do not automatically apply to unit guilds.

## Preview And Approval

Moderation preview returns:

- target guild
- target Discord user
- action
- reason
- policy warnings
- blocking validation issues
- required approval mode
- expected result

If policy requires approval, the request creates a `DiscordModerationApproval` and does not execute Discord REST until approved by future workflow code.

## Permissions

Use Portal permissions only:

- `discord.moderation.view`
- `discord.moderation.warn`
- `discord.moderation.timeout`
- `discord.moderation.kick`
- `discord.moderation.ban`
- `discord.moderation.appeals`
- `discord.moderation.policy.manage`
- `discord.moderation.case.manage`
- `discord.moderation.history.view`

Discord roles never grant Portal moderation authority.

## Rule And Recommendation Integration

The moderation rule provider surfaces:

- failed moderation execution
- pending approvals
- appeal backlog

Recommendations are advisory. The Portal must never auto-ban, auto-kick, or automatically mirror punishment across guilds without explicit policy and staff action.

## Operations Center

`/administration/discord` includes a Moderation Dashboard with:

- open cases
- pending approvals
- warnings
- active timeouts
- active bans
- appeals
- failures
- policies
- recent actions
- Gateway observations

## Limitations

This phase establishes the platform boundary. Future work should add rich approval review screens, full appeal handling, and deeper Gateway ban/timeout reconciliation.
