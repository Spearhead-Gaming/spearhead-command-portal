# Discord Event Policies

`DiscordEventPolicy` configures event behavior per guild and event type.

## Defaults

- Integration disabled.
- Preview required.
- Manual approval required.
- Automatic creation disabled.
- Automatic updates disabled.
- Automatic cancellation disabled.
- Test mode enabled.
- Discord interest import disabled.

These defaults prevent accidental live multi-guild event creation.

## Configured Fields

- Entity type: External, Voice, or Stage.
- Discovered voice/stage channel.
- External location.
- Announcement and communication behavior.
- RSVP source behavior.
- Retention and conflict policy.
