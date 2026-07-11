# Operations Readiness Workflow

## Purpose

Operations Readiness evaluates whether an Operations Package is complete enough to proceed toward review and later publication.

Readiness rules are evaluated through the Universal Rule Engine. Operational Readiness and Publication Readiness are domain consumers of generic rule providers, not standalone rule frameworks.

This workflow is Phase 2 Epic 5B only. It does not implement Discord publishing, scheduled publishing, operational health, commander's intent assessment, or decision support.

## Readiness Categories

### Operational Readiness

Operational Readiness checks planning completeness.

Examples:

- Operations Package exists
- Weekend Operation exists
- Zeus assigned
- Weekly Tasking exists
- Commander's Intent exists
- Unit Taskings exist for all active units
- Unit Taskings are complete
- CONOP attached as warning
- Deployment Resources inherited
- OPORD attached as warning
- Player Primer attached as warning
- Current Mod Preset attached as warning
- Timeline exists
- Attendance/RSVP configured

### Publication Readiness

Publication Readiness checks future publication safety.

Examples:

- User has publish permission
- Deployment is planning, preparing, or active
- Operational Week exists
- Package has previewable content
- Required tasking exists
- Discord channel mapping exists
- RSVP state is known
- Announcement can be generated later
- No critical operational readiness failures exist

Publication Readiness does not publish anything in Epic 5B.

## Rule Result Contract

Each rule returns:

```text
id
label
description
status
severity
category
message
recommendedAction
relatedEntityType
relatedEntityId
```

Allowed statuses:

```text
PASS
WARNING
FAIL
NOT_APPLICABLE
```

Critical `FAIL` blocks later publication. `WARNING` does not block publication.

## Scores

Scores are derived from applicable rule results.

Display:

- percentage
- status label
- blocking issues
- warnings
- completed checks
- total checks

Status labels:

- Ready
- Needs Attention
- Blocked
- Incomplete

## Go / No-Go Board

The Go / No-Go Board displays:

- Operational Readiness score
- Publication Readiness score
- Blocking Issues
- Warnings
- Completed Checks
- Recommended Actions
- Last Evaluated timestamp

Actions:

- Review Package
- Edit Planning
- Edit Tasking
- Manage Resources
- Manage CONOP
- Assign Zeus
- Re-run Checks
- Continue to Preview, disabled until Epic 5C
- Publish, disabled until Epic 5C

## Service Boundary

Readiness logic belongs in `OperationsPackageService` and provider implementations registered with the Universal Rule Engine.

UI components should consume service results and must not duplicate rule logic.

## Permissions

```text
operations.readiness.view
operations.readiness.evaluate
operations.package.view
operations.package.edit
operations.package.review
operations.package.publish
operations.tasking.manage
deployments.publish
s3.zeus.assign
```

Never authorize by role name.

## Notifications

Notification hooks reserved for future use:

- `operations.readiness.blocked`
- `operations.readiness.ready`
- `operations.publication.blocked`
- `operations.package.ready_for_review`

No real Discord publishing is implemented in Epic 5B.
