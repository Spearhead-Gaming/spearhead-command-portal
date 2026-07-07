# ADR-010: Component-Driven UI

## Status

Accepted

## Context

The Spearhead Command Portal will include many related screens: roster, profiles, qualifications, units, events, campaigns, documents, Discord settings, and administration.

Without a component system, pages will become inconsistent and harder to maintain.

## Decision

The portal will use a component-driven UI architecture.

Reusable components will be defined for layout, dashboards, data tables, identity, badges, inspector drawers, timelines, command palette, operations, training, Discord, and feedback.

## Consequences

- Pages will be faster to build.
- Codex should reuse components instead of generating one-off layouts.
- UI behavior will be more consistent.
- Future modules can adopt the same patterns.
- Component quality becomes important early in the project.
