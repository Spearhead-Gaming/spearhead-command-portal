# Discord Moderation

## Purpose

Discord moderation actions initiated by staff are requested, previewed, policy-checked, executed, and recorded through the portal.

The Portal is authoritative for moderation history. Discord is only the enforcement platform.

## Rules

- Portal permissions are authoritative.
- Discord roles alone never authorize moderation.
- A reason is required.
- A target Discord server is required.
- Discord hierarchy and bot permission failures must be preserved as failed actions.
- Do not mark an action successful unless Discord confirms success.
- Every moderation action must create or attach to a Community Case.
- Case timeline and audit history should record the outcome.
- Gateway may observe moderation state, but Gateway must not execute punishment.
- Discord REST performs timeout, kick, ban, and unban after validation.

## Supported Actions

Current executable support:

- warning
- internal note
- timeout
- remove timeout
- kick
- ban
- unban

Case-owned support:

- appeals
- evidence
- moderator discussion
- cross-guild recommendations
- approval records

See also:

- [Discord Moderation Platform](DISCORD_MODERATION_PLATFORM.md)
- [Discord Timeouts](DISCORD_TIMEOUTS.md)
- [Discord Bans](DISCORD_BANS.md)
- [Discord Warnings](DISCORD_WARNINGS.md)
- [Discord Appeals](DISCORD_APPEALS.md)
- [Discord Cross-Guild Moderation](DISCORD_CROSS_GUILD_MODERATION.md)
- [Discord Moderation Policies](DISCORD_MODERATION_POLICIES.md)
