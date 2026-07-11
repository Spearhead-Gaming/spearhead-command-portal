# AGENTS.md

# Spearhead Command Portal

## Project Overview

The Spearhead Command Portal is a comprehensive operations management platform for a military simulation (MILSIM) community.

The portal is the **authoritative source of truth** for all operational, personnel, planning, readiness, attendance, qualification, deployment, and Discord automation data.

Discord is an extension of the Portal—not the other way around.

---

# Mission

The goal of this project is to provide a modern command and staff system that mirrors real military operational planning while remaining practical for a gaming community.

The Portal should enable:

- Community Administration
- Personnel Management
- Unit Management
- Qualifications
- Attendance
- Deployments
- Weekly Operations
- Patrols
- Patrol AARs
- S3 Planning
- Operational Readiness
- Discord Automation
- Operational History

---

# Core Philosophy

The Portal is the source of truth.

Discord is the communication layer.

Never allow Discord to own operational data.

Discord actions should always synchronize back to the Portal.

---

# Architectural Principles

## Thin UI

Business logic belongs in services.

Pages should orchestrate.

Components should render.

Do not duplicate business logic.

---

## Service Layer

Domain logic belongs in reusable services.

Examples:

- OperationsPackageService
- PatrolService
- AttendanceService
- QualificationService
- NotificationService
- DiscordInteractionService
- DiscordInteractionSessionService

Never duplicate service logic.

---

## Permission System

Always use permission keys.

Never authorize by:

- Discord role name
- Unit name
- Rank name

Examples:

operations.package.publish

patrols.create

qualifications.manage

attendance.view

---

## Portal Identity

Discord ID is the canonical external identity.

OAuth login and Discord member sync must converge on one User.

Never create duplicate users.

Bots are excluded.

---

# Discord Philosophy

Discord exists to:

- notify
- interact
- collect quick input
- automate routine workflows

Discord does NOT own:

- Deployments
- Patrols
- Qualifications
- Attendance
- Permissions
- Personnel

Every Discord interaction should update Portal data.

---

# Patrol Doctrine

Patrols are lightweight.

Patrols are NOT Weekend Operations.

Patrols:

- can be created by authorized members
- can occur simultaneously
- require AAR
- require map screenshot
- inform Deployment progression

Weekend Operations do NOT require AARs.

---

# Deployment Doctrine

Deployments contain:

Operational Weeks

Each Week contains:

Operations Package

An Operations Package contains:

- Weekend Operation
- Weekly Tasking
- Unit Taskings
- CONOP
- OPORD
- Player Primer
- Mod Preset
- Maps
- Resources
- Zeus Assignment

---

# S3 Planning

Planning workflow:

Deployment

↓

Operational Week

↓

Planning

↓

Tasking

↓

Resources

↓

Validation

↓

Readiness Review

↓

Approval

↓

Publish

↓

Monitor

↓

Patrol Intelligence

↓

Next Week Planning

---

# Operational Readiness

Operational Readiness measures planning completeness.

Examples:

- Zeus assigned
- Tasking complete
- Resources attached

It does NOT measure execution.

---

# Publication Readiness

Publication Readiness answers:

Can this Operations Package safely be published?

Examples:

- Discord configured
- Permissions valid
- Package complete

---

# Operational Health

Operational Health measures the current state of a Deployment.

Three categories:

Planning Health

Execution Health

Community Health

These are separate from Readiness.

---

# Commander's Intent

Each Operational Week has one Commander's Intent.

Intent is assessed after Patrol AAR review.

Intent outcomes influence:

- Deployment progression
- Next Week planning
- Operational Health

---

# Operations Releases

Publishing creates immutable Operations Releases.

Release history is preserved.

Amendments create new versions.

Never overwrite historical releases.

---

# UI Philosophy

Avoid clutter.

Prefer:

Inspector Drawers

Cards

Expandable Sections

Progressive Disclosure

Context Panels

Avoid:

Huge forms

Dense tables

Deep nesting

Information overload

---

# Design Language

Use:

Dark tactical UI

Rounded cards

Clear spacing

Readable typography

Status badges

Progress indicators

Inspector drawers

Planning workspaces

The UI should resemble a command center, not a CRUD application.

---

# Notifications

Notifications are informational.

Audit Logs are historical.

Do not confuse the two.

Clearing notifications must never delete audit history.

---

# Audit Logs

Audit meaningful actions only.

Avoid logging every calculated event.

Examples:

Deployment Published

Patrol Started

Patrol Completed

AAR Reviewed

Qualification Approved

Discord Sync Completed

---

# Documentation

Every significant feature update must update documentation.

Relevant folders:

docs/03-modules/

docs/06-community/

docs/06-integrations/discord/

docs/08-specifications/

docs/09-workflows/

docs/10-spearhead-doctrine/

---

# Development Standards

Every implementation should:

- compile
- lint
- typecheck
- build successfully

If Prisma changes:

Run schema validation.

---

# Preferred Workflow

Large features should be broken into Epics.

One Epic per implementation.

Complete:

Implementation

↓

Documentation

↓

Validation

↓

Summary

before moving to the next Epic.

---

# Final Report

Every implementation should end with:

## Files Changed

## Routes Added

## Components Added

## Services Added

## Schema Changes

## Permission Changes

## Documentation Updated

## Validation Results

## Remaining TODOs

---

# Things to Avoid

Do not:

- Duplicate business logic
- Hardcode Discord role names
- Hardcode Unit names
- Authorize from Discord roles
- Store files in database blobs
- Overbuild schema
- Build giant forms
- Create dead buttons
- Leave placeholder routes without explanation
- Break existing workflows

---

# Preferred Architecture

Portal

↓

Domain Services

↓

Repositories / Prisma

↓

Database

Discord

↓

Interaction Layer

↓

Portal Services

↓

Database

Never bypass the Portal.

---

# Long-Term Vision

The Spearhead Command Portal should evolve into a complete military staff planning system that supports:

- Personnel Management
- Operational Planning
- Deployment Management
- Campaign Progression
- Operational Intelligence
- Readiness Management
- Training Management
- Discord Automation
- Historical Operational Record

The Portal should feel like professional command-and-control software while remaining practical and intuitive for a gaming community.