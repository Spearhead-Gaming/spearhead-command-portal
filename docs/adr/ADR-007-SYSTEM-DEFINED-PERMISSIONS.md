# ADR-007: System-Defined Permissions and Admin-Created Roles

## Status

Accepted

## Context

The project owner clarified that permissions should be reusable capabilities that can be applied to created roles, rather than creating a fixed role for each action.

## Decision

The system will use system-defined permissions and admin-created roles.

Application logic will check permission keys, not role names.

Roles will be collections of permissions and may optionally be scoped to a unit when assigned to a user.

## Consequences

- Administrators can create custom roles without code changes.
- Spearhead can model real staff responsibilities more accurately.
- Unit-specific leadership roles can be scoped to a unit.
- Permission checks must happen server-side.
- Role names must never be used as authorization logic.
