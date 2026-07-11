# Recommendation Engine Specification

## Purpose

The Recommendation Engine turns rule evidence into commander-readable recommendations.

It does not make decisions automatically.

## Provider Contract

Recommendation providers expose:

```text
id
name
category
priority
evaluate(context)
```

Providers consume prepared context such as `OperationsPackageData` and return draft recommendations.

## Recommendation Fields

```text
id
category
priority
severity
title
summary
details
recommendedAction
reason
relatedEntityType
relatedEntityId
supportingRules[]
createdAt
updatedAt
dismissedAt
resolvedAt
status
```

Statuses:

```text
active
dismissed
resolved
expired
```

Priorities:

```text
critical
high
medium
low
informational
```

Priority derives from supporting rule severity.

## Initial Providers

- Planning Recommendation Provider.
- Execution Recommendation Provider.
- Community Recommendation Provider.
- Publication Recommendation Provider.

Future providers may cover logistics, medical, supply, maintenance, training, intelligence, compliance, and communications.

## Supporting Rules

Every recommendation must explain why it exists through supporting rule snapshots. A supporting rule snapshot includes:

- rule id
- provider id
- category
- status
- severity
- message
- recommended action
- related entity

## Expiration

When an active recommendation is no longer produced by current rule evidence, it may be marked expired. Dismissed and resolved recommendations remain historical records and are not silently reopened.

## UI Requirements

Recommendation cards should show:

- priority
- category
- summary
- reason
- recommended action
- supporting rules
- affected entity
- actions to view, dismiss, or resolve

The Recommendation Inspector shows supporting rules, affected entities, recent history, and lifecycle state.
