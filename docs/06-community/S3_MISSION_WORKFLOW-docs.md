# S3 Mission Workflow

## 1. Purpose

The S3 mission workflow defines how Spearhead creates, reviews, approves, publishes, runs, reviews, and archives missions.

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
- Are AARs required?
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

## 5. Mission Lifecycle

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

## 6. Mission Types

Suggested mission/event types:

- Main Operation
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

## 8. Required Portal Features

- S3 dashboard
- Mission list
- Mission calendar
- Mission editor
- Weekly operation package resources
- Review queue
- Publish action
- AAR submission
- Mission archive
- Unit tasking

## 9. Discord Integration

Potential Discord actions:

- Notify S3 of mission submitted for review
- Notify mission maker when approved/rejected
- Post approved operation to unit Discord channels
- Include current CONOP link/file in operation announcements when available
- Post reminder before mission
- Notify S3 when AAR is missing
- Post mission completion summary

## 10. Required Data

Core data objects:

- Event
- Campaign
- DeploymentResource and DeploymentResourceVersion for CONOP/resource files and links
- AAR
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
- `missions.create`
- `missions.edit`
- `missions.review`
- `missions.approve`
- `missions.publish`
- `missions.archive`
- `conops.manage`
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
- AAR submission
- Archive action

## 13. Dashboard Integration

### S3 Dashboard

Show:

- Draft missions
- Missions awaiting review
- Approved but unpublished missions
- Upcoming published missions
- Completed missions needing AAR
- Active campaigns

### Unit Dashboard

Show:

- Upcoming assigned missions
- Required qualifications
- CONOP links
- Attendance status

### Member Dashboard

Show:

- Next mission
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
