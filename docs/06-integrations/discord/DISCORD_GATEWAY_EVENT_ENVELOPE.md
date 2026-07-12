# Discord Gateway Event Envelope

Every Discord dispatch is normalized before handler routing.

## Standard Fields

- `eventId`
- `eventName`
- `eventType`
- `source`
- `guildId`
- `channelId`
- `discordUserId`
- `discordResourceId`
- `correlationId`
- `idempotencyKey`
- `payloadVersion`
- `handlerVersion`
- `processingStatus`
- `sequence`
- `shardId`
- `sessionIdHash`
- `receivedAt`
- `occurredAt`
- `safeMetadata`
- `payload`

## Privacy

The event log stores safe metadata and summaries. Raw payloads remain in-process and should not be exposed in admin UI or diagnostics unless a future redaction layer is added.

## Correlation

`correlationId` lets admins connect failed queue entries, logs, and handler diagnostics without exposing Discord secrets or raw session identifiers.
