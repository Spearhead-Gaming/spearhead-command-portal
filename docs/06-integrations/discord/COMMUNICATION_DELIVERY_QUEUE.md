# Communication Delivery Queue

## Purpose

The delivery queue records every provider attempt independently.

Models:

- `Communication`
- `CommunicationDelivery`
- `CommunicationAttempt`
- `NotificationDelivery`

## States

Supported queue states include:

- queued/requested.
- pending.
- processing.
- delivered.
- partial success.
- failed.
- retrying.
- cancelled.
- expired.

Provider-specific statuses are normalized for admin display.

## Multi-Guild Delivery

Each resolved guild/channel target becomes an independent Discord delivery. One failed guild delivery must not erase successful deliveries to other guilds.

## Retry

Retry uses the existing communication provider retry interface and records a new attempt.

