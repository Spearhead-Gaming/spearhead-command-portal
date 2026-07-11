# Assignment and Transfer Workflow

## Purpose

Transfers move a member from one unit to another while preserving assignment history.

## Workflow

1. Member or staff submits transfer request.
2. Portal creates a transfer record and related review case.
3. Current and receiving unit reviewers evaluate the request where policy requires it.
4. Staff approves or denies the transfer.
5. Approval updates the current roster assignment through roster services.
6. Previous assignment is closed and preserved.
7. Notification and audit records are created.

## Rules

- Do not change unit assignment until approval.
- Do not delete prior assignment history.
- Do not authorize by role name, rank, position, or Discord role.
- Use `transfers.submit` and `transfers.review`.

## Audit Events

- `transfer.requested`
- `transfer.approved`
- `transfer.denied`
- `roster.assignment.changed`
