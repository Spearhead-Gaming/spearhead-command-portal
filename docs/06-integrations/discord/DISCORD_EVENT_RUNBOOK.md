# Discord Event Runbook

## Safe Rollout

1. Run guild discovery.
2. Confirm event-capable channels are discovered.
3. Configure event policy for one test guild and event type.
4. Keep preview and manual approval enabled.
5. Generate an event plan.
6. Review target warnings and blockers.
7. Execute only in a safe test guild.
8. Re-run the same plan and confirm no duplicate event is created.
9. Change the Portal event and preview an update.
10. Test Gateway drift by editing the Discord event directly.

Do not create live production community events without approval.

## Degraded Gateway

REST creation and updates can still work while Gateway is offline. Drift and participation observation resume when Gateway returns.
