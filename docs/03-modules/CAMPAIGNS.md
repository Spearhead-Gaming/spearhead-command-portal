# Deployments Module

## Purpose

Group related operations into a readable deployment experience.

For Spearhead, campaigns are treated as Deployments. The database model remains `Campaign`, but the user-facing interface should say Deployment.

## Deployment Page

The `/operations/campaigns` page is a management workspace, not the Operations Center dashboard.
It should prioritize search, status/unit filters, create/view/edit/archive actions, and one-click inspection.
Operational awareness belongs on `/operations`.

Each deployment should show:
- Title
- Status
- Operation type/current phase
- Overview
- Story/background
- Unit Tasking coverage
- Operational timeline
- Weekly operations
- Upcoming weekend operation
- Patrol list
- Assigned Zeus
- Completed operations
- CONOP links
- AAR links
- Attendance statistics
- Media

## Deployment Resources

Deployment detail pages should include a Resources card for available operational materials:

- OPORD.
- Player Primer.
- Current Mod Preset.
- AO Map.
- Radio Plan.
- Additional files.

Authorized users should have a clear Manage Resources action. Resource updates must use the versioned Deployment Resources workflow rather than overwriting files or links.

## Inspector Pattern

Selecting a deployment from the management list should open an inspector drawer where practical. The full deployment detail route remains available for deeper work, but the drawer preserves list context for overview, resources, weekly operations, attendance, activity, and history.

## Deployment Statuses

- Planning
- Preparing
- Active
- Completed
- Archived

## Goal

Deployment pages should be easy for members to read and useful for S3 to manage.

## Spearhead Rules

- Deployments are configurable multi-week operations.
- Every active unit participates automatically.
- Do not select participating units on the deployment.
- Use Unit Tasking to describe each unit's weekly objective.
- Zeus assignment supports creator as Zeus, assigned S3 Zeus, or unassigned.
- Operational weeks are derived from deployment duration and linked event week numbers.
- Weekend operations generally do not require AARs.
- Patrols may require AARs and should surface in the patrol AAR queue.
