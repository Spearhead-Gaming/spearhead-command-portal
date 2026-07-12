# Moderation Workflow

## Purpose

Moderation is one part of community management. Moderation actions should be requested, previewed, policy-checked, recorded, executed, and audited through the portal.

The Portal is authoritative for moderation records. Discord is only the enforcement surface.

## Flow

1. Staff opens or creates a moderation case.
2. Staff records evidence and reason.
3. Staff previews a moderation action against the target guild policy.
4. Policy validates permission, reason, evidence expectations, approval mode, and cross-guild behavior.
5. Staff records a Portal-owned warning/note or requests Discord REST enforcement.
6. Policy-gated actions create approval records before execution.
7. Discord REST executes timeout, remove timeout, kick, ban, or unban after validation.
8. Gateway observations may verify Discord-side state.
9. Result is added to the case timeline and audit log.
10. Communication uses the Unified Communication Pipeline where notice is required.

## Supported Execution

Supported Portal-owned actions:

- warning
- internal note
- appeal review
- evidence
- moderator discussion

Supported Discord REST enforcement when bot credentials and permissions are configured:

- timeout
- remove timeout
- kick
- ban
- unban

## Cross-Guild Moderation

Cross-guild moderation is policy-driven. Related guilds may show recommendations or staff notifications, but enforcement must never be mirrored automatically unless an explicit future policy mode safely supports it.
