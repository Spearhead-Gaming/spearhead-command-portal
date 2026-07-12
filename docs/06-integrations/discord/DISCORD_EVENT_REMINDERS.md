# Discord Event Reminders

`DiscordEventReminder` stores future reminder intent and idempotency.

Reminder delivery should use the Unified Communication Pipeline. The event publisher must not send channel announcements directly.

## Future Workflow

- create reminder record
- route communication through domain policy
- record delivery
- preserve retry state
- avoid duplicate reminder sends by idempotency key
