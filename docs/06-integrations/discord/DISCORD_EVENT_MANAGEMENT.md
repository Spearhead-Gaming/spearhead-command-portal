# Discord Event Management

Discord Scheduled Events are external representations of Portal-managed events. The Portal remains authoritative for event title, timing, status, ownership, RSVP policy, attendance, resources, and cancellation.

## Principles

- One Portal event may create zero, one, or many Discord Scheduled Events.
- Discord Scheduled Events are linked by stored IDs, never by name matching.
- Discord interest is a participation signal, not finalized attendance.
- Gateway observes Discord changes; REST creates, updates, and cancels events.
- Failed guild actions do not roll back successful guild actions.

## Supported Sources

- Weekend Operations
- Operational Week events
- Deployment milestones
- Optional planned Patrol events
- Training events
- Community and meeting events
- Future custom event types
