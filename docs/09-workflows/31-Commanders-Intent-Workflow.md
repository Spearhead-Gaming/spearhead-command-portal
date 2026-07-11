# Commander's Intent Workflow

## Purpose

Commander's Intent connects planning, execution, AAR review, and next-week recommendations.

The portal records intent and assessment evidence. It does not automatically judge success.

## Planning Fields

Each Operational Week may record:

- Commander's Intent.
- Commander End State.
- Success Criteria.
- Failure Conditions.
- Planning Notes.

Weekly Tasking may still include operation-level Commander's Intent for publication and member-facing tasking.

## Assessment States

```text
achieved
partially_achieved
not_achieved
deferred
cancelled
```

## Assessment Fields

Staff review execution results and record:

- assessment summary
- supporting evidence
- lessons learned
- next-week recommendations

Patrol AARs, reviewed progression notes, attendance, and operational health may support the assessment, but a human staff member records the final assessment.

## Flow

```text
Plan Intent
v
Execute Weekend Operation / Patrols
v
Review Patrol AARs
v
Assess Intent
v
Record Lessons and Next-Week Recommendations
```

## Audit

Audit:

- intent assessment updated

Avoid auditing ordinary reads.

## Permissions

```text
operations.command.view
operations.command.manage
operations.package.view
operations.package.edit
```

Never authorize by role name.
