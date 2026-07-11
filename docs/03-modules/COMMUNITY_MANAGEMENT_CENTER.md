# Community Management Center

## Purpose

The Community Management Center is the staff workspace for neutral community administration, case review, incidents, appeals, warnings, evidence, and moderation history.

It replaces the idea of a simple moderation-only center.

## Route

```text
/community-management
```

## Capabilities

- view community health indicators
- create cases
- submit incident reports
- assign and transition cases
- add staff notes
- attach evidence links or metadata
- record decisions
- issue warnings
- submit appeals
- record or execute supported Discord moderation actions
- review moderation history

## Permissions

The module uses permission keys only:

- `community.view`
- `community.dashboard.view`
- `cases.*`
- `evidence.*`
- `notes.*`
- `incidents.*`
- `appeals.*`
- `moderation.*`

Never authorize by role name or Discord role alone.

## Language Guidance

The UI should use neutral administrative language:

- "case"
- "review"
- "follow-up"
- "evidence needed"
- "moderation action"

Avoid sensational labels or automatic judgment language.

