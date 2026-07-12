# Discord Application Security

## Identity

Discord ID is the canonical external identity. Application commands must resolve the caller through Portal identity linking before member-only workflows continue.

## Authorization

Use permission keys only. Never authorize by Discord role name, guild membership, channel access, unit name, or rank.

## Continuation Links

- Signed with the Portal auth secret.
- Bound to Discord user, session, application type, and expiration.
- Stored as hashes only.
- Invalid after use or expiration.

## Review Safety

Discord review actions must not bypass Portal status checks, permission checks, or decision reason requirements.
