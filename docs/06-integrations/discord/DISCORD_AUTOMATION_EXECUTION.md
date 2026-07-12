# Discord Automation Execution

## Execution Modes

- `preview_only`: plan and validate, but do not change Discord.
- `manual_approval`: require an authorized approver before execution.
- `automatic`: reserved for explicitly approved future use.

Role-changing definitions must default to preview or manual approval.

## Execution States

Executions and action rows may move through:

- planned
- awaiting approval
- approved
- running
- succeeded
- partial success
- failed
- blocked
- reconciliation required
- cancelled

## Idempotency

Each planned action has an idempotency key based on trigger, source entity, member, guild, role, and definition. Completed idempotent actions are not repeated.

## Retry

Retries are bounded and recorded in `DiscordAutomationRetry`. Retry attempts must not hide the original failure.

## Rollback

Rollback is explicit compensation, not history deletion. Role compensation should create a new action and `DiscordAutomationRollback` record explaining the reason and actor.

