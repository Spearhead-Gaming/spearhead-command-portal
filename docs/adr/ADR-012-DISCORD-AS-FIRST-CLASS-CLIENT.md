# ADR-012: Discord as First-Class Client

## Status

Accepted

## Context

Spearhead Gaming uses Discord heavily. Previous tools had poor reception partly because they required members to use yet another system for routine actions.

## Decision

Discord will be treated as a first-class client for the Spearhead Command Portal.

The bot will allow members and staff to perform quick actions from Discord while all authoritative data remains in the portal.

## Consequences

- Discord workflows must be documented and tested.
- Bot commands must use portal permissions.
- Discord interactions must never bypass audit/security rules.
- Channel mappings and delivery failures must be visible in the portal.
- Discord integration is core architecture, not an optional afterthought.
