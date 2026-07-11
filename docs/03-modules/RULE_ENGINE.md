# Rule Engine Module

## Purpose

The Rule Engine module provides reusable rule evaluation for readiness, health, compliance, inspections, and future operational intelligence.

It is not an Operations-only module. Operations is currently the first major consumer.

## Current Consumers

- Operational Readiness.
- Publication Readiness.
- Operational Health.

## Future Consumers

- Qualification Readiness.
- Unit Readiness.
- Attendance Readiness.
- Logistics.
- Maintenance.
- Intelligence.
- Medical.
- Communications.
- Compliance.
- Inspection Checklists.

## Boundaries

The Rule Engine:

- evaluates providers
- returns standardized results
- creates summary counts
- derives recommendations from warning/failing rules

The Rule Engine does not:

- render UI
- query Prisma directly
- send Discord messages
- authorize users
- calculate dashboard-specific percentages
- implement command decision support

Domain services remain responsible for permissions, context preparation, audit decisions, and UI-specific scoring.

## UI Components

Reusable rule UI components live under `src/components/rules`.

Domain modules can use:

- RuleStatusBadge
- RuleList
- RuleSummaryCard
- RecommendationPanel
- RuleInspectorDrawer
- RuleCategoryCard
