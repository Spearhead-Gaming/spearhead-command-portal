# Workflow Documentation Library

## Purpose

This library is the definitive operational workflow reference for the Spearhead Command Portal. It explains how real Spearhead processes move through the portal from trigger to completion, including actors, permissions, UI surfaces, services, database changes, notifications, Discord behavior, audit requirements, recovery paths, and future expansion.

Use this library when planning, implementing, reviewing, testing, or documenting any workflow-related change.

## How To Use This Library

1. Start with [00-Workflow-Standards.md](00-Workflow-Standards.md) to understand the shared workflow contract.
2. Open the workflow document that matches the operational process being changed.
3. Cross-check the linked module, architecture, UI, and integration documentation.
4. Confirm permission keys, audit events, notification events, and database models before implementation.
5. Update the relevant workflow document when behavior, states, permissions, notifications, or Discord interactions change.

## Relationship To Other Documentation

| Documentation Area | Relationship |
| --- | --- |
| [Engineering](../engineering) | Defines build principles, service boundaries, permissions, Discord, notifications, and coding standards. |
| [Architecture](../01-architecture) | Defines system architecture, database models, permission model, security, audit logging, notifications, automations, and Discord architecture. |
| [UI](../02-ui) | Defines screens, navigation, inspector drawers, dashboard widgets, interaction patterns, and component usage. |
| [Modules](../03-modules) | Defines module-level purpose, fields, and feature scope. |
| [Development](../04-development) | Defines Prisma, MariaDB, deployment, testing, and production-readiness practices. |
| [Community](../06-community) | Captures original community workflow analysis and implementation order. |
| [Discord Integrations](../06-integrations/discord) | Defines Discord interactions, slash commands, channel mappings, role sync, and security rules. |
| [Specifications](../08-specifications) | Contains cross-cutting specifications, including the consolidated workflow specification. |
| [ADRs](../adr) | Records architecture decisions that affect workflow design. |

## Workflow Index

| File | Workflow |
| --- | --- |
| [00-Workflow-Standards.md](00-Workflow-Standards.md) | Shared workflow standards and documentation conventions |
| [01-Recruit-Lifecycle.md](01-Recruit-Lifecycle.md) | Recruit application through ready state |
| [02-Member-Lifecycle.md](02-Member-Lifecycle.md) | Join, transfer, promotion, LOA, return, status change, separation |
| [03-Personnel-Management.md](03-Personnel-Management.md) | Create, edit, assign, merge, deactivate member records |
| [04-Qualification-Lifecycle.md](04-Qualification-Lifecycle.md) | Qualification request, signoff, award, expiration, renewal, revocation |
| [05-Operations-Lifecycle.md](05-Operations-Lifecycle.md) | Deployment-to-weekend-operation-to-patrol/AAR operational lifecycle |
| [06-Attendance-Workflow.md](06-Attendance-Workflow.md) | RSVP, final attendance, lock, reports, readiness |
| [07-Campaign-Workflow.md](07-Campaign-Workflow.md) | Deployment creation, weekly operations, tasking, progress, closure |
| [08-S3-Workflow.md](08-S3-Workflow.md) | Operation planning, CONOP, review, publish, patrol AAR |
| [09-Document-Workflow.md](09-Document-Workflow.md) | Draft, review, publish, acknowledgement, version, archive |
| [10-Application-Workflow.md](10-Application-Workflow.md) | Configurable forms, submissions, comments, approvals |
| [11-RASP-Workflow.md](11-RASP-Workflow.md) | Eligibility, application, selection, training, transfer |
| [12-Transfer-Workflow.md](12-Transfer-Workflow.md) | Member transfer approval and roster update |
| [13-Promotion-Workflow.md](13-Promotion-Workflow.md) | Optional rank/promotion request, review, approval, update |
| [14-Discord-Automation.md](14-Discord-Automation.md) | Portal-to-Discord delivery and Discord-to-portal interactions |
| [15-Notification-Workflow.md](15-Notification-Workflow.md) | Notification creation, delivery records, retry, audit |
| [16-Administration-Workflow.md](16-Administration-Workflow.md) | Users, roles, permissions, effective access, audit review |
| [17-Dashboard-Workflow.md](17-Dashboard-Workflow.md) | Role-aware dashboard refresh and widget updates |
| [18-Developer-Workflow.md](18-Developer-Workflow.md) | Local development, bootstrap access, seed, migration, deployment |
| [19-Weekly-Tasking-Workflow.md](19-Weekly-Tasking-Workflow.md) | Weekly operation tasking and unit tasking |
| [20-Patrol-AAR-Workflow.md](20-Patrol-AAR-Workflow.md) | Patrol event and AAR submission |
| [21-Unit-Readiness-Workflow.md](21-Unit-Readiness-Workflow.md) | Unit-scoped qualification and attendance readiness |
| [22-Deployment-Resources-Workflow.md](22-Deployment-Resources-Workflow.md) | Deployment resource links, uploads, versions, and current mod preset |
| [23-Patrol-Workflow.md](23-Patrol-Workflow.md) | Lightweight portal-side patrol lifecycle |
| [24-Discord-Patrol-Command-Workflow.md](24-Discord-Patrol-Command-Workflow.md) | `/patrol` slash command and button workflow |
| [25-Deployment-Progression-Workflow.md](25-Deployment-Progression-Workflow.md) | AAR-informed deployment progression decisions |
| [26-Discord-AAR-Screenshot-Continuation-Workflow.md](26-Discord-AAR-Screenshot-Continuation-Workflow.md) | Discord AAR screenshot continuation session |
| [27-Operations-Package-Planning-Workflow.md](27-Operations-Package-Planning-Workflow.md) | Weekly Operations Package planning workspace |
| [28-Operations-Readiness-Workflow.md](28-Operations-Readiness-Workflow.md) | Operations Package readiness and Go / No-Go validation |
| [29-Operations-Release-Workflow.md](29-Operations-Release-Workflow.md) | Operations Package publishing, release history, and amendments |
| [30-Operational-Health-Workflow.md](30-Operational-Health-Workflow.md) | Operational Health provider engine and Command Dashboard health signals |
| [31-Commanders-Intent-Workflow.md](31-Commanders-Intent-Workflow.md) | Commander's Intent planning, assessment, and next-week recommendation workflow |
| [32-Unified-Operations-Center-Workflow.md](32-Unified-Operations-Center-Workflow.md) | Unified Operations Center widget dashboard and command refresh workflow |
| [33-Communications-Center-Workflow.md](33-Communications-Center-Workflow.md) | Unified communication pipeline, announcements, templates, preferences, and delivery review |
| [34-Case-Management-Workflow.md](34-Case-Management-Workflow.md) | Universal case engine lifecycle, assignment, timeline, decisions, and closure |
| [35-Moderation-Workflow.md](35-Moderation-Workflow.md) | Portal-recorded moderation, warning, Discord kick, and provider-pending actions |
| [36-Incident-Management.md](36-Incident-Management.md) | Incident report intake and case creation |
| [37-Appeals-Workflow.md](37-Appeals-Workflow.md) | Appeal case creation, review, and preservation of original decisions |
| [38-Evidence-Management.md](38-Evidence-Management.md) | Evidence metadata, file/link handling, visibility, and non-destructive history |
| [39-Member-Profile-Workflow.md](39-Member-Profile-Workflow.md) | Service-record profile, Discord display name, optional rank, and restricted sections |
| [40-Assignment-and-Transfer-Workflow.md](40-Assignment-and-Transfer-Workflow.md) | Assignment history preservation and case-backed transfer review |
| [41-Qualification-Requirements.md](41-Qualification-Requirements.md) | Unit- and position-scoped qualification requirements |
| [42-Unit-Attendance-Workflow.md](42-Unit-Attendance-Workflow.md) | Unit-scoped attendance policy and LOA-aware reporting |
| [43-Leave-of-Absence-Workflow.md](43-Leave-of-Absence-Workflow.md) | LOA request, approval, return, and readiness handling |
| [44-Discord-Member-Event-Workflow.md](44-Discord-Member-Event-Workflow.md) | Gateway member join/update/leave identity workflow |

## Authoritative Rule

For workflow-related implementation decisions, this library should be read before code changes. If this library conflicts with module or architecture documentation, pause and reconcile the documentation before implementing behavior.
