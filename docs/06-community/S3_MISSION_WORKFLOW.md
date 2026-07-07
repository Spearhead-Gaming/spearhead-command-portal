# S3 Operations Workflow

## 1. Purpose

The S3 operations workflow defines how Spearhead creates, reviews, approves, publishes, runs, reviews, and archives Deployments, Weekend Operations, Patrols, Training, Meetings, and Community Events.

S3 tooling should reduce planning chaos and keep mission information organized.

## 2. Guiding Principle

> S3 should have one place to plan, publish, and review operations.

## 3. Current Process Analysis

Questions to answer:

- Who creates missions today?
- Who approves missions?
- Where are CONOPs created?
- Where are CONOPs posted?
- How are mission makers assigned?
- How are Zeus assignments handled?
- Are Patrol AARs complete, including the required map screenshot?
- Where are AARs stored?
- How are participating units notified?

## 4. Pain Points

Common issues this workflow should solve:

- Mission details scattered across Discord/documents
- CONOPs hard to find
- No standardized mission status
- Mission makers and Zeus assignments unclear
- AARs not consistently connected to missions
- S3 lacks a clean review queue

## 5. Operation Lifecycle

```text
Draft
    ↓
S3 Review
    ↓
Approved
    ↓
Published
    ↓
Completed
    ↓
AAR Submitted
    ↓
Archived
```

## 6. Operation Types

Suggested operation/event types:

- Main Operation
- Patrol
- Training Operation
- FTX
- Campaign Operation
- Side Operation
- Community Event
- Briefing
- AAR

## 7. Weekly Operation Package

Each deployment week/weekend operation should gather the operational package in one place:

- Weekly Tasking
- Unit Tasking for every active unit
- CONOP file or external link
- OPORD/resource links inherited from the Deployment
- Mod preset inherited from Deployment or overridden for the week
- Zeus assignment
- Timeline
- Attendance/RSVP

CONOP should normally be attached as a file or external link to the weekly operation package. It is not primarily a rich editor record.

The Phase 2 Epic 5A implementation treats `DeploymentWeek` as the Operations Package anchor. The planning route is `/operations/packages/[campaignId]/week/[weekNumber]`.

Planning supports:

- Planning Notes
- Operational Objectives
- Planning Assumptions
- Friendly Situation
- Enemy Situation
- Intelligence Summary
- Logistics
- Weather
- Special Instructions
- Operational Notes

Planning status is limited to Planning, Tasking, Resources, and Review. Publishing, Discord publishing, readiness scoring, operational health, and decision support belong to later Epic 5 sub-phases.

Weekly Tasking belongs to the linked Weekend Operation. Unit Tasking rows are generated for every active unit.

## 7.1 Operations Readiness

Operations Package readiness evaluates whether the weekly package is complete enough to proceed toward review and later publication.

Operational Readiness checks planning completeness. Publication Readiness checks future publication safety. Critical failures create a No-Go state; warnings remain visible but do not block.

The Go / No-Go Board should show readiness scores, blocking issues, warnings, completed checks, recommended actions, and last evaluated time. Continue to Preview and Publish are available only when publication readiness is not blocked and the user has release permissions.

## 7.2 Operations Release Publishing

Publishing an Operations Package creates a permanent Operations Release snapshot.

The release contains version, release notes, published-by, published time, package snapshot, Discord status, and release history.

The first release starts at `v1.0`. Amendments increment the release version and preserve previous releases as historical records. Only one published release should be active for an operational week.

Discord is the delivery platform, but the Portal remains the source of truth.

## 8. Required Portal Features

- S3 dashboard
- Mission list
- Mission calendar
- Mission editor
- Weekly operation package resources
- Operations Package planning workspace
- Review queue
- Publish action
- Patrol AAR submission
- Mission archive
- Unit tasking

## 9. Discord Integration

Potential Discord actions:

- Notify S3 of mission submitted for review
- Notify mission maker when approved/rejected
- Post approved operation to unit Discord channels
- Include current CONOP link/file in operation announcements when available
- Post reminder before mission
- Notify S3 when a Patrol AAR or required map screenshot is missing
- Post mission completion summary
- Accept `/aar` modal submissions for patrol AARs and create Portal AAR records.

## Spearhead S3 Operations Doctrine

- Deployments are multi-week operations with S3 oversight.
- Weekly Tasking is tied to the operation event and publishes with the event announcement.
- Unit Tasking replaces deployment-level participating-unit selection because every active unit participates.
- Weekend Operations do not use AARs.
- Patrols require AAR submission and a map screenshot before review can be completed.
- Reviewed Patrol AARs inform Deployment progression decisions.
- Patrol AARs linked to an active Deployment contribute to progression context.
- Anyone with patrol permission can lead a patrol and submit an AAR.
- S3 receives notification when a patrol AAR is submitted.
- Discord can collect the Patrol AAR report through `/aar`, but the Portal remains the authoritative record and `/patrol screenshot image:<file>` is the webhook-safe screenshot continuation path.
- The Operations Center separates Patrols Awaiting AAR, Missing Screenshot AARs, AARs Awaiting Review, and Recent Progression Recommendations.
- Progression review records the decision, next operation version/path, enemy and friendly activity, unit performance, tasking adjustments, next-week planning notes, and lessons learned.

## 10. Required Data

Core data objects:

- Event
- Campaign
- DeploymentResource and DeploymentResourceVersion for CONOP/resource files and links
- Patrol AAR and AAR attachments
- MissionStatus
- MissionType
- UnitTasking
- Document
- AttendanceRecord
- Notification
- AuditLog

## 11. Permissions

Example permissions:

- `s3.dashboard.view`
- `s3.missions.create`
- `s3.missions.edit`
- `s3.missions.review`
- `s3.missions.approve`
- `s3.missions.publish`
- `s3.missions.archive`
- `deployments.resources.upload`
- `s3.conops.publish`
- `aars.submit`
- `aars.review`

## 12. Audit Requirements

Log all changes to:

- Mission creation
- Mission status changes
- Approval/rejection
- Publish action
- CONOP edits
- Unit tasking changes
- Patrol AAR submission
- Patrol AAR map screenshot upload
- Archive action

## 13. Dashboard Integration

### S3 Dashboard

Show:

- Draft missions
- Missions awaiting review
- Approved but unpublished missions
- Upcoming published missions
- Patrols needing AAR or map screenshot
- AARs awaiting S3 review
- Recent deployment progression recommendations
- Active campaigns

### Unit Dashboard

Show:

- Upcoming assigned missions
- Required qualifications
- CONOP links
- Attendance status

### Member Dashboard

Show:

- Next operation
- RSVP status
- CONOP link
- Required preparation

## 14. Future Expansion

Future S3 features:

- Mission templates
- OPORD export
- Briefing slide generation
- Mod preset tracking
- Map/intel attachments
- Mission maker performance history
- Automatic campaign timeline updates
