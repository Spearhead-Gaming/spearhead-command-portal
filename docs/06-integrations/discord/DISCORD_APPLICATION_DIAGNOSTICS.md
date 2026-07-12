# Discord Application Diagnostics

The Discord Operations Center includes an Application Integration section.

## Visible Diagnostics

- active catalog entries
- guild policies
- active application sessions
- expired continuation tokens
- pending Portal reviews
- review message records

## Common Issues

- Missing Portal form template: enable the matching `FormTemplate`.
- Missing channel mapping: configure `staff-alerts` or the policy-specific review mapping.
- Expired continuation link: run `/apply start` again.
- Unlinked reviewer: sign in with Discord and link to the Portal account.
