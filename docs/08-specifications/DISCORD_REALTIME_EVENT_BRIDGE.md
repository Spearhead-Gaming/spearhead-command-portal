# Discord Real-Time Event Bridge

## Contract

The Gateway worker is a real-time event bridge. It receives Discord events,
wraps them in portal event envelopes, dispatches them to domain handlers, and
records health/event logs.

## Event Envelope

The internal envelope contains:

- event name
- guild ID
- sequence number
- received timestamp
- payload

## Handler Contract

Handlers define:

- handler ID
- event name
- required intents
- owning domain
- retry count and backoff
- description
- enabled flag

## Delivery Guarantees

- At-least-once handling is possible because Discord may reconnect/resume.
- Handlers should use idempotency keys where practical.
- Event logs preserve visibility but are not the source of truth.

## Boundaries

- The bridge does not authorize users.
- The bridge does not bypass portal services.
- The bridge does not guarantee Discord state is complete.
- The bridge should degrade safely back to webhook-first behavior.
