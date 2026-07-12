# Global App Shell

## Purpose

The global shell provides a stable command workspace around all authenticated
portal routes. It owns navigation, top-bar controls, notification center,
command palette, overlay layering, and page scroll ownership.

## Structure

```text
Viewport
- Desktop sidebar
- Main column
  - Top bar
  - Main scroll region
    - PageContainer
- Global overlays
  - Mobile navigation
  - Command palette
  - Notification center
  - Inspector drawers
```

## Rules

- The viewport shell uses full dynamic viewport height.
- The sidebar and top bar never overlap page content.
- The main region owns page scrolling.
- Drawers and modal overlays own their internal scroll.
- Page content should use `PageContainer` rather than inventing outer spacing.
- Top-bar actions must be globally relevant.
- Page-specific actions belong in `PageHeader` or contextual toolbars.
- Developer and diagnostic tools must be separated from normal user workflows.

## Current Components

- `AppShell`
- `SidebarNav`
- `MobileNav`
- `TopBar`
- `PageContent`
- `PageContainer`
- `CommandPalette`
- `NotificationCenterDrawer`
- `InspectorDrawer`

## Accessibility Baseline

- Sidebar links use `aria-current="page"` for the active route.
- Mobile navigation, command palette, and inspector drawer trap focus while open.
- Focus returns to the triggering element when overlays close.
- Escape closes overlay shells.
- Icon-only controls need accessible labels.

## Phase 3 Boundary

Epic 1 stabilizes the shell and navigation. It does not redesign every page or
re-rank every widget. Page-level simplification belongs to Epic 2 and later.
