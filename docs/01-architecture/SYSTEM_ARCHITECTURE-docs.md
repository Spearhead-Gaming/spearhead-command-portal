# System Architecture

## Architecture Style

The Spearhead Command Portal should begin as a modular monolith.

This keeps development simple while preserving clean internal boundaries for future Spearhead expansion.

## Product Scope

The system is purpose-built for Spearhead Gaming.

It should not be architected as a multi-tenant SaaS platform. There is no requirement for multiple communities, billing, customer isolation, or marketplace support.

However, the internal data model should avoid unnecessary hard-coding so Spearhead can evolve over time.

## Major Layers

### Web Application
- Next.js application
- React UI
- Server components where appropriate
- API routes for backend actions

### Domain Services
Business logic should live in service modules, not directly in pages.

Examples:
- PersonnelService
- UnitService
- QualificationService
- AttendanceService
- CampaignService
- NotificationService
- DiscordService

### Database
- MariaDB
- Prisma ORM
- Relational schema
- Migrations managed through Prisma

### Discord Bot
- Discord.js
- Slash commands
- Buttons/select menus
- Notification routing
- Channel mapping

### Background Jobs
Used for:
- scheduled reminders
- attendance closing
- notification retries
- Discord sync
- cleanup tasks

## Deployment Model

Recommended:
- Dockerized app
- MariaDB service
- Optional Redis later for queues
- Plesk hosting
- Cloudflare DNS and security

## Configuration Strategy

Spearhead-specific setup should be represented as seed/configuration data:
- units
- ranks
- positions
- permissions
- roles
- attendance statuses
- campaign statuses
- Discord server mappings
- Discord channel mappings

## Expansion Strategy

Future Spearhead modules must be added through:
- new database models
- service layer additions
- navigation registration
- permission registration
- optional Discord command registration
