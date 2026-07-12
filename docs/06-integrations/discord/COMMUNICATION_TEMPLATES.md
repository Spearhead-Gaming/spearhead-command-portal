# Communication Templates

## Purpose

Templates provide consistent formatting across communication domains.

Templates can represent:

- embeds.
- markdown.
- buttons.
- select menus.
- modals.
- attachments.
- images.
- future localization.

## Current Implementation

`CommunicationTemplate` stores subject/body templates, category, version, active state, and required-variable metadata.

Phase 4 Epic 5 seeds/defaults template keys for:

- `operational_releases.release_published`
- `weekend_operations.operation_published`
- `applications.submitted`
- `moderation.case_updated`
- `health.alert`

## Known Gap

The generic provider payload does not yet preserve Discord component builders such as RSVP buttons. Existing specialized Discord event and patrol builders still handle those interactive messages until the generic template renderer supports action components.

