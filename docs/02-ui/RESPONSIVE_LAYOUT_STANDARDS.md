# Responsive Layout Standards

## Breakpoints

| Width | Expected Behavior |
| --- | --- |
| 1440px | Full command workspace and multi-column layouts |
| 1280px | Reduced grid columns with no overlap |
| 1024px | Navigation may collapse; actions wrap cleanly |
| 768px | Mobile/tablet nav and stacked page headers |
| 390px | Single-column layout, full-width actions, no horizontal page overflow |

## Rules

- Use `min-w-0` on grid/flex children that contain long content.
- Use responsive grids instead of fixed-width card rows.
- Keep touch targets large enough on mobile.
- Avoid horizontal table dependence on mobile.
- Drawers become near full-screen or full-screen sheets on small screens.
- Modals must have internal scroll and visible footer actions.
- Sticky elements need clear offset behavior.

## Priority Routes For Screenshot Testing

- `/dashboard`
- `/operations`
- `/operations/deployments`
- `/operations/packages/[campaignId]/week/[weekNumber]`
- `/operations/patrols`
- `/operations/aar-queue`
- `/personnel`
- `/personnel/roster`
- `/communications`
- `/community-management`
- `/administration/discord`
- `/administration/roles`
