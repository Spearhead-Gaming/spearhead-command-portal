# Notification Architecture

## 1. Purpose

The notification system ensures the right people are alerted at the right time without creating Discord spam or portal clutter.

The unified communication pipeline is the preferred service boundary for new notification and announcement workflows. See [UNIFIED_COMMUNICATION_PIPELINE.md](UNIFIED_COMMUNICATION_PIPELINE.md) and [DELIVERY_PROVIDER_ARCHITECTURE.md](DELIVERY_PROVIDER_ARCHITECTURE.md).

Notifications should support:

- portal alerts
- Discord channel messages
- Discord direct messages
- future email delivery if needed
- delivery tracking
- retries
- audit logs

## 2. Core Principle

> Notify the people who need to act, not everyone who might be interested.

## 3. Notification Channels

### Portal Notification

Used for:

- personal tasks
- approvals
- pending actions
- system notices

### Discord Channel Message

Used for:

- unit announcements
- event posts
- campaign updates
- leadership alerts
- staff alerts

### Discord Direct Message

Used for:

- personal reminders
- qualification updates
- RSVP reminders
- transfer notices

### Email

Not required for MVP.

Can be added later for important administrative or account-related messages.

## 4. Notification Lifecycle

New domain workflows should request communication through the pipeline instead of creating Discord messages or delivery records directly.

```text
Trigger Event
    ↓
Build Notification
    ↓
Resolve Recipients
    ↓
Resolve Delivery Channels
    ↓
Queue Delivery
    ↓
Send
    ↓
Record Delivery Result
    ↓
Retry if Needed
    ↓
Audit if Required
```

## 5. Notification Types

Recommended notification types:

- form.submitted
- form.review_requested
- form.approved
- form.denied
- form.changes_requested
- form.comment_added
- transfer.requested
- loa.requested
- rasp.application_submitted
- personnel.rank_changed
- personnel.unit_changed
- personnel.status_changed
- qualification.awarded
- qualification.revoked
- qualification.expiring
- event.created
- event.published
- event.updated
- event.reminder
- attendance.rsvp_missing
- attendance.finalized
- campaign.created
- campaign.updated
- campaign.published
- s3.mission_review_requested
- s3.conop_published
- s3.aar_missing
- patrol.aar_required
- patrol.aar_submitted
- patrol.aar_missing_screenshot
- patrol.aar_reviewed
- deployment.progression_recommended
- discord.delivery_failed
- discord.member_joined
- discord.member_left
- discord.member_synced
- discord.moderation.kicked
- discord.moderation.failed
- admin.permission_changed

## 6. Recipient Resolution

Recipients should be resolved by context.

Examples:

### Rank Changed

Recipients:

- member
- unit leadership
- S1 staff
- optional announcement channel

### Transfer Completed

Recipients:

- member
- previous unit leadership
- receiving unit leadership
- S1 staff

### Form Submitted

Recipients:

- submitter
- assigned reviewer, if present
- unit or staff review queue recipients

### Changes Requested

Recipients:

- submitter
- currently assigned reviewer

### Event Published

Recipients:

- participating units
- assigned leadership
- members required to RSVP

### Qualification Awarded

Recipients:

- member
- awarding instructor
- unit leadership if required qualification

## 7. Delivery Rules

Each notification should define:

- trigger
- recipient group
- delivery channel
- urgency
- template
- retry behavior
- audit requirement

## 8. Urgency Levels

### Info

Routine updates.

### Action Required

User or staff must act.

### Warning

Something needs attention soon.

### Critical

Important failure or time-sensitive issue.

## 9. Notification Templates

Templates should use consistent variables.

Example:

```text
{{memberName}} was awarded {{qualificationName}} by {{instructorName}}.
```

Template fields:

- title
- body
- Discord embed content
- call-to-action label
- call-to-action URL

## 10. Delivery Tracking

Every delivery attempt should record:

- notificationId
- channel
- recipient
- status
- errorMessage
- sentAt
- retryCount

Statuses:

- pending
- sent
- failed
- retrying
- cancelled

## 11. Retry Strategy

Recommended retry behavior:

- Retry failed Discord deliveries up to 3 times.
- Use short delay for transient Discord errors.
- Do not retry permission/access errors endlessly.
- Record final failure.
- Notify admins of repeated failures.

## 12. Anti-Spam Rules

- Batch low-priority updates when possible.
- Avoid sending the same notification repeatedly.
- Prefer staff channels over public channels for administrative details.
- Do not DM members for every minor roster change.
- Allow notification preferences later.

## 13. Audit Requirements

Audit logs should be created for:

- manually sent notifications
- notification template changes
- notification routing changes
- critical failed deliveries
- Discord channel mapping changes

## 14. MVP Scope

MVP notifications should support:

- portal notification record creation
- Discord event publication
- Discord RSVP reminders
- qualification awarded notice
- rank/unit/status change notice
- failed delivery logging
