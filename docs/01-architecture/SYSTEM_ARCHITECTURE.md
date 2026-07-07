# System Architecture

## Architecture Style

The Spearhead Command Portal should begin as a modular monolith.

This keeps development simple while preserving clean internal boundaries for future expansion.

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

## Expansion Strategy

Future modules must be added through:
- new database models
- service layer additions
- navigation registration
- permission registration
- optional Discord command registration
