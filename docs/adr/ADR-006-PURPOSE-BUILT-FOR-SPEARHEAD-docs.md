# ADR-006: Purpose-Built for Spearhead Gaming

## Status

Accepted

## Context

The project was initially discussed as either a configurable Milsim portal platform or a Spearhead-specific portal.

The project owner clarified that the system will only be created for the Spearhead Milsim community.

## Decision

The system will be purpose-built for Spearhead Gaming.

It will not be designed as a generic commercial SaaS or multi-community platform.

However, operational structures such as units, ranks, qualifications, permissions, and Discord mappings should remain configurable data where practical.

## Consequences

- Spearhead usability takes priority over generic flexibility
- Documentation should describe Spearhead workflows directly
- Multi-tenant support is out of scope
- Unit names should still not be hard-coded into business logic
- Future changes to Spearhead should be handled through configuration and seed data where possible
