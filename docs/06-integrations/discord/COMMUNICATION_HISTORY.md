# Communication History

## Purpose

Communication history provides searchable operational context for who was notified, where the message went, and what provider state resulted.

History can be filtered by:

- domain.
- guild.
- channel.
- member.
- deployment.
- patrol.
- application.
- qualification.
- moderator.
- administrator.

## Current Implementation

The Communication Center and Discord Operations Center use `Communication`, `CommunicationDelivery`, and `CommunicationAttempt` records as the history source.

History should not be confused with audit logs. Audit logs explain meaningful administrative or operational actions. Communication history explains message delivery.

