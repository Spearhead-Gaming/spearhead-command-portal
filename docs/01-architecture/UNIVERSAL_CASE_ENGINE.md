# Universal Case Engine

## Purpose

The Universal Case Engine provides reusable case-management infrastructure for community management, moderation, appeals, incident review, coaching, and future administrative workflows.

The engine is not moderation-specific. Future modules may register case types without rewriting assignment, timeline, evidence, decision, or status-transition logic.

## Core Model

The implementation uses `CommunityCase` as the shared case record. It supports:

- case number
- case type
- status
- priority
- confidentiality
- assignment
- participants
- notes
- evidence
- decisions
- timeline
- related member
- related Discord user
- related portal entity
- archival fields

Normal workflows must not hard-delete case history, notes, evidence, decisions, or timeline entries.

## Case Type Registry

Case types are registered in code through the case type registry.

Initial case types:

- `MODERATION`
- `INCIDENT`
- `APPEAL`
- `ADMINISTRATIVE_REVIEW`
- `COACHING`
- `MEMBER_CONCERN`

Each case type defines display name, description, default priority, allowed statuses, allowed transitions, permission requirements, evidence requirements, closure requirements, and notification hooks.

## Status Lifecycle

Default statuses:

- draft
- open
- under_review
- awaiting_information
- pending_decision
- resolved
- dismissed
- appealed
- reopened
- closed
- archived

Status transitions must be validated in the service layer. UI components should not directly mutate status fields.

## Confidentiality

Supported confidentiality levels:

- standard
- restricted
- command_only
- administrator_only

Queries must filter confidential content before returning it to UI components.

## External Integrations

The case engine has no direct Discord dependency. Discord moderation is a domain service that may attach moderation action records to cases.

Case communications must use the Unified Communication Pipeline.

