# Case Type Provider Guide

## Purpose

Case type providers define how a case category behaves without changing the core case engine.

## Provider Fields

A case type should define:

- id
- display name
- description
- owning domain
- allowed statuses
- allowed transitions
- default priority
- assignment rules
- permission requirements
- notification hooks
- closure requirements
- evidence requirements
- decision types

## Rules

- Providers must not execute Discord actions.
- Providers must not bypass permission checks.
- Providers must not hard-code role names.
- Providers should keep workflow policy separate from UI components.

## Adding A Future Case Type

1. Define the case type in the registry.
2. Define status transition rules.
3. Add permissions if the workflow requires new capabilities.
4. Add service methods only for domain-specific behavior.
5. Update workflows and module documentation.

