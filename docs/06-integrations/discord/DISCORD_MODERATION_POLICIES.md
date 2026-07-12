# Discord Moderation Policies

Each managed guild has an independent moderation policy.

## Policy Fields

Policies may define:

- warnings enabled
- notes enabled
- timeout enabled
- kick enabled
- ban enabled
- appeals enabled
- timeout maximum seconds
- timeout approval mode
- kick approval mode
- ban approval mode
- cross-guild policy
- evidence requirements
- reason requirements
- moderator notification preference
- retention guidance
- default communication template

## Approval Modes

Supported initial values:

- `none`
- `single_approval`
- `dual_approval`
- `command_approval`

Approval records are preserved in `DiscordModerationApproval`.

## Enforcement

Policies are checked before Discord REST execution. Blocking issues stop execution and should surface to staff during preview.
