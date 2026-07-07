# Operations Release Workflow

## Purpose

Operations Release Management publishes an Operations Package as the official record for an Operational Week.

This workflow is Phase 2 Epic 5C. It does not implement Operational Health, Decision Support, or commander's intent assessment.

## Release Philosophy

Every Operational Week may have multiple draft revisions, but only one published release should be active.

Publishing creates:

- Operations Release
- Release Timestamp
- Published By
- Release Version
- Discord Announcement
- Release History

The published release becomes the official operational package.

## Release States

```text
draft
ready_for_review
approved
scheduled
published
superseded
archived
```

Publishing a new release supersedes the previous published release only after Discord delivery succeeds.

## Versioning

Versions use lightweight semantic numbering:

```text
v1.0
v1.1
v1.2
v2.0
```

The first release is `v1.0`. Amendments usually increment the minor version. Major changes, such as new tasking baselines, may increment the major version.

## Workflow

```text
Draft
v
Validate
v
Preview
v
Approve
v
Publish
v
Discord
v
Release Created
v
Historical Record
```

## Validation

Before publishing, the portal runs the Operations Readiness Engine.

Publication Readiness failures block publishing.

Warnings are allowed but remain visible.

## Preview

The preview should mirror the Discord announcement and show:

- Operation Header
- Deployment
- Operational Week
- Date
- Time
- Tasking
- Unit Taskings
- Deployment Resources
- CONOP
- OPORD
- Player Primer
- Current Mod Preset
- Maps
- Radio Plan
- RSVP
- Footer

## Release Record

`OperationsRelease` stores:

- Release Version
- Published By
- Published Time
- Package Snapshot
- Release Notes
- Amendment Summary
- Discord Message ID
- Discord Channel ID
- Discord Delivery ID
- Discord Status
- Release Status

The package snapshot preserves historical context and must not rely only on mutable planning records.

## Scheduling

Scheduled releases record status `scheduled` and `scheduledFor`.

No fake scheduler execution should occur until a real worker/scheduler exists.

## Discord Publication

Discord is the delivery platform. The portal remains the source of truth.

Discord publication uses mapped event channels and notification delivery tracking.

Audit:

- Release Created
- Package Published
- Amendment Published
- Discord Published
- Publication Failed
- Release Archived

## Permissions

```text
operations.package.publish
operations.package.approve
operations.release.view
operations.release.publish
operations.release.history
deployments.publish
```

Never authorize by role name.
