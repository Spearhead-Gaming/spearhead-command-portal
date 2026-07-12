# Discord Disaster Recovery

## Scenarios

| Scenario | Recovery |
| --- | --- |
| Bot removed from guild | Reinvite bot, run preflight, run discovery, verify mappings. |
| Bot token rotated | Update environment, restart app and Gateway, run `discord:health`. |
| Channel mappings invalid | Run discovery, inspect reconciliation, remap by channel ID. |
| Bot role moved below managed roles | Fix hierarchy, rerun automation preview. |
| Gateway duplicated | Stop extra worker, verify singleton state and logs. |
| Discord API outage | Leave Portal source records intact and retry Discord delivery later. |
| Interaction endpoint misconfigured | Fix public HTTPS URL and Developer Portal endpoint. |
| Review message deleted | Repost explicitly from Portal workflow when supported. |
| Scheduled event deleted | Reconcile drift and recreate through Portal event management. |
| File storage unavailable | Restore persistent storage and retry upload/continuation. |

Rollback starts by disabling automatic Discord execution while preserving Portal records.
