# Guild Inspector

The Guild Inspector is the right-side contextual detail view for a managed Discord guild.

## Principle

Inspecting a guild should not navigate away from the Discord Operations Center. Administrators keep dashboard context while reviewing configuration, health, and inventory.

## Tabs

Initial tabs:

- Overview
- General
- Channels
- Roles
- Communications
- Synchronization
- Gateway
- Diagnostics
- Audit

Future tabs may add Qualifications and deeper Automation detail as those modules mature.

Phase 4 adds resource-directory tabs for scheduled events, emoji, stickers, discovery sessions, and reconciliation items.

## Moderation Section

Guild inspection should include a moderation section or drill-down showing:

- guild moderation policy
- recent case-backed Discord actions
- warnings
- active timeouts
- active bans
- pending appeals
- Gateway observations

Cross-guild moderation remains policy-driven. The inspector may show related recommendations, but enforcement must still flow through Portal permissions and case-backed services.

## Safe Actions

Allowed actions must be explicit and permission-controlled:

- refresh members
- preview role synchronization
- import channel/role inventory
- run full, targeted, or dry-run discovery
- open diagnostics

No destructive action should run without confirmation.

## Mobile

On small screens the inspector behaves like a full-screen overlay/sheet and must preserve focus trapping and Escape-to-close behavior.
# Event Configuration

Guild inspection should include discovered Scheduled Events and, where permissions allow, linked Portal event state. Event policy changes must use discovered channel inventory rather than manually entered Discord IDs.

# Application Configuration

Guild inspection should expose application integration policy once the inspector supports editing it. Policy includes visible application types, entry/review channels, panel state, command availability, reviewer quick actions, Portal-only review mode, and testing mode.

Guild application policy controls visibility and routing only. Portal application services, eligibility checks, and permission keys remain authoritative.
