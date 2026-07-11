# Operational Health Workflow

## Purpose

Operational Health answers:

```text
How healthy is the current Deployment?
```

It is separate from Operations Readiness and Publication Readiness. Readiness evaluates whether a weekly package is complete enough to proceed. Health evaluates execution signals across planning, execution, and community conditions.

Operational Health does not implement Commander's Intent assessment or Command Decision Support. Those belong to later Epic 5E work.

## Provider Architecture

Operational Health is provider-based and consumes the Universal Rule Engine.

```text
RuleEngineService
v
Registered Health Providers
v
HealthRuleResult[]
v
Scores, Status, Trends, Recommendations
```

The core engine discovers registered providers and returns standardized rule results and count summaries. The Operational Health consumer derives health scores, status labels, trends, warnings, critical issues, and recommendations from those results. Future modules such as logistics, intelligence, medical, maintenance, communications, and training can register providers without UI changes or core scoring rewrites.

Initial providers:

- `PlanningHealthProvider`
- `ExecutionHealthProvider`
- `CommunityHealthProvider`

## Health Rule Contract

Each provider returns standardized rule results:

```text
id
category
title
description
status
severity
message
recommendedAction
relatedEntityType
relatedEntityId
timestamp
```

Statuses:

```text
PASS
WARNING
FAIL
NOT_APPLICABLE
```

Severity:

```text
info
warning
critical
```

Providers do not calculate percentages. They report facts. The service derives category scores, overall score, status labels, warnings, critical issues, and recommendations.

## Health Categories

### Planning Health

Planning Health checks package condition and planning structure:

- Weekend Operation linked.
- Zeus assigned.
- Weekly Tasking exists.
- Unit Taskings are complete.
- CONOP is attached.
- Deployment resources are available.
- Current Arma 3 preset is available.
- Operations Package has no readiness blockers.

### Execution Health

Execution Health checks operation execution follow-through:

- Weekend Operation state is current.
- Patrol activity exists.
- Patrols are completed or closed.
- Required Patrol AARs are submitted.
- Submitted Patrol AARs are reviewed.
- AAR progression context exists when patrol activity exists.

### Community Health

Community Health checks community participation and staffing signals:

- Active members are visible.
- Active units exist.
- Active members have unit assignments.
- Weekend Operation RSVP coverage is healthy.
- Attendance records exist.
- Qualification provider integration is reserved for future deeper community intelligence.

## Scoring

The service scores only applicable rules.

Suggested scoring:

- `PASS` contributes full credit.
- `WARNING` contributes partial credit.
- `FAIL` contributes no credit and creates a critical issue.
- `NOT_APPLICABLE` is excluded from the denominator.

Status labels:

```text
Excellent
Good
Fair
Poor
Critical
```

Trend currently supports:

```text
Improving
Stable
Declining
```

The initial implementation reports stable until historical snapshots or persistent health state are introduced.

## Command Dashboard

The Operations Center should display:

- Planning Health.
- Execution Health.
- Community Health.
- Operational Readiness.
- Publication Readiness.
- Recommended Actions.
- Go / No-Go.
- Current deployment status and week.
- Pending Patrol and AAR reviews.

Health cards should be summary-first. Rule details belong in inspector drawers, expandable sections, or drill-down panels.

## Recommendations

Recommendations are derived directly from failing or warning health rules.

Examples:

- Upload missing CONOP.
- Assign Zeus.
- Complete Unit Taskings.
- Review Patrol AARs.
- Push RSVP reminders.
- Resolve unassigned active members.

These are health-derived operational recommendations only. They are not strategic decision support.

## Permissions

```text
operations.health.view
operations.health.manage
operations.center.view
operations.package.view
```

Never authorize by role name.

## Notifications

Reserved hooks:

- `planning.health.changed`
- `execution.health.changed`
- `community.health.changed`
- `operational.health.critical`
- `go_no_go.changed`

Only meaningful state changes should notify. Routine dashboard reads should not notify or audit.

## Audit

Audit meaningful health events only:

- Operational Health recalculated by an explicit user action.
- Health provider failure.
- Critical Health state entered.
- Critical Health resolved.

Avoid noisy audit logs for normal page loads.

## Service Boundary

Operations Package health methods belong behind `OperationsPackageService`:

- `getOperationalHealth()`
- `getPlanningHealth()`
- `getExecutionHealth()`
- `getCommunityHealth()`
- `getHealthSummary()`
- `getHealthRecommendations()`

UI components consume service output and must not duplicate health rules.
