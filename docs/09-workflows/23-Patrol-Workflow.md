# Patrol Workflow

Patrols are lightweight portal-authoritative operational activities tied to the current Deployment and operational week.

## Doctrine

- Patrols are Event records with `eventType = patrol`.
- Patrols are not Weekend Operations and do not use the normal attendance workflow.
- Authorized members start patrols quickly from the portal.
- Multiple patrols may run at the same time.
- RSVP means interested, not attended.
- Confirmed participants are managed separately from RSVP interest.
- Completed patrols require a Patrol AAR and map screenshot.
- Patrol AARs feed Deployment progression context for S3 and operation creators.

## Lifecycle

```text
Planning
Running
Completed
Awaiting AAR
AAR Submitted
Reviewed
Archived
```

Recommended flow:

```text
Start Patrol
-> Running
-> Complete Patrol
-> Awaiting AAR
-> Submit AAR
-> AAR Submitted
-> S3 Review
-> Reviewed
```

## Portal Flow

Entry points:

- Dashboard quick action.
- Operations Center quick action.
- `/operations/patrols`.
- Patrol inspector drawer.

Start Patrol asks only for:

- Deployment, default current active Deployment.
- Operational Week, default current week.
- Patrol Name.
- Patrol Type.
- Estimated Duration.
- Optional Description.

The service sets:

- Patrol Leader from current user.
- Start Time to now.
- Status to Running.
- AAR Required to true.
- Patrol callsign when practical.

## Patrol Page

`/operations/patrols` shows Active Patrols, Awaiting AAR, Awaiting Review, and Completed Patrols.

Patrol cards show name, type, leader, deployment, week, status, start time, duration, RSVP count, participant count, and AAR status.

## Inspector Drawer

The patrol inspector uses Overview, Participants, AAR, Activity, and History tabs.

The Participants tab must clearly separate Interested / RSVP from Confirmed Participants.

## Permissions

Permission keys:

- `patrols.view`
- `patrols.create`
- `patrols.lead`
- `patrols.complete`
- `patrols.participants.manage`
- `patrols.rsvp`
- `patrols.aar.submit`
- `patrols.aar.review`
- `patrols.archive`
- `aars.submit`
- `aars.review`
- `operations.center.view`
- `discord.patrols.create`
- `discord.patrols.manage`

Never authorize patrol actions by Discord role or portal role name.

## Audit And Notifications

Audit:

- `patrol.started`
- `patrol.completed`
- `patrol.participant_added`
- `patrol.participant_removed`
- `patrol.rsvp_recorded`
- `aar.submitted`
- `aar.map_screenshot_uploaded`
- `aar.reviewed`

Notifications:

- `patrol.started`
- `patrol.completed`
- `patrol.aar_required`
- `patrol.aar_submitted`
- `patrol.aar_missing`
- `patrol.aar_reviewed`
- `patrol.rsvp_recorded`

Discord delivery, if used by later integrations, must not roll back portal patrol state.
