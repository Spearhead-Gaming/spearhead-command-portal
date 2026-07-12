# Discord Communication Platform

## Purpose

The Discord Communication Platform moves portal messaging away from feature-level channel decisions and toward domain-driven routing.

The Portal decides who needs information. Guild configuration decides where that information is delivered.

## Flow

Portal workflow

Communication event

Routing engine

Guild resolution

Channel resolution

Unified delivery queue

Discord provider

Audit, retry, and history

## Source Of Truth

The Portal remains authoritative for:

- audience intent.
- communication domain and type.
- related deployment, patrol, application, qualification, or moderation context.
- delivery history.
- retry and audit state.

Discord channels are delivery destinations only.

## Implementation

Core implementation:

- `src/server/communications/domains.ts`
- `src/server/communications/routing.ts`
- `src/server/communications/health.ts`
- `src/server/communications/rules.ts`
- `src/server/communications/pipeline.ts`
- `src/server/communications/providers.ts`

Existing `Communication` and `CommunicationDelivery` records remain the queue/history foundation.

## Current Scope

Phase 4 Epic 5 adds:

- communication domain catalog.
- multi-guild route preview.
- mapping-ID delivery support.
- communication health overview.
- rule provider for missing mappings, failed deliveries, and queue backlog.
- Discord Operations Center communication dashboard.

Interactive Discord payloads such as RSVP buttons remain supported by existing specialized builders until the generic template payload model is extended to preserve components.

