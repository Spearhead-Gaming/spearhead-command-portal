# Communications Center Module

## Purpose

The Communications Center gives staff one place to review announcements, communication history, delivery status, templates, preferences, and failed delivery queues.

## Route

```text
/communications
```

## Main Capabilities

- view recent communication requests
- create announcement drafts
- send announcements through the unified pipeline
- review delivery status
- inspect failed deliveries
- seed default templates
- view preference coverage

## Permissions

```text
communications.view
communications.manage
communications.send
communications.retry
communications.history.view
communications.templates.manage
communications.preferences.manage
announcements.view
announcements.manage
announcements.send
notifications.delivery.view
notifications.delivery.retry
```

## Design Rules

- Keep domain workflow logic in services.
- Do not send directly to Discord from UI components.
- Use permission keys, not role names.
- Show failed delivery states clearly.
- Keep retry actions explicit and auditable.

## Notification Center Relationship

The notification drawer remains the user-facing inbox. The Communications Center is the staff/admin operations surface for communication health and history.
