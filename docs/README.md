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
