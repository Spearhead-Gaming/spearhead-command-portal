# Deployment Resources Workflow

## Overview

Deployment Resources attach current operational links and downloadable files to deployments and weekly operations while preserving historical versions.

## Business Rules

- Resources are optional.
- A resource may be an external URL or uploaded file.
- Resource updates create versions instead of overwriting history.
- Exactly one version should be current.
- Members see only current active versions by default.
- Staff/admins can inspect older versions.
- Week-specific resources supplement inherited deployment resources.
- CONOP files/links are week-specific operation resources when attached to an event.

## Arma 3 Preset Flow

1. S3 uploads an Arma 3 Launcher `.html` or `.htm` preset as `ARMA3_PRESET`.
2. Portal stores the file through the storage abstraction.
3. Portal parses preset name, mod count, and Workshop URLs when practical.
4. Portal marks the new version current.
5. Portal archives the previous current version.
6. Portal audits and emits notification hooks for the preset update.
7. Deployment, weekly operation, member dashboard, and Discord announcements show Current Mod Preset.

## CONOP Resource Flow

1. S3 attaches a CONOP as resource type `CONOP` on the specific weekly operation event.
2. The CONOP may be an uploaded file or external URL.
3. Portal marks the uploaded/linked version current.
4. Replacing the CONOP creates a new resource version and preserves the previous version for staff/admin history.
5. Members see only the current active CONOP by default.
6. The weekly operation package displays the current CONOP alongside Weekly Tasking, Unit Taskings, inherited OPORD/resource links, mod preset, Zeus assignment, timeline, and attendance/RSVP.
7. Discord operation announcements include the current CONOP link/file when the resource is member-visible and a mapped event channel exists.

## Permissions

- `deployments.resources.view`
- `deployments.resources.upload`
- `deployments.resources.edit`
- `deployments.resources.delete`
- `deployments.edit`
- `deployments.publish`

## Audit Events

- `deployment.resource.version_created`
- `deployment.resource.current_version_changed`
- `deployment.resource.arma3_preset_updated`
- `deployment.resource.old_version_archived`
- `deployment.resource.deleted`
- `deployment.resource.conop_updated`

## UI Surfaces

- Deployment detail Resources card.
- Weekly operation inherited resources and week resources.
- Weekly operation package Current CONOP.
- Member dashboard Current Mod Preset.
- Discord operation announcement resource links.
- Staff-only version history.

## Failure States

| Failure | Expected Behavior |
| --- | --- |
| Unsupported file type | Block upload with validation. |
| Arma preset is not `.html` or `.htm` | Block upload with validation. |
| Storage write fails | Do not mark a new current version. |
| Notification hook fails | Log safely and do not block resource update. |

## Cross References

- [Deployment Workflow](07-Campaign-Workflow.md)
- [Operations Lifecycle](05-Operations-Lifecycle.md)
- [Deployment Resources Module](../03-modules/DEPLOYMENT_RESOURCES.md)
