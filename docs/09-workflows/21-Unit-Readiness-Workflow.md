# Unit Readiness Workflow

Readiness is primarily unit-scoped.

## Qualification Readiness

- Qualification readiness is managed per unit.
- Required qualifications are unit-specific.
- Some units have required qualifications.
- Some units do not.
- Required qualifications may have completion timelines.
- Member readiness evaluates requirements for the member's assigned unit.
- Community qualification readiness is an aggregate statistic only.

## Attendance Readiness

- Attendance is tracked per unit.
- Unit dashboards show attendance for that unit.
- Member attendance is interpreted in the context of the assigned unit.
- Community attendance may appear only as an aggregate metric.

## Data Principles

- Use `QualificationRequirement.unitId` and optional `dueWithinDays` for unit timelines.
- Use member assignment and event/unit context for readiness calculations.
- Do not hard-code unit readiness rules into UI components.
