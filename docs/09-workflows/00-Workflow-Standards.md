# Workflow Standards

## Purpose

This document defines the shared standards every workflow in `docs/09-workflows` follows. The goal is to keep workflows consistent enough for developers, administrators, reviewers, and AI assistants to reason about them without rediscovering project rules.

## Workflow Philosophy

- The portal is the source of truth.
- Discord is a first-class client, not an authoritative database.
- Manual portal workflows must work cleanly before automation is added.
- Permissions are checked by permission key, never by role name.
- Sensitive workflow actions are audited in domain services.
- Notifications and Discord failures must not roll back successful portal writes.
- Workflows should preserve user context through tables, inline actions, inspector drawers, and small modals before full-page navigation.

## Standard Workflow Sections

Every workflow document should include:

- Overview
- Purpose
- Business Rules
- Goals
- Actors
- Entry Points
- Exit Points
- UI Screens
- Inspector Drawers
- Modals
- Services Used
- Database Models
- Permission Keys
- Notification Events
- Discord Events
- Audit Events
- Automation Hooks
- Success State
- Failure States
- Recovery
- Future Enhancements
- Cross References

## State Transitions

State transitions should be explicit and table-driven.

| Column | Meaning |
| --- | --- |
| From | Starting state |
| To | Resulting state |
| Trigger | User, system, Discord, or scheduled action that moves the state |
| Permission Checkpoint | Permission key or system rule required before transition |
| Audit Event | Audit action written when the transition is sensitive |

State names should be short, user-readable, and consistent with seed data or service constants where possible.

## Actors

Actors should describe operational responsibility, not implementation classes.

Common actors:

- Member
- Recruit
- Unit Leadership
- S1 Staff
- S3 Staff
- Instructor
- Reviewer
- System Administrator
- Discord Bot
- Notification Service
- Domain Service

## Permissions

- List exact permission keys where known.
- Use the permission matrix naming pattern: `module.resource.action`.
- Never document role-name authorization as a requirement.
- Call out unit-scoped permission checks when the target resource belongs to a unit.
- UI checks may hide controls, but server-side checks are mandatory.

Primary reference: [PERMISSIONS_MATRIX.md](../01-architecture/PERMISSIONS_MATRIX.md).

## Notifications

Notification documentation should identify:

- Trigger event
- Recipients
- Portal delivery
- Discord channel or DM delivery when configured
- Retry behavior
- Whether failure blocks the workflow

Primary references: [NOTIFICATION_ARCHITECTURE.md](../01-architecture/NOTIFICATION_ARCHITECTURE.md), [NOTIFICATION_EVENT_CATALOG.md](../03-modules/NOTIFICATION_EVENT_CATALOG.md), [DELIVERY_AND_RETRY_STRATEGY.md](../01-architecture/DELIVERY_AND_RETRY_STRATEGY.md).

## Audit Logs

Audit logs are required for sensitive workflow changes.

Audit entries should include:

- Actor
- Action key
- Entity type
- Entity ID
- Summary
- Old value where useful
- New value where useful
- Reason where required
- Timestamp

Audit logging belongs in domain services, not UI components.

Primary reference: [AUDIT_LOGGING.md](../01-architecture/AUDIT_LOGGING.md).

## Discord Interactions

Every Discord command, button, select menu, or modal must:

1. Validate the Discord interaction signature.
2. Resolve the Discord user.
3. Find the linked portal user.
4. Find the linked member profile when required.
5. Check portal permissions and unit scope.
6. Call portal services.
7. Return safe public or ephemeral responses.
8. Record audit or delivery status where required.

Never guess Discord channels. Use channel mappings.

Primary references: [INTERACTION_FLOWS.md](../06-integrations/discord/INTERACTION_FLOWS.md), [CHANNEL_MAPPING_SPEC.md](../06-integrations/discord/CHANNEL_MAPPING_SPEC.md), [PERMISSIONS_AND_SECURITY.md](../06-integrations/discord/PERMISSIONS_AND_SECURITY.md).

## Database Updates

- Database writes should be performed through server services.
- Prisma access should remain under `src/server` service/query layers.
- Sensitive write plus audit write should be transactional where practical.
- Notification and Discord delivery should usually happen after the core domain write.
- Avoid hard-coding Spearhead units, channels, or role logic in code.

Primary references: [DATABASE_ARCHITECTURE.md](../01-architecture/DATABASE_ARCHITECTURE.md), [PRISMA_STANDARDS.md](../04-development/PRISMA_STANDARDS.md), [MARIADB_STANDARDS.md](../04-development/MARIADB_STANDARDS.md).

## Failure Handling And Recovery

| Failure | Expected Recovery |
| --- | --- |
| Missing permission | Block action and show forbidden state. |
| Validation failure | Preserve context and show field-level guidance. |
| Missing linked Discord user | Explain linking requirement ephemerally or in portal onboarding. |
| Missing channel mapping | Create failed delivery record; never guess a channel. |
| Discord API failure | Retry if recoverable; keep portal data unchanged. |
| Database failure | Roll back transaction and show safe error. |
| Stale action | Show current state and avoid duplicate writes. |

## Naming Standards

Use lowercase dot-separated event keys.

| Domain | Examples |
| --- | --- |
| Forms | `form.submitted`, `form.approved`, `form.denied` |
| Personnel | `personnel.profile_created`, `personnel.unit_changed` |
| Roster | `roster.assignment_changed`, `roster.transfer_approved` |
| Qualifications | `qualification.awarded`, `qualification.revoked` |
| Events | `event.published`, `event.reminder` |
| Attendance | `attendance.rsvp_changed`, `attendance.finalized` |
| Campaigns | `campaign.created`, `campaign.published` |
| S3 | `s3.mission_review_requested`, `s3.conop_published` |
| Documents | `document.published`, `document.archived` |
| Discord | `discord.delivery_failed`, `discord.role_sync_run` |
| Admin | `admin.permission_changed`, `admin.role_disabled` |

## Mermaid Diagram Standards

Each workflow should include multiple Mermaid diagrams:

- Flowchart for end-to-end workflow.
- Sequence diagram for actor/service/database interaction.
- State diagram for lifecycle state transitions.
- Relationship diagram when the workflow crosses several records or modules.
- Decision tree when approvals, branching, or failure recovery are central.

Use short labels. Keep diagrams readable in Markdown preview.

## Document Conventions

- Use ASCII-only Markdown unless a source document already requires otherwise.
- Prefer tables for permissions, events, states, and model references.
- Link to existing docs instead of restating field-level definitions.
- Keep workflow documents modular; do not bury unrelated workflows in one file.
- Update cross references when routes, services, models, or permission keys change.

## Future Expansion

When adding a workflow capability, update:

1. The relevant workflow file in this library.
2. The relevant module documentation.
3. Permission matrix if a new permission key is required.
4. Audit logging documentation if a new sensitive action exists.
5. Notification event catalog if a new event is emitted.
6. Discord integration docs if a new command, button, modal, or delivery route is added.

