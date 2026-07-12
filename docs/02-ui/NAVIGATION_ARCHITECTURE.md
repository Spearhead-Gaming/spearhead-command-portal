# Navigation Architecture

## Canonical Top-Level Navigation

```text
Home
Operations
Personnel
Training
Communications
Documents
Community Management
Administration
Developer Tools
```

Developer Tools are visible only to users with explicit builder/developer-style
permissions.

## Visible Operations Navigation

```text
Operations
- Operations Center
- Deployments
- Current Week
- Patrols
- Weekly Tasking
- AAR Queue
- Attendance
```

Avoid separate Campaign and Deployment entries. The user-facing term is
Deployment.

## Communications Navigation

Communications is a top-level operational domain, not an Administration subitem.

```text
Communications
- Communications Center
- Deliveries
- Discord Settings
```

Provider configuration may still live in Administration where appropriate.

## Personnel Navigation

```text
Personnel
- Personnel Center
- Members
- Roster
- Units
```

Do not hard-code individual unit links in global navigation. Unit shortcuts must
be data-driven or contextual.

## Permission Rules

- Navigation visibility is permission-aware.
- Hidden navigation is not authorization.
- Direct route access must still enforce server-side permissions.
- Never authorize by role name or Discord role.

## Active Route Rules

- Exact routes use exact matching.
- Section routes use prefix matching.
- Legacy aliases should make the canonical destination active.

## Legacy Route Policy

Legacy routes must redirect to canonical routes when a safe replacement exists.
Do not delete working routes without a compatibility strategy.
