# Delivery Provider Architecture

## Purpose

Delivery providers adapt a standardized communication request into a specific channel implementation.

Providers should be small, replaceable adapters. They should not contain domain workflow logic.

## Provider Contract

A provider receives:

- communication id
- notification id when portal notification history is needed
- title
- body
- priority
- resolved audience
- requested channel configuration
- metadata for the target channel

A provider returns:

- delivery id
- status
- provider message id when available
- error message when delivery fails

## Current Providers

### Portal

Creates user-scoped `NotificationDelivery` records and marks them pending/sent for the notification center.

### Discord Channel

Uses configured Discord channel mappings. It must never guess channels. Missing mappings should create a failed delivery record.

## Rules

- Providers must never authorize by Discord role alone.
- Providers must never post staff-only data into public channels.
- Providers must never mutate operational data.
- Providers must record delivery attempts.
- Providers must not throw away delivery history.

## Future Providers

Future providers should implement the same contract:

- Discord direct message
- email
- webhook
- SMS if explicitly approved

Provider-specific secrets must be read through safe server configuration utilities and must never be exposed to client components.
