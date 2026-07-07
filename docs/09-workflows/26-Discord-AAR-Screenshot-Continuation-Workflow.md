# Discord AAR Screenshot Continuation Workflow

## Purpose

Discord modals cannot upload files, so `/aar` and `/patrol aar` split Patrol AAR submission into two portal-backed steps.

## Flow

1. Member runs `/aar` or `/patrol aar`.
2. Discord opens the Patrol AAR modal.
3. Modal submission creates a portal `Aar` record in `pending-map` status.
4. The interaction session stores the pending AAR and waits for screenshot continuation.
5. Member runs `/patrol screenshot image:<file>`.
6. Portal resolves the active session or pending AAR.
7. Portal validates the attachment type and size.
8. Portal stores the file through the AAR attachment storage abstraction.
9. Portal marks the AAR `submitted`.
10. S3 receives the AAR review notification.

## Accepted Screenshot Types

- PNG
- JPG
- JPEG
- WEBP

The screenshot is stored as a file-backed `AarAttachment`, not as a database blob.

## Session Requirements

The continuation uses `DiscordInteractionSession` with:

- `workflowType = AAR_SCREENSHOT_UPLOAD`
- `currentStep = AWAITING_SCREENSHOT`
- related entity pointing at the pending AAR
- expiration controlled by `DISCORD_INTERACTION_SESSION_TTL_MINUTES`

Expired sessions must not complete the action. The portal may fall back to a still-active pending AAR owned by the same linked Discord identity.

## Safety Rules

- Discord is only the client.
- Portal identity linking is required.
- Portal permissions are checked through the service layer.
- Missing screenshot is informational/action-required, not a failed AAR.
- S3 cannot mark the AAR reviewed until the screenshot exists.
