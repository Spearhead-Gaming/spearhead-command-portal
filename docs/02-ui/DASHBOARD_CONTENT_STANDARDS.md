# Dashboard Content Standards

Dashboards are decision surfaces, not complete management pages.

## Default Layout

1. Primary KPI row with 3 to 5 cards.
2. Needs Attention with specific actions.
3. Current or upcoming work.
4. Recent activity preview.
5. Secondary analytics collapsed by default.

## Widget Priority

Widgets should be classified as:

- Primary: default visible operational state.
- Attention: actionable problem or blocker.
- Supporting: useful context that should not dominate.
- Diagnostic: technical or administrative detail.
- Historical: past events, audit, timeline, attempts, logs.

Only primary and attention widgets should normally be visible above the fold.

## Route Notes

- Dashboard keeps role-aware operational summary, Needs Attention, Upcoming, Recent Activity, and collapsed secondary analytics.
- Operations Center should prioritize current deployment/week, readiness, blockers, pending review, publish state, and recent patrol/AAR intelligence.
- Communications Center should prioritize failed deliveries, active deliveries, scheduled sends, and create announcement.
- Community Management should prioritize critical cases, unassigned cases, appeals, and next review actions.
- Discord Administration should prioritize health, configuration issues, identity sync issues, failed deliveries, and quick diagnostics.
