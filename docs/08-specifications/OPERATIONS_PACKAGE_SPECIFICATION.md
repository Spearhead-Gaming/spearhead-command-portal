# Operations Package Specification

## Summary

An Operations Package is the weekly planning workspace for a Deployment Week. It consolidates planning information, the linked Weekend Operation, Weekly Tasking, Unit Taskings, inherited Deployment Resources, CONOP, Zeus assignment, RSVP/attendance context, and activity history.

## Data Model

The portal reuses existing records:

- `DeploymentWeek` is the package anchor.
- `Event` stores the linked Weekend Operation through `campaignId` and `deploymentWeek`.
- `WeeklyTasking` stores week-level tasking for the linked operation.
- `UnitTasking` stores per-unit work for every active unit.
- `DeploymentResource` and `DeploymentResourceVersion` store inherited and week-specific resources, including CONOP.
- `Campaign` stores Deployment-level Zeus mode and assignment.
- `AuditLog` stores planning activity.
- `OperationsRelease` stores immutable release snapshots for published or scheduled packages.

No separate `OperationsPackage` table is required for Epic 5A, 5B, or 5C.

## Planning Status

Allowed planning states:

```text
planning
tasking
resources
review
```

These states represent planning progress only. They do not publish the package.

## Route

```text
/operations/packages/[campaignId]/week/[weekNumber]
```

Legacy `/operations/weekly-tasking` routes should send users back to the deployment planning surface.

## Required UI Sections

- Overview
- Planning
- Tasking
- Resources
- Attendance / RSVP
- Activity
- Phase boundary note for deferred publishing features

## Readiness Engine

Epic 5B adds a readiness and validation layer for Operations Packages.

Readiness answers:

```text
Is this operational package complete enough to proceed?
```

Readiness is split into:

- Operational Readiness: planning completeness and package skeleton validation.
- Publication Readiness: safety checks required before later preview/publishing workflows.

Each rule returns:

- id
- label
- description
- status: `PASS`, `WARNING`, `FAIL`, or `NOT_APPLICABLE`
- severity
- category
- message
- recommended action
- related entity type
- related entity id

Scores are derived from rule results and expose percentage, label, blocking issue count, warning count, completed checks, and total checks.

Publication readiness does not publish anything in Epic 5B. It only determines whether the package is blocked, incomplete, needs attention, or ready for the future Epic 5C preview/publish workflow.

## Go / No-Go Board

The Go / No-Go Board displays:

- Operational Readiness score
- Publication Readiness score
- Blocking issues
- Warnings
- Completed checks
- Recommended actions
- Last evaluated timestamp

Actions may link back to planning, tasking, resources, CONOP, and Zeus assignment areas. Continue to Preview and Publish remain disabled placeholders until Epic 5C.

## Operations Release

Epic 5C adds Operations Releases.

Publishing an Operations Package creates an `OperationsRelease` record containing:

- Release Version
- Published By
- Published Time
- Package Snapshot
- Release Notes
- Amendment Summary
- Discord Message ID
- Discord Channel ID
- Discord Delivery ID
- Discord Status
- Release Status

The snapshot preserves historical context and must not rely only on mutable planning records.

Supported release states:

```text
draft
ready_for_review
approved
scheduled
published
superseded
archived
```

Only one published release should be active for a Deployment Week. Publishing a new release supersedes the previous published release after Discord delivery succeeds.

## Release Versioning

Release versions use lightweight semantic numbering.

Examples:

```text
v1.0
v1.1
v1.2
v2.0
```

The first release starts at `v1.0`. Amendments usually increment the minor version. Major changes can increment the major version.

## Publish Preview

The publish preview should render close to the Discord announcement and include:

- Operation Header
- Deployment
- Operational Week
- Date and Time
- Commander's Intent
- Tasking
- Unit Taskings
- Deployment Resources
- CONOP
- OPORD
- Player Primer
- Current Mod Preset
- RSVP
- Footer

## Scheduling

Scheduling is architecture-only until a scheduler/worker exists. A scheduled release records `scheduled` status and `scheduledFor`, but no fake execution should occur.

## Operational Health Engine

Epic 5D adds Operational Health.

Operational Health asks:

```text
How healthy is the current Deployment?
```

It is separate from Operational Readiness, Publication Readiness, and later Command Decision Support. Health is execution assessment. Readiness is planning/publication validation.

Operational Health is provider-based. Registered providers return standardized `HealthRuleResult` objects, and the service derives category scores, overall score, status labels, trend, warnings, critical issues, and recommended actions.

Initial categories:

- Planning Health.
- Execution Health.
- Community Health.

Future modules should be able to contribute providers without modifying Command Dashboard UI or the core scoring contract.

## Command Decision Support

Epic 5E adds Command Decision Support.

The CDSS consumes Rule Engine, Operational Health, Operational Readiness, Publication Readiness, patrol/AAR, attendance, resource, and future provider evidence to generate persistent recommendations.

Recommendations are informational. They do not approve, publish, assign, or modify operational data automatically.

Operations Packages may also store Commander's Intent planning context:

- Commander's Intent.
- Commander End State.
- Success Criteria.
- Failure Conditions.

After execution and Patrol AAR review, staff can record a human-authored Commander Intent Assessment with status, supporting evidence, lessons learned, and next-week recommendations.

## Permissions

- `operations.package.view`
- `operations.package.edit`
- `operations.package.review`
- `operations.package.approve`
- `operations.package.publish`
- `operations.planning.view`
- `operations.planning.edit`
- `operations.readiness.view`
- `operations.readiness.evaluate`
- `operations.health.view`
- `operations.health.manage`
- `recommendations.view`
- `recommendations.manage`
- `operations.command.view`
- `operations.command.manage`
- `operations.release.view`
- `operations.release.publish`
- `operations.release.history`
- `operations.tasking.manage`
- `operations.resources.manage`
- `operations.zeus.assign`

Existing deployment resource permissions still govern resource upload, edit, and archive behavior.

## Service Boundary

Operations Package logic should be centralized behind `OperationsPackageService` in `src/server/operations-package/service.ts`.

The service owns package lookup/creation, planning updates, Weekly Tasking updates, Unit Tasking updates, resource/CONOP association boundaries, Zeus assignment boundaries, planning progress calculation, package activity lookup, skeleton validation, readiness evaluation, Go/No-Go summaries, operational health evaluation, CDSS recommendations, commander dashboard summaries, intent assessment updates, release preview generation, publication validation, release creation, amendment publishing, release history, audit logging, and permission checks.

UI components, server actions, route handlers, Discord handlers, and future automation should call this service instead of duplicating Operations Package planning logic.

## Out of Scope Until Later Epic 5 Phases

- Commander's Intent assessment
- Decision Support
