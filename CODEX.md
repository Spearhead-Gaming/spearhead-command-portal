# CODEX.md

# Spearhead Command Portal --- AI Development Guide

## Project Overview

The Spearhead Command Portal is a custom-built community management
platform for the Spearhead Gaming Arma 3 Milsim community.

The portal is the authoritative source of truth for personnel, units,
qualifications, attendance, campaigns, operations, S3 workflows, and
administration.

Discord is the primary communication platform. The Portal is the
authoritative system of record.

------------------------------------------------------------------------

# Read First

Before implementing any feature, read the documentation in this order:

1.  docs/engineering/
2.  docs/00-overview/
3.  docs/01-architecture/
4.  docs/02-ui/
5.  docs/03-modules/
6.  docs/04-development/
7.  docs/05-roadmap/
8.  docs/06-community/
9.  docs/06-integrations/
10. docs/07-reference/
11. docs/08-specifications/
12. docs/09-workflows/
13. docs/adr/

Read docs/09-workflows before implementing any workflow-related changes.

Documentation is the source of truth. If code and documentation
disagree, update the code unless instructed otherwise.

------------------------------------------------------------------------

# Technology Stack

Frontend - Next.js (App Router) - React - TypeScript - Tailwind CSS -
shadcn/ui - Lucide Icons

Backend - Next.js Route Handlers - Prisma ORM - MariaDB

Authentication - Discord OAuth

Deployment - Docker - Linux - Nginx

------------------------------------------------------------------------

# Project North Star

Every feature should help achieve one or more of these goals:

-   Reduce administrative workload
-   Reduce repetitive tasks
-   Reduce unnecessary clicks
-   Reduce Discord clutter
-   Preserve user context
-   Improve operational readiness
-   Improve member experience
-   Remain modular and expandable

------------------------------------------------------------------------

# Engineering Principles

-   Context over navigation
-   Components before pages
-   Services before business logic in UI
-   Permissions before convenience
-   Consistency over cleverness
-   Reuse before duplication

Preferred interaction order:

1.  Inline editing
2.  Expandable sections
3.  Inspector drawers
4.  Small modals
5.  Full workspaces

------------------------------------------------------------------------

# Repository Rules

Always:

-   Reuse shared components
-   Use the service layer
-   Enforce permissions server-side
-   Audit sensitive actions
-   Keep documentation current
-   Build incrementally

Never:

-   Hard-code business rules
-   Hard-code Spearhead units
-   Hard-code permission logic
-   Authorize by role names
-   Duplicate components
-   Duplicate services
-   Store authoritative data only in Discord

------------------------------------------------------------------------

# Permission Philosophy

Permissions are the security model.

Roles are collections of permissions.

Never authorize using role names.

Support scoped permissions where applicable.

------------------------------------------------------------------------

# Discord Philosophy

Discord is a first-class client.

Discord is not the database.

Every interaction must:

-   Validate identity
-   Check permissions
-   Call portal services
-   Record audit events where appropriate

------------------------------------------------------------------------

# Development Workflow

For every task:

Understand -> Plan -> Implement -> Test -> Document -> Review

Only complete one milestone at a time.

------------------------------------------------------------------------

# Coding Standards

-   TypeScript strict mode
-   Strong typing
-   Small focused components
-   Small focused services
-   Readable code over clever code
-   Comment why, not what
-   Avoid magic values
-   Consistent naming

------------------------------------------------------------------------

# Definition of Done

A task is complete when:

-   Documentation remains accurate
-   Permissions are enforced
-   Error handling exists
-   Shared components are reused
-   No obvious TODOs remain
-   Code is formatted
-   Types are correct

------------------------------------------------------------------------

# What Codex Should Never Assume

Never assume:

-   Unit names are permanent
-   Discord channels always exist
-   Every member belongs to only one unit
-   Every event belongs to a campaign
-   A qualification never expires
-   A role grants every permission

------------------------------------------------------------------------

# Final Instruction

When in doubt:

1.  Read the documentation.
2.  Choose the simplest maintainable solution.
3.  Preserve consistency.
4.  Keep the project modular.
5.  Ask for clarification instead of guessing when documentation is
    ambiguous.
