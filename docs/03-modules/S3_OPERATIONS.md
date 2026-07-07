# S3 Operations Module

## Purpose

Provide deployment, weekend operation, patrol, CONOP, AAR, and Zeus assignment oversight tools for S3.

## Operation Lifecycle

```text
Draft
v
S3 Review
v
Approved
v
Published
v
Completed
v
AAR Submitted
v
Archived
```

## Core Features

- Operations Center dashboard.
- Operations calendar.
- Weekly operation package.
- CONOP file/link attachment through deployment resources.
- Planner assignment.
- Zeus assignment.
- Weekly Tasking.
- Unit Tasking.
- Required qualifications.
- Lightweight Patrol tracking.
- Patrol AAR tracking.
- Operation archive.

## Operations Center

`/operations` is the primary S3 landing page for operational awareness. It should show the current deployment, next weekend operation, pending weekly tasking/publication work, active patrols, patrol AAR backlog, upcoming patrols, assigned Zeus, recent activity, and deployment progress.

`/operations/s3` remains the detailed S3 lifecycle board for filtering and moving operation records through Draft, S3 Review, Approved, Published, Completed, AAR Submitted, and Archived.

## Weekly Operation Package

Each deployment week or weekend operation should expose a single operation package containing:

- Weekly Tasking.
- Unit Taskings.
- CONOP file or external link.
- OPORD/resource links inherited from the Deployment.
- Mod preset inherited from the Deployment or overridden for the week.
- Zeus assignment.
- Timeline.
- Attendance and RSVP state.

CONOP is primarily a weekly operation resource, not a rich editor record. The active CONOP should be attached as an event-scoped Deployment Resource with resource type `CONOP`, preserving version history like other deployment resources.

## Operations Package Planning

Every Deployment Week owns exactly one Operations Package. The package is the central S3 planning object for that week and is available at `/operations/packages/[campaignId]/week/[weekNumber]`.

Planning status moves through:

```text
Planning
v
Tasking
v
Resources
v
Review
```

Publishing and Discord delivery are intentionally outside this planning phase.

The planning workspace stores planning notes, operational objectives, assumptions, friendly situation, enemy situation, intelligence summary, logistics, weather, special instructions, and operational notes on `DeploymentWeek`.

Weekly Tasking and Unit Taskings are generated from the linked Weekend Operation. Every active unit receives a Unit Tasking row by default; S3 does not manually select participating units.

Deployment Resources are inherited into the package. Week-specific resources, including CONOP file/link overrides, remain resource records so version history is preserved.

## Operations Readiness and Go / No-Go

Operations Package readiness answers whether a weekly package is complete enough to proceed toward review and later publication.

Readiness is split into:

- Operational Readiness for planning completeness.
- Publication Readiness for future publication safety.

The Go / No-Go Board should surface the readiness scores, blocking issues, warnings, completed checks, recommended actions, and last evaluated time. Publishing and Discord delivery remain disabled until the later publishing phase.

## Operations Release Publishing

Publishing an Operations Package creates an immutable Operations Release snapshot.

Release publishing includes:

- Release version.
- Release notes.
- Amendment summary when publishing over an existing release.
- Discord announcement through the mapped Events channel.
- Release history.
- Discord delivery status.

The first release is `v1.0`. Amendments usually increment the minor version. Publishing a successful amendment supersedes the previous published release.

Scheduled releases may be recorded, but execution requires a real scheduler and should not be faked.

## AAR Progression Review

Patrol AARs are not only historical reports. Operation creators and S3 use reviewed Patrol AARs to decide how the Deployment should progress. AAR review should capture progression decision, recommended next operation version/path, enemy activity notes, friendly activity notes, issues to account for next week, unit performance notes, tasking adjustments, planning notes for next week, and lessons learned.

Weekend Operations do not use AARs in the current Spearhead doctrine. Patrol AARs require an uploaded map screenshot before they can be marked reviewed. The screenshot stores uploader, upload time, filename, MIME type, file size, Deployment, week, and patrol metadata through the portal file-storage abstraction. Optional supporting media can be attached as file-backed AAR attachments.

## Spearhead Rules

- Deployments are multi-week operations under S3 oversight.
- User-facing copy should prefer Deployment, Weekend Operation, Patrol, Training, Meeting, or Community Event instead of generic Mission.
- Weekly Tasking belongs to the operation event.
- Unit Tasking replaces participating-unit selection because every active unit participates.
- Patrol AARs should be highlighted and routed to S3 for review.
- Patrols should be started through the lightweight Start Patrol flow instead of the S3 mission builder.
- Patrol RSVP interest is separate from final attendance.
- Patrol AARs linked to active deployments contribute to deployment progression context.
- Weekend Operations do not use AARs.
- Discord `/aar` submissions create Portal AAR records in pending-map state, notify S3, and direct the submitter to upload the required map screenshot with `/patrol screenshot image:<file>`.
