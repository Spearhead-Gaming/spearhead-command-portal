# Command Decision Support System

## Purpose

The Command Decision Support System (CDSS) helps command staff answer:

```text
What should we pay attention to right now?
```

CDSS is a recommendation engine, not an AI assistant and not an automation authority. It never makes decisions automatically.

## Inputs

CDSS consumes:

- Universal Rule Engine output.
- Operational Health.
- Operational Readiness.
- Publication Readiness.
- Patrol and Patrol AAR state.
- Attendance and RSVP signals.
- Qualification signals when providers are added.
- Deployment and Operations Package state.
- Future provider outputs.

## Architecture

```text
OperationsPackageService
v
Rule Engine / Health / Readiness
v
Recommendation Providers
v
CommandRecommendation records
v
Commander Dashboard
```

Recommendation providers translate warning and failure rules into persistent recommendations. The recommendation records preserve lifecycle history.

## Recommendation Lifecycle

```text
Generated
v
Active
v
Dismissed / Resolved / Expired
v
History
```

Recommendations should not disappear without history. Stale active recommendations may expire automatically when their supporting rule no longer applies. Human-dismissed and human-resolved recommendations should not be silently reopened.

## Data Model

`CommandRecommendation` stores:

- category
- priority
- severity
- title
- summary
- details
- recommended action
- reason
- related entity
- supporting rules
- lifecycle timestamps
- campaign/week scope

`CommanderIntentAssessment` stores:

- assessment status
- assessment summary
- supporting evidence
- lessons learned
- next-week recommendations
- assessor and timestamp

## Human Authority

CDSS recommendations are informational. Staff can dismiss or resolve recommendations, but the system does not:

- approve deployments
- select operation branches
- publish announcements
- change roster or attendance data
- decide commander's intent assessment

## Permissions

```text
recommendations.view
recommendations.manage
operations.command.view
operations.command.manage
```

Domain permissions such as `operations.package.view` and `operations.health.view` still apply.

Never authorize by role name.

## Audit

Audit meaningful events:

- recommendation generated when critical
- recommendation dismissed
- recommendation resolved
- intent assessment updated

Avoid auditing ordinary dashboard reads.

## Future AI Readiness

Future AI services may consume Rule Engine output and recommendation records, but AI should remain a consumer. The Rule Engine, Recommendation Engine, and Command Dashboard contracts should not depend on AI.
