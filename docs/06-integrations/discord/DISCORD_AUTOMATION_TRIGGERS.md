# Discord Automation Triggers

## Supported Initial Triggers

Qualification:

- `qualification.awarded`
- `qualification.renewed`
- `qualification.revoked`
- `qualification.expired`
- `qualification.reinstated`

Personnel:

- `personnel.unit_assigned`
- `personnel.unit_removed`
- `personnel.position_assigned`
- `personnel.position_removed`
- `personnel.status_changed`

Discord membership:

- `discord.member_joined`
- `discord.member_left`

Manual:

- `discord.manual_sync`

## Trigger Ownership

Portal services own trigger emission. Discord handlers may collect input, but they must call Portal services instead of mutating Discord state directly.

## Trigger Payload

A source event should include:

- actor user ID when available.
- member profile ID.
- trigger type.
- source domain.
- source entity type and ID.

The engine uses this payload to find definitions, calculate idempotency, and create audit logs.

