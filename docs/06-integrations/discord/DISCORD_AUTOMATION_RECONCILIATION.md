# Discord Automation Reconciliation

## Purpose

Reconciliation explains what the Portal expected Discord to do and what needs staff attention before action can safely continue.

## Common Reconciliation Items

- target role missing.
- target role archived or unmanaged.
- guild inactive.
- member not present in guild.
- automation exception active.
- idempotent action already completed.
- Discord REST failure.
- role hierarchy issue.

## Behavior

Blocked planned actions should create reconciliation records where practical. Reconciliation records are not execution by themselves; they are diagnostic and staff-review aids.

## Relationship To Discovery

Resource discovery can update role inventory and surface missing or renamed resources. Automation must still use role IDs and mapped ownership rules before executing.

