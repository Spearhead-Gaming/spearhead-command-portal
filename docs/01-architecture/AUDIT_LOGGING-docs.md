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
- Notification failed
- Manual notification sent

### Administration
- User role changed
- Permission changed
- System setting changed

## Audit Log Fields

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

## Service Layer Requirement

Audit logging should happen inside domain services, not UI components.
