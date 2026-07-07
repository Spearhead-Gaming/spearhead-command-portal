# Security and Access Control

## Authentication

Use Discord OAuth as the primary login method.

## Authorization

Use capability-based permissions.

Roles are collections of permissions.

## Permission Examples

```text
personnel.view
personnel.edit
roster.manage
units.manage
qualifications.award
events.create
attendance.manage
campaigns.publish
discord.manage
admin.manage
```

## Security Rules

- Enforce permissions server-side
- Log administrative changes
- Restrict private notes
- Restrict staff-only documents
- Validate Discord interaction signatures
- Avoid exposing internal IDs unnecessarily
- Apply least-privilege access

## Audit Logging

Audit logs should record:
- who acted
- what changed
- when it changed
- target entity
- previous value where practical
- new value where practical
