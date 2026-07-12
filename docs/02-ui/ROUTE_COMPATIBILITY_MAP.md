# Route Compatibility Map

## Current Compatibility Redirects

| Legacy Route | Canonical Route | Notes |
| --- | --- | --- |
| `/operations/campaigns` | `/operations/deployments` | Preserves query parameters such as `panel=create` |
| `/operations/campaigns/[id]` | `/operations/deployments/[id]` | Preserves query parameters |

## Current Canonical Route Aliases

| Canonical Route | Implementation |
| --- | --- |
| `/operations/deployments` | Uses existing deployment/campaign page component |
| `/operations/deployments/[id]` | Uses existing deployment detail component |

## Safe Legacy Policy

- Keep old links working through redirects.
- Update visible navigation and new internal links to canonical routes.
- Preserve query strings and entity IDs.
- Avoid broad database/model renames unless a later migration requires them.

## Future Candidates

| Legacy/Current Route | Candidate Canonical Route |
| --- | --- |
| `/operations/s3` | Operations Center tab or S3 workspace |
| `/operations/conops` | Operations Package resources |
| `/operations/aars` | AAR Queue / AAR records split |
| Mission terminology in UI | Weekend Operation |
