# Discord Application Review Actions

Reviewer quick actions are convenience shortcuts, not authorization.

## Supported Actions

- Open Application
- Assign to Me
- Request Info
- Approve
- Deny

## Behavior

- Open returns a Portal link.
- Assign to Me may update the reviewer when the caller has `discord.applications.review.assign` or an equivalent forms permission.
- Request Info, Approve, and Deny redirect to Portal review so reasons and sensitive context remain Portal-owned.
- Every reviewer action resolves a linked Portal identity and checks permission keys.
