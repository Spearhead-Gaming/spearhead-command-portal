# Member Readiness Rules

## Purpose

Member readiness rules explain what prevents a member from being ready. They must use the Universal Rule Engine and return standard `RuleEvaluationResult` objects.

## Provider

- Provider ID: `personnel.member-readiness`
- Domain: `personnel-readiness`

## Initial Facts

- `activeAssignment`
- `attendanceRate`
- `incompleteProfile`
- `loaActive`
- `missingRequiredQualifications`
- `overdueRequiredQualifications`
- `pendingPersonnelActions`
- `profileStatusKey`

## Initial Rules

- Active assignment
- Required qualifications
- Attendance context
- LOA status
- Pending personnel actions

## Output Requirement

Every warning or failure must include a human-readable message and recommended action. Do not display unexplained readiness scores.
