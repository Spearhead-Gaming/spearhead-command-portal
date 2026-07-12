# Spearhead Command Portal Documentation

This repository contains the planning and architecture documentation for the Spearhead Command Portal.

The Spearhead Command Portal is a Discord-first, modular community management platform for Spearhead Gaming. It is designed to manage personnel, rosters, qualifications, operations, campaigns, documents, notifications, and Discord workflows while remaining easy to expand over time.

## Documentation Structure

- `00-overview/` - project vision, product requirements, principles, glossary
- `01-architecture/` - system architecture, modules, database, API, security, Discord
- `02-ui/` - design system, navigation, dashboards, components
- `03-modules/` - detailed module specifications
- `04-development/` - coding, deployment, testing, Prisma, MariaDB standards
- `05-roadmap/` - MVP, version roadmap, future expansion
- `06-community/` - community workflow discovery and implementation order
- `06-integrations/` - Discord interaction, command, mapping, and security documentation
- `08-specifications/` - cross-cutting technical and workflow specifications
- `09-workflows/` - definitive operational workflow documentation
- `adr/` - architecture decision records

## Workflow Documentation

The workflow library in `09-workflows/` is the authoritative operational reference for how Spearhead processes move through the portal.

Read it before implementing workflow-related changes, especially changes involving personnel, applications, qualifications, events, attendance, campaigns, S3, documents, Discord automation, notifications, administration, dashboards, or deployment operations.

Start with `09-workflows/README.md` and `09-workflows/00-Workflow-Standards.md`, then open the specific workflow document for the process being changed.

## Phase 3 UX Simplification

Phase 3 preparation documents the current UX complexity, route inventory,
workflow inventory, persona matrix, canonical terminology, and implementation
backlog for simplifying the portal without removing working capability.

- [Phase 3 UX Complexity Audit](08-specifications/PHASE_3_UX_COMPLEXITY_AUDIT.md)
- [Phase 3 Workflow Inventory](08-specifications/PHASE_3_WORKFLOW_INVENTORY.md)
- [Phase 3 Persona UX Matrix](08-specifications/PHASE_3_PERSONA_UX_MATRIX.md)
- [Phase 3 Backlog](08-specifications/PHASE_3_BACKLOG.md)
- [Canonical Terminology](02-ui/CANONICAL_TERMINOLOGY.md)
- [Phase 3 UX Simplification Roadmap](05-roadmap/PHASE_3_UX_SIMPLIFICATION.md)
- [Global App Shell](02-ui/GLOBAL_APP_SHELL.md)
- [Navigation Architecture](02-ui/NAVIGATION_ARCHITECTURE.md)
- [Page Layout Standards](02-ui/PAGE_LAYOUT_STANDARDS.md)
- [Drawer and Modal Standards](02-ui/DRAWER_AND_MODAL_STANDARDS.md)
- [Responsive Layout Standards](02-ui/RESPONSIVE_LAYOUT_STANDARDS.md)
- [Route Compatibility Map](02-ui/ROUTE_COMPATIBILITY_MAP.md)
- [Design System Foundations](02-ui/DESIGN_SYSTEM_FOUNDATIONS.md)
- [Design Tokens](02-ui/DESIGN_TOKENS.md)
- [Typography Standards](02-ui/TYPOGRAPHY_STANDARDS.md)
- [Spacing and Density](02-ui/SPACING_AND_DENSITY.md)
- [Button and Action Standards](02-ui/BUTTON_AND_ACTION_STANDARDS.md)
- [Card Standards](02-ui/CARD_STANDARDS.md)
- [Status and Badge Standards](02-ui/STATUS_AND_BADGE_STANDARDS.md)
- [Component Migration Map](02-ui/COMPONENT_MIGRATION_MAP.md)
- [Phase 3 Final Validation Report](08-specifications/PHASE_3_FINAL_VALIDATION_REPORT.md)
- [Phase 3 Route Validation Matrix](08-specifications/PHASE_3_ROUTE_VALIDATION_MATRIX.md)
- [Phase 3 Defect Backlog](08-specifications/PHASE_3_DEFECT_BACKLOG.md)
- [Phase 3 UAT Plan](08-specifications/PHASE_3_UAT_PLAN.md)
- [Phase 3 Release Readiness Checklist](08-specifications/PHASE_3_RELEASE_READINESS_CHECKLIST.md)
- [Phase 3 Accessibility Report](08-specifications/PHASE_3_ACCESSIBILITY_REPORT.md)
- [Phase 3 Responsive Validation](08-specifications/PHASE_3_RESPONSIVE_VALIDATION.md)
- [Phase 3 Workflow Step Count Report](08-specifications/PHASE_3_WORKFLOW_STEP_COUNT_REPORT.md)
- [Phase 3 Security and Permission Validation](08-specifications/PHASE_3_SECURITY_AND_PERMISSION_VALIDATION.md)

## Phase 4 Discord Gateway Platform

Phase 4 expands Discord from discrete REST/webhook workflows into a managed, real-time observation platform. Gateway remains supplemental; the Portal continues to own operational data and permissions.

- [Discord Gateway Event Platform](06-integrations/discord/DISCORD_GATEWAY_EVENT_PLATFORM.md)
- [Discord Gateway Event Registry](06-integrations/discord/DISCORD_GATEWAY_EVENT_REGISTRY.md)
- [Discord Gateway Event Envelope](06-integrations/discord/DISCORD_GATEWAY_EVENT_ENVELOPE.md)
- [Discord Gateway Queue](06-integrations/discord/DISCORD_GATEWAY_QUEUE.md)
- [Discord Gateway Health](06-integrations/discord/DISCORD_GATEWAY_HEALTH.md)
- [Discord Gateway Runbook](06-integrations/discord/DISCORD_GATEWAY_RUNBOOK.md)
- [Discord Intents And Features](06-integrations/discord/DISCORD_INTENTS_AND_FEATURES.md)
- [Discord Event Management](06-integrations/discord/DISCORD_EVENT_MANAGEMENT.md)
- [Discord Event Runbook](06-integrations/discord/DISCORD_EVENT_RUNBOOK.md)
- [Discord Moderation Platform](06-integrations/discord/DISCORD_MODERATION_PLATFORM.md)
- [Discord Moderation Policies](06-integrations/discord/DISCORD_MODERATION_POLICIES.md)
- [Discord Application Integration](06-integrations/discord/DISCORD_APPLICATION_INTEGRATION.md)
- [Discord Application Commands](06-integrations/discord/DISCORD_APPLICATION_COMMANDS.md)
- [Discord Application Security](06-integrations/discord/DISCORD_APPLICATION_SECURITY.md)
- [Discord Preflight](06-integrations/discord/DISCORD_PREFLIGHT.md)
- [Discord Diagnostics](06-integrations/discord/DISCORD_DIAGNOSTICS.md)
- [Discord Platform Operations Runbook](06-integrations/discord/DISCORD_PLATFORM_OPERATIONS_RUNBOOK.md)
- [Discord Platform Rollout](06-integrations/discord/DISCORD_PLATFORM_ROLLOUT.md)
- [Phase 4 Discord Platform Validation](08-specifications/PHASE_4_DISCORD_PLATFORM_VALIDATION.md)
- [Phase 4 Discord Release Readiness](08-specifications/PHASE_4_DISCORD_RELEASE_READINESS.md)
- [Phase 4 Discord UAT Plan](08-specifications/PHASE_4_DISCORD_UAT_PLAN.md)

## Core Technology Direction

- Next.js
- React
- Tailwind CSS
- shadcn/ui
- MariaDB
- Prisma ORM
- Discord OAuth
- Discord.js Bot
- Docker / Plesk / Cloudflare

## Product Rule

The portal should reduce work, not create it.

Common member and leadership tasks should be simple, fast, and Discord-integrated wherever possible.
