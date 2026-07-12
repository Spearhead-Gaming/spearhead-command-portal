# Component Migration Map

This map identifies canonical components and migration targets for future UI cleanup.

| Pattern | Canonical component | Migrate away from |
| --- | --- | --- |
| Action wrappers | `ActionGroup` | ad hoc `flex flex-wrap gap-*` button rows |
| Section heading | `SectionHeader` | repeated custom title/description/status wrappers |
| Dense queue item | `CompactList` | bespoke rounded row cards with duplicated title/status/action layout |
| Attention list | `NeedsAttention`, `AttentionPanel`, `CompactList` | warning cards with inconsistent severity labels |
| Empty state | `EmptyState` | raw `No data found` copy |
| Loading state | `LoadingSkeleton` | full-page spinners for local loading |
| Status | `StatusBadge` | local badge color classes |
| Drawer | `InspectorDrawer` | local absolute/fixed panels |
| Progressive detail | `CollapsibleSection`, `DetailTabs`, `MetadataList` | long always-visible metadata blocks |
| Metrics | `KpiCard`, `DashboardWidget`, `ReadinessCard` | decorative zero-value cards |

## High-Impact Route Status

| Route area | Epic 7 status |
| --- | --- |
| Personnel Center | Compact list and canonical action grouping started |
| Unit Dashboard | Canonical action grouping started |
| Operations Center | Existing progressive disclosure retained; future compact-list migration recommended |
| Patrols / AAR Queue | Future compact-list migration recommended |
| Discord Administration | Existing needs-attention patterns retained; future diagnostic table pass recommended |
| Failed Deliveries | Existing route retained; future compact diagnostic table pass recommended |
| Community Management | Existing cards retained; future case-list migration recommended |

