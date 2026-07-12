# Discord Automation Engine

## Purpose

The Discord Automation Engine converts approved Portal events into controlled Discord actions. The Portal remains authoritative; Discord roles, nicknames, and messages are automation targets only.

The first production use case is Discord role automation for qualification, unit, position, member-status, guild-membership, and manual-sync events.

## Safety Defaults

New automation definitions must default to `preview_only` or `manual_approval`.

Role-changing automation must not default to `automatic`. Automatic execution is reserved for future, explicitly approved low-risk workflows after validation and monitoring are mature.

## Domain Boundary

Implementation lives under `src/server/discord/automation`.

- `service.ts` owns planning, validation, approval, execution, retry, desired-state tracking, and audit logging.
- `role-actions.ts` owns Discord REST role add/remove/current-state helpers.
- `queries.ts` owns admin overview data.
- `actions.ts` exposes server actions for admin UI.
- `rules.ts` exposes rule/recommendation-provider checks.
- `constants.ts` and `types.ts` define supported triggers, modes, actions, statuses, and payload contracts.

UI components should call server actions or queries. UI must not decide role state directly.

## Data Model

Core models:

- `DiscordAutomationDefinition`: reusable automation definition, trigger, conditions, action payload, execution mode.
- `DiscordAutomationExecution`: one planned run for one source event and member.
- `DiscordAutomationActionExecution`: individual Discord action result.
- `DiscordManagedRoleAssignment`: desired-state record for portal-managed Discord roles.
- `DiscordAutomationApproval`: approval or rejection record for manual workflows.
- `DiscordAutomationException`: scoped suppression or safety exception.
- `DiscordAutomationConflict`: explicit conflict record for competing definitions.
- `DiscordRoleDrift`: observed desired-state mismatch.
- `DiscordAutomationRetry`: bounded retry history.
- `DiscordAutomationRollback`: explicit compensation record.

## Event Flow

1. A Portal service emits a source event, such as `qualification.awarded`.
2. The engine finds matching active definitions.
3. The engine creates a plan and validates target guild, role, member, mapping, exceptions, and idempotency.
4. The engine creates an execution and action rows.
5. Preview-only executions stop at planning.
6. Manual-approval executions wait for an authorized approver.
7. Approved executions call Discord REST helpers.
8. Results update desired state, audit logs, reconciliation records, and notification hooks.

## Current Trigger Families

- Qualification role automation.
- Unit role automation.
- Position role automation foundation.
- Member status role automation foundation.
- Guild join/leave role automation foundation.
- Manual role sync foundation.

## Non-Goals

- Discord roles do not grant Portal permissions.
- Discord names are not canonical for mapping.
- The engine does not infer or guess unmapped roles.
- The engine does not delete Portal history.
- The engine does not make Discord the source of truth.

