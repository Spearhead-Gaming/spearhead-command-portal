# Phase 4 Discord Platform Validation

## Readiness Decision

Status: Ready with non-blocking issues after local validation, pending controlled live Discord validation.

Phase 4 is functionally consolidated in the Portal, but production rollout still requires test-guild certification, command registration, review of channel and role mappings, and Plesk process validation.

## Platform Layers

| Layer | Purpose | Source of Truth |
| --- | --- | --- |
| OAuth | Login and identity linking | Portal User and Account records |
| Interaction Webhook | Slash commands, buttons, modals, select menus | Portal handlers and services |
| Discord REST | Messages, command registration, roles, events, moderation | Portal service requests |
| Discord Gateway | Real-time observation and continuation support | Discord observations only |
| Portal Discord Platform | Guild config, mappings, automation, diagnostics, audit | Portal database |

## Local Validation Evidence

- `npm run prisma:validate` should pass.
- `npm run lint` should pass.
- `npm run typecheck` should pass.
- `npm run build` should pass.
- `npm run discord:platform:preflight` produces the consolidated readiness view.

## Release Blocker Policy

Phase 4 is not ready if any of these are unresolved:

- interaction signatures cannot be validated
- exact Discord ID duplicates exist
- no active Primary Community Guild exists
- more than one active Primary Community Guild exists
- enabled role automation has no explicit role mappings
- build, lint, or typecheck fails
- Discord roles grant Portal permissions
- Gateway is required for slash commands

## Known Validation Boundary

This document records local and static validation. Live Discord validation must be performed in a safe test guild before enabling production automation.
