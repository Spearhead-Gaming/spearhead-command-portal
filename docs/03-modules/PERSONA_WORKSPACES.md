# Persona Workspaces

## Purpose

Persona Workspaces organize existing Portal modules around the user's current responsibility.

They are not separate modules with separate data. They compose the existing dashboard, personnel, operations, training, community, administration, notification, and Discord services.

## Current Workspaces

| Workspace | Primary Module Emphasis |
| --- | --- |
| My Portal | Member events, readiness, qualifications, resources, notifications |
| Patrol Leader | Patrol execution and AAR follow-up |
| Unit Leadership | Unit readiness, roster, attendance, qualification gaps |
| Personnel | Profile, roster, transfer, LOA, and identity queues |
| Operations | S3 planning, package readiness, publication, AAR review |
| Deployment Creator | Deployment progression, resources, releases, next-week planning |
| Zeus | Execution resources, CONOP, OPORD, mod preset, timeline |
| Training | Qualification matrix, signoffs, requirements, expirations |
| Command | Cross-domain risk, health, decisions, recommendations |
| Community | Cases, appeals, incidents, moderation workload |
| Administration | Users, roles, Discord identity, delivery failures, audit |
| Developer | Builder, diagnostics, registries, development-only controls |

## Domain Rules

- Workspaces call existing services.
- Workspaces do not own operational data.
- Workspaces do not grant permissions.
- Workspace-specific quick actions link to existing routes and services.
- My Work aggregates existing actionable signals instead of persisting duplicate tasks.

## Future Module Integration

Future epics should add workspace-aware summaries through each domain service rather than placing domain calculations in React components.
