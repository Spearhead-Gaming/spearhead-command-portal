# Audit Logging Architecture

## Purpose

Audit logs provide accountability for administrative and workflow actions.

The portal should make it clear who changed what, when, and why.

## Events That Must Be Audited

### Personnel

- Profile created
- Profile edited
- Status changed
- Rank changed
- Unit changed
- Position changed
- Profile note created
- Profile note edited
- Profile note deleted

### Roster

- Roster assignment created
- Roster assignment ended
- Transfer approved
- Transfer denied, future
- Bulk roster update

### Qualifications

- Qualification awarded
- Qualification revoked
- Qualification expired
- Qualification requirement added
- Qualification requirement removed
- Instructor sign-off

### Applications and Workflow

- Form template created
- Form template edited
- Form template archived
- Form field created
- Form field edited
- Approval step created
- Approval step edited
- Form submitted
- Submission status changed
- Reviewer assigned
- Comment added
- Approval decision made
- Denial decision made
- Submission archived

### Attendance

- RSVP changed by staff
- Final attendance recorded
- Attendance edited
- Attendance locked
- Attendance overridden

### Campaigns and Operations

- Campaign created
- Campaign status changed
- Event created
- Event edited
- Event published
- CONOP published
- AAR submitted

### Discord

- Discord server mapped
- Discord channel mapped
- Discord role mapping changed
- Discord member auto-imported
- Discord bot account skipped by member sync policy
- Discord member profile updated from Discord identity
- Discord member detected as left server
- Discord member sync started
- Discord member sync completed
- Discord member sync failed
- Discord kick requested
- Discord kick succeeded
- Discord kick failed
- Notification failed
- Manual notification sent

### Administration

- User role changed
- Permission changed
- System setting changed

## Audit Log Fields

Recommended fields:

- id
- actorUserId
- action
- entityType
- entityId
- summary
- oldValue
- newValue
- reason
- ipAddress
- createdAt

## Audit Log Rules

- Audit logs are append-only.
- Audit logs should not be edited through normal UI.
- Deleting audit logs should not be supported in the application.
- Sensitive note content should be handled carefully.
- Audit snapshots can use JSON fields.
- Do not rely on JSON audit fields for main application queries.

## Display Requirements

Admin audit log viewer should support:

- filter by actor
- filter by action
- filter by entity type
- filter by date range
- search summary
- view old/new values where available

## Service Layer Requirement

Audit logging should happen inside domain services, not UI components.

Example:

```text
RosterService.changeRank()
    update profile
    create profile log
    create audit log
    trigger notification
```
