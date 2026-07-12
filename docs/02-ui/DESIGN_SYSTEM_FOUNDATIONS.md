# Design System Foundations

Phase 3 Epic 7 standardizes the Spearhead Command Portal around one tactical, low-noise component language.

The design system exists to reduce cognitive load. It should make every major screen answer three questions quickly:

- What is this page for?
- What needs attention?
- What action should I take next?

## Canonical Principles

- Use shared components before route-specific styling.
- Prefer semantic tokens over hard-coded color or spacing values.
- Keep one primary action per action region.
- Keep secondary information available through tabs, drawers, accordions, compact lists, or detail panels.
- Use service-derived content in UI, but keep domain decisions out of components.
- Use progressive disclosure for dense operational context.
- Do not communicate status through color alone.

## Canonical Component Targets

| Pattern | Canonical target |
| --- | --- |
| Page structure | `PageHeader`, `PageContainer`, `SectionStack`, `SplitWorkspace` |
| Section heading | `SectionHeader` |
| Action grouping | `ActionGroup`, `Toolbar` |
| Summary cards | `SummaryCard`, `DashboardWidget`, `KpiCard`, `ReadinessCard` |
| Attention items | `NeedsAttention`, `AttentionPanel`, `CompactList` |
| Empty states | `EmptyState` |
| Loading states | `LoadingSkeleton` |
| Badges | `StatusBadge` plus domain badge wrappers |
| Inspection | `InspectorDrawer` |
| Dense queues | `CompactList` |
| Progressive detail | `CollapsibleSection`, `DetailTabs`, `MetadataList` |

## Migration Rule

When touching a route, replace repeated local wrappers with canonical primitives only if it does not alter workflow behavior. This Epic is a consistency pass, not a workflow redesign.

