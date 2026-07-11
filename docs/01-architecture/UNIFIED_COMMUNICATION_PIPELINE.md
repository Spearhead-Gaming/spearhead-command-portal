# Unified Communication Pipeline

## Purpose

The unified communication pipeline is the shared service boundary for portal notifications, announcements, Discord channel posts, future direct messages, and future email delivery.

Domain modules should request communication through this pipeline instead of sending directly to Discord or creating delivery records by hand.

## Core Rule

The portal remains the source of truth. Discord is a delivery surface.

Every communication request should:

- identify the source module and source event
- resolve a target audience through portal data
- enforce portal permissions before privileged sends
- create a communication history record
- create delivery records per channel
- tolerate delivery failure without corrupting domain data
- preserve audit history for sensitive communications

## Service Boundary

Implementation lives under:

```text
src/server/communications
```

Primary responsibilities:

- `pipeline.ts` accepts standardized communication requests.
- `audience.ts` resolves users and mapped Discord channels.
- `providers.ts` registers delivery providers.
- `templates.ts` stores reusable template helpers.
- `preferences.ts` applies per-user channel preferences.
- `service.ts` exposes announcement and admin-facing actions.
- `queries.ts` feeds the Communications Center UI.

## Communication Request Contract

A request contains:

- `sourceModule`
- `sourceEvent`
- `type`
- `title`
- `body`
- `category`
- `priority`
- `targetAudience`
- `requestedChannels`
- optional `templateKey`
- optional `templateVariables`
- optional `relatedEntityType`
- optional `relatedEntityId`
- optional `idempotencyKey`

Use an `idempotencyKey` when a domain event may be retried, such as an operation release or announcement send.

## Audience Resolution

Supported audience forms:

- explicit users
- unit members
- users with a permission key
- all active members
- S3 staff
- command staff
- mapped Discord channel

Audience resolution must not authorize by role name. Permission-based audiences must resolve through role-permission assignments.

## Delivery Providers

Initial provider support:

- portal notification provider
- Discord channel provider

Future providers:

- Discord direct message
- email
- SMS or external webhooks if approved later

Provider failures should create failed delivery records and should not break the core workflow unless the caller explicitly treats the delivery as required.

## Preferences

Communication preferences are per user and per category. Preferences can disable non-critical channels. Critical communications may bypass quiet preferences if the category rules require it.

## History

The Communications Center shows:

- communication history
- delivery history
- failed delivery counts
- announcement drafts and sent announcements
- template readiness
- preference coverage

Audit logs remain separate from communication history.

## Migration Guidance

Existing direct Discord senders should be migrated incrementally:

1. Build the domain message payload.
2. Resolve the audience through the communication service.
3. Request portal and Discord delivery through the pipeline.
4. Preserve existing domain audit events.
5. Remove direct provider calls once the pipeline covers the workflow.
