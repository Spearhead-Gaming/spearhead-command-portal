# Publish And Amendment UX

## Publish Flow

1. Review operational readiness.
2. Review publication readiness.
3. Open preview.
4. Confirm release notes and destination.
5. Publish or schedule.
6. Review delivery status.

## Amendment Flow

1. Open current release.
2. Select changed area.
3. Add release notes.
4. Preview updated package.
5. Publish new release version.

## Rules

- Never overwrite historical releases.
- Delivery failure must not erase the release.
- Raw provider payloads are diagnostic content and should not appear by default.
- Current implementation keeps release preview, publish action, and recent release history in the package workspace.
