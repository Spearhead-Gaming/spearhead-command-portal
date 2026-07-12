# Discord Role Ownership

## Portal-Managed Roles

A role becomes portal-managed only when it is explicitly mapped or tracked by the automation engine. The Portal must not modify arbitrary Discord roles.

Portal-managed roles include roles mapped for:

- units.
- qualifications.
- portal roles or staff groups.
- optional future ranks.
- position/billet automation.
- member-status automation.

## Ownership Rules

- Discord role ID is canonical.
- Role name is display-only.
- Deleted or missing roles should create reconciliation items, not guessed replacements.
- Manual Discord-side role changes may be treated as drift if they affect a portal-managed role.
- Discord role ownership must not grant Portal authorization.

