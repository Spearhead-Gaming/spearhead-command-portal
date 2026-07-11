# Leave of Absence Workflow

## Purpose

LOA records explain temporary reduced availability and provide attendance/readiness context.

## Workflow

1. Member or staff submits LOA request.
2. Portal creates LOA record and related review case.
3. Reviewer approves or denies.
4. Approved LOA affects readiness and attendance interpretation.
5. Staff marks returned, extends, or reviews expiration as policy requires.

## Rules

- LOA status is portal-owned and not inferred from Discord presence.
- LOA reason visibility should respect confidentiality rules.
- Approved LOA should not be treated as unexcused attendance failure.

## Audit Events

- `loa.requested`
- `loa.approved`
- `loa.denied`
- `loa.returned`
