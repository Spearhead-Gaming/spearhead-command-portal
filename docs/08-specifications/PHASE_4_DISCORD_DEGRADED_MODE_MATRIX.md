# Phase 4 Discord Degraded Mode Matrix

| Failure | Expected Behavior | User Message | Source Records |
| --- | --- | --- | --- |
| Gateway offline | OAuth, REST, and webhook commands continue; observations pause | Gateway observation is degraded | Portal records remain authoritative |
| REST unavailable | Portal workflow completes; Discord delivery/action fails and records delivery failure | Discord action could not be sent | Portal source action remains preserved |
| Interaction endpoint unavailable | Slash commands/buttons fail; Portal UI continues | Discord interaction endpoint is unreachable | Portal data unchanged |
| Primary guild unavailable | Unit guild workflows may continue by policy; community routing degrades | Primary guild requires review | Portal data unchanged |
| Missing channel mapping | Delivery records fail; source workflow does not roll back | No active mapping found | Portal source action remains preserved |
| Missing role permission | Role automation action fails or remains preview | Bot cannot manage target role | Portal qualification/unit data remains authoritative |
| Duplicate identity | Affected workflows blocked or require review | Discord identity conflict detected | No automatic merge by display name |
| File storage unavailable | Attachment continuation fails safely | Upload storage is unavailable | AAR/session remains pending |

Gateway failure must not mark webhook-only features failed.
