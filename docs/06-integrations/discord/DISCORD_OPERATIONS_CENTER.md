# Discord Operations Center

The Discord Operations Center is the primary administrator workspace for all connected Discord guilds.

## Route

`/administration/discord`

## Purpose

The workspace centralizes:

- guild health
- guild directory
- channel inventory
- role inventory
- communication routing
- Gateway status
- synchronization state
- diagnostics
- recommendations
- audit context

Discord remains a managed external platform. The Portal remains the source of truth.

## Layout

Top-level sections:

- Overview
- Guilds
- Reconciliation
- Communications
- Gateway
- Automation
- Applications
- Moderation
- Diagnostics
- Audit
- Settings

Overview should answer:

- How healthy is Discord?
- How many guilds are connected?
- Are there failed deliveries?
- Is Gateway connected?
- Is REST healthy?
- Is the interaction endpoint healthy?
- Are syncs failing or stale?
- What should an administrator do next?

## Progressive Disclosure

The Operations Center shows summaries by default. Detailed configuration, inventory, and logs are available through the guild inspector and lower drill-down sections.

## Phase 4 Resource Discovery

The Operations Center exposes full discovery, targeted discovery, and dry-run discovery controls. Reconciliation items are shown as a collapsible operations section so administrators can review drift without losing guild context.

The guild inspector includes channels, roles, scheduled events, emoji/stickers, communication mappings, synchronization, discovery history, and reconciliation tabs.

## Moderation Dashboard

Phase 4 adds a case-backed Discord Moderation Dashboard. It summarizes open moderation cases, pending approvals, warnings, active timeouts, active bans, appeals, failures, policies, recent actions, and Gateway observations.

Moderation actions remain owned by Community Cases. The Operations Center is an operator view, not a separate moderation database.
# Event Management

The Discord Operations Center includes Event Management health for policies, links, drift, executions, and participation observations. This surface is read-oriented until live approval workflows are explicitly enabled.

# Application Integration

The Operations Center includes Application Integration diagnostics for Discord-backed application entry points. This section shows catalog entries, guild policies, active sessions, expired continuation tokens, pending Portal reviews, and review-message records.

Discord application diagnostics are administrative visibility only. The Portal remains authoritative for application definitions, answers, statuses, review decisions, personnel changes, and audit history.
