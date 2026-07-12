# Phase 3 Responsive Validation

## Required Viewports

- 1440px desktop.
- 1280px compact desktop.
- 1024px tablet/compact nav.
- 768px tablet/mobile boundary.
- 390px phone.

## Static Findings

- App shell uses stable viewport-height layout and independently scrolling content.
- Action wrapping has been improved through `ActionGroup`.
- Dense list fallback has been introduced through `CompactList`.
- Inspector drawer standards require mobile full-screen behavior.
- Dense matrices, admin pages, Discord settings, role matrix, and Operations Package remain high-risk for mobile density.

## Screenshot Checklist

| Route | 1440 | 1280 | 1024 | 768 | 390 | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | Pending | Pending | Pending | Pending | Pending | UAT Required |
| `/operations` | Pending | Pending | Pending | Pending | Pending | UAT Required |
| `/operations/deployments` | Pending | Pending | Pending | Pending | Pending | UAT Required |
| `/operations/packages/[campaignId]/week/[weekNumber]` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |
| `/operations/patrols` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |
| `/operations/aar-queue` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |
| `/personnel/roster` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |
| `/personnel/members/[id]` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |
| `/training/qualification-matrix` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |
| `/administration/discord` | Pending | Pending | Pending | Pending | Pending | Provider Config Required |
| `/administration/roles` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |
| `/communications` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |
| `/community-management` | Pending | Pending | Pending | Pending | Pending | Seeded Data Required |

## Release Criteria

No route above should show page-level horizontal overflow, clipped primary actions, inaccessible drawers, sticky overlap, or unreadable mobile density.

