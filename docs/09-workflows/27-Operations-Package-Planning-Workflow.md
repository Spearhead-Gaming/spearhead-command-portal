# Operations Package Planning Workflow

## Purpose

Operations Package Planning gives S3 one weekly workspace for preparing a Deployment Week before any publishing or Discord delivery happens.

This workflow is Phase 2 Epic 5A only. It does not implement readiness scoring, operational health, publishing, Discord publishing, commander's intent assessment, or decision support.

## Owner

Each Deployment Week owns exactly one Operations Package. The portal reuses `DeploymentWeek` as the package anchor instead of introducing a duplicate package model.

Route:

```text
/operations/packages/[campaignId]/week/[weekNumber]
```

## Planning Flow

```text
Deployment
v
Operational Week
v
Planning
v
Tasking
v
Resources
v
Review
```

Review is the final planning state for Epic 5A. Publishing is a later Epic 5 sub-phase.

## Package Contents

- Overview
- Planning
- Weekend Operation
- Weekly Tasking
- Unit Taskings
- Resources
- CONOP
- Deployment Resources
- Zeus Assignment
- Attendance and RSVP
- Activity
- History

## Planning Fields

- Planning Notes
- Operational Objectives
- Planning Assumptions
- Friendly Situation
- Enemy Situation
- Intelligence Summary
- Logistics
- Weather
- Special Instructions
- Operational Notes

## Unit Tasking

Every active unit participates by default. S3 does not choose participating units during weekly planning.

When package structure is synced, the portal ensures the linked Weekend Operation has one Weekly Tasking and one Unit Tasking row for each active unit.

## Resources and CONOP

Deployment Resources inherit into the Operations Package. Week-specific overrides use event-scoped Deployment Resource records.

CONOP is a file or external link attached to the weekly package, not primarily a rich editor record.

## Activity and Audit

The portal audits:

- Operations Package created
- Planning updated
- Weekly Tasking created
- Weekly Tasking updated
- Unit Tasking updated
- Resource updated
- CONOP updated
- Zeus assigned

## Permissions

```text
operations.package.view
operations.package.edit
operations.planning.view
operations.planning.edit
operations.tasking.manage
operations.resources.manage
operations.zeus.assign
```

Roles remain collections of permissions. Do not authorize by role name.
