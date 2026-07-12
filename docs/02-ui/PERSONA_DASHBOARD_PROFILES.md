# Persona Dashboard Profiles

Dashboard profiles describe default emphasis for each workspace.

## Profile Fields

- Workspace id and label.
- Description shown in the dashboard header.
- Default visible widget ids.
- Collapsed widget ids.
- Emphasis terms.
- Primary action label.

## Rendering Rules

- Dashboard data still comes from domain services.
- Widget visibility remains permission-aware.
- Workspace profile changes ranking and emphasis, not authorization.
- Critical cross-domain delivery failures may remain visible across workspaces.

## Current Implementation

Phase 3 Epic 4 adds persona-aware dashboard headers, top KPI rows, quick actions, and My Work aggregation. Future dashboard-builder work can map the profile metadata onto persisted widget layout preferences.
