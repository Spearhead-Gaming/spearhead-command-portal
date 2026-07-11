# Unit Qualification Readiness

## Purpose

Unit qualification readiness answers which unit or position requirements prevent members from being ready.

## Rules

- Requirements are unit-scoped or position-scoped by default.
- Do not hardcode unit-specific requirements in UI components.
- Some units may have no required qualifications.
- Matrix views should be scoped by unit first, not one giant community-wide matrix.

## Readiness Inputs

- Assigned unit
- Assigned position or billet
- Required qualification records
- Requirement due windows
- Expiration and renewal policy
- Exempt or not-applicable states when supported

## Permissions

- `qualifications.requirements.view`
- `qualifications.requirements.manage`
- `readiness.member.view`
- `readiness.unit.view`
