# Discord Interaction Flows

## 1. Purpose

This document defines Discord button, select menu, and modal interaction flows.

Discord is a client for the portal. The portal remains the source of truth for personnel, events, attendance, patrols, AARs, and permissions.

Multi-step interactions use the Discord Interaction Session Manager documented in
`docs/06-integrations/discord/INTERACTION_SESSION_MANAGER.md`. Sessions are
short-lived, portal-owned records that prevent stale modal, upload, or approval
continuations from completing after expiration.

## 2. RSVP Flow

### Trigger

An event is published in the portal and an authorized user sends the Discord announcement.

### Flow

```text
Portal event published
    ->
Authorized portal user posts event message to mapped Discord channel
    ->
Message includes RSVP buttons
    ->
Member clicks Yes/No/Maybe
    ->
Bot validates Discord signature
    ->
Bot resolves linked portal user/profile
    ->
Portal checks event visibility and RSVP permissions
    ->
Portal AttendanceRecord is updated
    ->
Member receives ephemeral confirmation
```

### Buttons

- RSVP Yes
- RSVP No
- RSVP Maybe
- View Event

### Required Data

- eventId
- discordUserId
- profileId
- RSVP status
- timestamp

### Event Announcement Payload

Deployment operation announcements should include tasking in this order:

1. Operation Information
2. Community Brief
3. Weekly Tasking
4. Unit Taskings
5. Timeline
6. Deployment Resources
7. Attendance / RSVP

If no Weekly Tasking exists, the bot should say tasking is pending instead of inventing details.

## 3. Patrol AAR Modal Flow

```text
Member runs /aar or /patrol aar
    ->
Bot validates Discord signature
    ->
Portal creates ACTIVE PATROL_AAR interaction session
    ->
Bot opens AAR modal
    ->
Member submits patrol/event, leader, tasking, callsigns, casualty report, and report
    ->
Portal requires active session and stores pending AAR text payload
    ->
Bot resolves linked portal user
    ->
Portal checks aars.submit or s3.aars.submit
    ->
Portal creates AAR record in pending-map state
    ->
Linked event AAR status is updated when event is resolved
    ->
Portal creates AAR_SCREENSHOT_UPLOAD session
    ->
S3 staff notification is queued when routing exists
    ->
Audit log is created
    ->
Interaction session is completed or failed
    ->
Member receives ephemeral confirmation
    ->
Member uploads map screenshot with /patrol screenshot image:<file>
    ->
Portal validates and attaches screenshot
    ->
Patrol AAR becomes submitted and awaits S3 review
```

Discord webhook-only mode cannot passively listen for the next ordinary image
message. Required map screenshots are therefore uploaded with `/patrol
screenshot image:<file>`, which delivers the attachment through the interaction
webhook. PNG, JPG, JPEG, and WEBP are accepted.

The slash-command attachment continuation uses `AAR_SCREENSHOT_UPLOAD` session
context and `PendingDiscordAarSubmission` rows to associate uploaded images with
the pending AAR.

## 4. Patrol Command Flow

```text
Member runs /patrol create
    ->
Portal creates ACTIVE PATROL_CREATE interaction session
    ->
Bot opens Start Patrol modal
    ->
Portal resolves linked user and checks patrol permission
    ->
Portal creates Running patrol Event
    ->
Portal posts to mapped patrol channel if available
    ->
Bot replies ephemerally with portal link
    ->
Interaction session is completed or failed
```

Patrol announcements include Interested and View Patrol buttons. Interested records `PatrolRsvp` only; it does not update Weekend Operation attendance.

```text
Member runs /patrol end
    ->
Portal resolves linked user
    ->
Portal completes the running patrol
    ->
Patrol moves to Awaiting AAR
    ->
Bot prompts /patrol aar
```

`/patrol aar` uses the same Patrol AAR template as `/aar`, creates pending screenshot state, and waits for `/patrol screenshot image:<file>` before the AAR can be reviewed.

## 5. Event Reminder Flow

Planned, not currently implemented as a scheduled Discord sender.

```text
Scheduled reminder job
    ->
Find event
    ->
Find missing RSVPs
    ->
Resolve Discord users
    ->
Send DM or channel reminder
    ->
Record delivery status
```

## 6. Profile Lookup Flow

```text
User runs /profile
    ->
Bot resolves Discord user
    ->
Portal checks linked profile
    ->
Portal checks permissions
    ->
Bot returns profile summary
```

## 7. Qualification Lookup Flow

```text
User runs /quals
    ->
Bot resolves target member
    ->
Portal checks permissions
    ->
Bot returns qualification summary
```

## 8. Staff Approval Flow Later

Example for future use:

```text
Transfer request submitted
    ->
Leadership receives Discord message
    ->
Leader clicks Approve or Deny
    ->
Bot validates permission
    ->
Portal updates request
    ->
Audit log created
    ->
Relevant parties notified
```

## 9. Error Flow

If interaction fails:

- respond ephemerally
- explain issue briefly
- log error or create delivery/audit record where appropriate
- do not expose stack trace

Common errors:

- user not linked
- missing permission
- event no longer active
- patrol/event could not be resolved
- missing channel mapping
- bot lacks channel permission
- Discord API failure
