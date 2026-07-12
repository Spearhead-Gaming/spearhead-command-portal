# Phase 4 Discord Feature Certification

Feature certification validates readiness for a capability across one or more guilds.

## Feature Profiles

| Feature | Required Dependencies | Optional Dependencies |
| --- | --- | --- |
| Slash Commands | application ID, bot token, public key, public interaction URL, command registration | Gateway |
| Communications | active channel mappings, notification delivery provider, Discord REST | Gateway delivery observation |
| Role Automation | linked identity, discovered role, role mapping, Manage Roles, hierarchy, automation definition | Gateway observation |
| Scheduled Events | event policy, Discord REST, Manage Events, Portal event | Gateway drift observation |
| Applications | application catalog, Portal form template, continuation token, interaction webhook, review mapping | Application panel |
| Moderation | Portal Case, Discord REST, hierarchy, policy, permission key | Gateway observation |

## Certification Rule

If a feature is disabled by policy, mark Disabled rather than Not Ready. Optional feature failure must not block unrelated workflows.
