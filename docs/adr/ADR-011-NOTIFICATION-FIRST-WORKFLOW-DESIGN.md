# ADR-011: Notification-First Workflow Design

## Status

Accepted

## Context

Spearhead relies heavily on Discord. Many members are resistant to additional systems unless those systems integrate naturally with Discord and reduce workload.

## Decision

Major workflows will define notification behavior as part of their design.

Every important event should answer:

1. Who needs to know?
2. How should they be notified?
3. Is action required?
4. Should Discord be used?
5. Should the event be audited?

## Consequences

- Notifications are designed consistently.
- Discord integration remains central.
- Important actions become visible to the right people.
- The system avoids public-channel spam by using recipient resolution.
- Notification delivery needs tracking and failure handling.
