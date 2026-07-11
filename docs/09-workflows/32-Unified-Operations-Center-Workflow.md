# Unified Operations Center Workflow

## Purpose

The Unified Operations Center at `/operations` is the daily Command and Control dashboard for S3, Command Staff, and administrators.

It is not a CRUD interface. It consumes existing services and presents the most important operational signals in a modular widget layout.

## Questions Answered

The dashboard should answer within 10 seconds:

- What is happening?
- What needs attention?
- What should Command consider doing next?

## Data Sources

The Operations Center composes existing services:

- Operations Package Service.
- Rule Engine.
- Operational Health.
- Recommendation Engine.
- Patrol Service.
- S3/deployment services.
- Notification services.
- Personnel, attendance, and qualification dashboard services.

No business logic should be duplicated in the page component.

## Widget Registration

Operations Center widgets register metadata:

- id
- title
- icon
- priority
- permissions
- refresh interval
- size
- collapsed default
- data provider key

The dashboard renders visible widgets by permission and priority.

Future widget customization may persist:

- collapsed state
- hidden state
- pinned state
- ordering

## Dashboard Sections

The initial Command Dashboard includes:

- Command banner.
- Deployment summary.
- Operational Health.
- Operational Readiness.
- Publication Readiness.
- Go / No-Go.
- Command Recommendations.
- Current week and Weekend Operation context.
- Active patrols.
- Pending Patrol AAR reviews.
- Pending publications.
- Personnel readiness summary.
- Notifications and failed deliveries.
- Recent activity.
- Deployment timeline.

## Refresh Strategy

The dashboard uses server-rendered snapshots and widget refresh metadata.

Manual refresh is available through normal page reloads. Future realtime/polling work should use widget metadata and avoid unnecessary polling.

## Permissions

Relevant permissions:

- `operations.center.view`
- `operations.dashboard.customize`
- `operations.recommendations.view`
- `operations.health.view`
- `operations.readiness.view`
- `dashboard.widgets.manage`

Never authorize by role name.

## Audit

Dashboard reads should not create audit noise.

Audit only meaningful actions such as:

- dashboard layout saved
- widget customization changed
- recommendation dismissed
- recommendation resolved
- publication requested

## Future Expansion

Future work may add:

- persisted per-user widget preferences
- inspector drawer selection state
- widget-level refresh controls
- realtime refresh
- exportable command snapshots
