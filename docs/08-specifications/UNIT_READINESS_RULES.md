# Unit Readiness Rules

## Purpose

Unit readiness rules explain what prevents a unit from being ready. They must use the Universal Rule Engine and return standard `RuleEvaluationResult` objects.

## Provider

- Provider ID: `personnel.unit-readiness`
- Domain: `unit-readiness`

## Initial Facts

- `attendanceConcerns`
- `inactiveLeadership`
- `loaMembers`
- `missingRequiredQualifications`
- `pendingTransfers`
- `trackedMembers`
- `vacantLeadershipPositions`

## Initial Rules

- Unit strength
- Vacant leadership billets
- Qualification gaps
- Attendance concerns
- Pending transfers

## Output Requirement

Unit readiness should expose blockers, warnings, and recommended actions before any aggregate percentage.
