# Rule Engine Architecture

## Purpose

The Universal Rule Engine provides a reusable foundation for evaluating rule-based signals across the portal.

It is intentionally domain-neutral. The engine knows nothing about Operations, Discord, Prisma, UI, qualifications, attendance, or future logistics modules.

## Concepts

### Rule Engine

The engine evaluates registered providers against a context object and returns standardized rule results plus summaries.

### Rule Registry

The registry stores providers. Domains register providers; the core engine discovers them through registry queries instead of hardcoded provider lists.

### Rule Provider

A provider owns a domain-specific set of rules.

Required provider fields:

```text
id
name
domain
category
priority
evaluate(context)
```

Providers return `RuleEvaluationResult[]`. Providers do not render UI and do not calculate UI scores.

### Rule Evaluation Context

Context is a generic object with optional `domain`, `subject`, `facts`, and `now` fields. Domain services may extend it with strongly typed fields.

Examples:

- Operation Package context.
- Deployment context.
- Unit context.
- Member context.
- Qualification context.
- Attendance context.

### Rule Evaluation Result

Standard result fields:

```text
id
providerId
category
title
description
status
severity
message
recommendedAction
relatedEntityType
relatedEntityId
metadata
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
LOW
MEDIUM
HIGH
CRITICAL
```

## Engine Output

The engine returns:

- results
- summary
- counts
- warnings
- failures
- critical failures
- recommendations
- category summaries

The engine does not calculate presentation percentages. Consumers can derive readiness percentages, health scores, completion labels, or dashboard-specific presentation from the count summary.

## Current Consumers

Operations Package consumers now use the universal engine:

- Operational Readiness
- Publication Readiness
- Operational Health

Operational Health remains a consumer-specific scoring layer. Its providers return generic rule results, and the health service derives health labels and trends.

## Permissions

Generic rule permissions:

```text
rules.view
rules.evaluate
```

Domain-specific permissions still apply, for example:

```text
operations.health.view
operations.readiness.view
operations.package.view
```

Never authorize by role name.

## Audit

Avoid auditing every successful evaluation. Audit only meaningful events:

- provider registration failure
- rule evaluation failure
- critical rule failure state transition
- explicit user-triggered evaluation if the domain requires it

## Extensibility

Future modules should add providers without modifying the core engine:

- Qualification Readiness
- Unit Readiness
- Attendance Readiness
- Logistics
- Maintenance
- Intelligence
- Medical
- Communications
- Compliance
- Inspection Checklists
