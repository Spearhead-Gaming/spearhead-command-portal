# Discord Discovery Sessions

Discovery sessions provide auditable execution history for Discord inventory scans.

## Session Fields

Sessions track:

- Guild
- Discovery type
- Resource types
- Status
- Dry-run flag
- Fetched, created, updated, missing, and restored counts
- Warnings
- Errors
- Rate-limit metadata
- Snapshot reference
- Correlation ID
- Start, completion, failure, cancellation, and expiration timestamps

## Statuses

Current statuses are string-backed for MariaDB flexibility:

- queued
- running
- completed
- completed_with_warnings
- failed
- cancelled
- expired

## Audit

Discovery start, completion, warning completion, and failure are audited. Detailed per-resource changes are stored as resource change records instead of noisy audit entries.

