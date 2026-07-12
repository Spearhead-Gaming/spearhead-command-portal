# Card Standards

Cards are for summarized operational context, not unstructured data dumps.

## Canonical Card Types

| Type | Use |
| --- | --- |
| Summary Card | Entity overview and next action |
| Metric Card | Decision-supporting KPI only |
| Needs Attention Card | Actionable blockers or warnings |
| Entity Card | Compact identity plus status |
| Resource Card | File/link/version presentation |
| Status Card | Current system or workflow state |
| Inspector Summary Card | Drawer overview |
| Empty-State Card | No current data or configuration |
| Diagnostic Card | Admin/system health |
| Action Card | Guided call to action |

## Structure

- Header: title, concise description, optional status.
- Body: one key value or a short list.
- Action: one primary action, secondary actions in `ActionGroup` or overflow.
- Detail: move long metadata to drawers, tabs, or collapsible sections.

## Metric Restraint

Do not add a metric card unless the metric helps the viewer decide or act.

