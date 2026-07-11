# Rule Provider Guide

## Goal

Rule providers let future modules contribute checks to readiness, health, compliance, and inspection workflows without changing the core Rule Engine.

## Provider Shape

```ts
type RuleProvider<TContext> = {
  id: string
  name: string
  domain: string
  category: string
  priority?: number
  evaluate(context: TContext): RuleEvaluationResult[] | Promise<RuleEvaluationResult[]>
}
```

## Provider Rules

Providers should:

- remain domain-focused
- return standardized results
- avoid UI imports
- avoid Prisma imports unless the provider is intentionally infrastructure-backed
- prefer receiving prepared context from a service
- avoid calculating presentation percentages
- use actionable `recommendedAction` text
- include `relatedEntityType` and `relatedEntityId` where possible

Providers should not:

- authorize by role name
- render UI
- send notifications directly
- write audit logs for every successful check
- depend on Discord as a source of truth

## Result Contract

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

Status values:

```text
PASS
WARNING
FAIL
NOT_APPLICABLE
```

Severity values:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

## Registration

Domain services can create a scoped `RuleEngineService` and register providers:

```ts
const service = new RuleEngineService()
service.registerProvider(myProvider)
```

Use the shared singleton only for truly global providers. Domain-scoped services are preferred when context is specialized.

## Evaluation

```ts
const output = await service.evaluate(context, {
  domains: ["operations"],
  categories: ["planning"],
})
```

The output includes raw results and summary counts. Consumers decide how to score or display those results.

## Recommendations

Recommendations are generated from failed and warning rules. The recommendation should be a next action, not a strategic decision.

Good:

```text
Upload the current CONOP file before publication.
```

Avoid:

```text
Switch to Operation Branch B.
```

Decision support belongs to a separate decision layer.

## Prepared Future Providers

The framework is ready for:

- Qualification Provider
- Attendance Provider
- Unit Readiness Provider
- Deployment Provider
- Patrol Provider
- Logistics Provider
- Maintenance Provider
- Intelligence Provider
- Communications Provider
- Compliance Provider
