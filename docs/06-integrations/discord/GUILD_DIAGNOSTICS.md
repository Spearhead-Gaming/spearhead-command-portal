# Guild Diagnostics

Guild diagnostics help administrators understand Discord configuration without exposing secrets.

## Diagnostic Areas

- OAuth configuration
- REST API access
- Gateway status
- interaction webhook readiness
- slash command registration
- channel mappings
- role mappings
- missing channels
- missing roles
- sync status
- discovery session status
- reconciliation item count
- rate-limit or API failures

## Secret Safety

Diagnostics must never print:

- bot token
- client secret
- auth secret
- raw developer bootstrap secret

Diagnostics may report presence, validity shape, and safe status labels.

## Missing Channel And Role Handling

Discovered inventory can help identify missing mappings, but the portal must never guess a channel or role.

If a mapping is missing:

1. show a clear warning
2. create a failed delivery record when a delivery was explicitly requested
3. keep the core portal workflow intact unless Discord delivery was explicitly required

## Audit

Audit meaningful diagnostic actions:

- discovery requested
- inventory imported
- mapping changed
- sync started/completed/failed
- discovery started/completed/failed
- sensitive staff command used
- duplicate identity merged

Avoid noisy audit logs for routine calculated health reads.
