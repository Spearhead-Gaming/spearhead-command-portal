# Communications Center Workflow

## Purpose

This workflow explains how staff-created announcements and system-generated communications move through the unified communication pipeline.

## Actors

- Member
- Unit leadership
- S3 staff
- Administrator
- System automation

## Permissions

```text
communications.view
communications.send
communications.manage
communications.history.view
communications.templates.manage
communications.preferences.manage
announcements.view
announcements.manage
announcements.send
notifications.delivery.view
notifications.delivery.retry
```

## Staff Announcement Flow

1. Staff opens `/communications`.
2. Staff creates an announcement draft.
3. Staff chooses audience and delivery channels.
4. Staff sends the announcement.
5. The pipeline creates a communication history record.
6. The pipeline resolves recipients and channel mappings.
7. Providers create delivery records.
8. Failed deliveries remain visible for review.

## Domain Event Flow

1. A module completes a workflow event, such as an operation release.
2. The module calls the communication service with a source event and idempotency key.
3. The pipeline resolves audience and requested channels.
4. Providers deliver through portal and mapped Discord channels.
5. The domain workflow continues even if optional delivery fails.

## Notification Center Flow

Members can:

- mark notifications read
- pin important notifications
- clear notifications from their inbox

Clearing a notification hides it from the user notification center but does not delete audit logs or delivery history.

## Failure Handling

Failed delivery should capture:

- channel
- recipient or destination
- status
- error message
- attempt timestamp

Missing Discord mappings are failures, not guesses.

## Audit Guidance

Audit:

- manual announcements sent
- template changes
- retry requests
- final delivery failure states when they affect staff action

Do not audit every normal user inbox clear unless future policy requires it.
