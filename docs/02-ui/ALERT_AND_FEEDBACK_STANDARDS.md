# Alert And Feedback Standards

Alerts should help users recover or continue.

## Alert Levels

| Level | Use |
| --- | --- |
| Informational | Context or non-blocking system state |
| Success | Completed action, short-lived |
| Warning | Review needed or incomplete setup |
| Error | Failed action or recoverable provider issue |
| Critical | Blocking operational issue |

## Rules

- Place blocking alerts near the affected workflow.
- Preserve unaffected content when part of a page fails.
- Do not expose raw stack traces to normal users.
- Use reference IDs for page-level failures when useful.
- Use toasts for short-lived completion feedback only.
- Do not use toasts for critical failures requiring action.

