# Deployment Resources Module

## Purpose

Deployment Resources provide a scalable way to attach links and uploaded files to deployments and weekly operations without adding one-off fields for every document type.

## Resource Types

- CONOP.
- OPORD.
- Player Primer.
- Arma 3 Preset.
- Map.
- Intelligence.
- Radio Plan.
- Briefing.
- Mod Collection.
- Document.
- Image.
- Video.
- Other.

## Versioning Rules

- Updating a file or link creates a new `DeploymentResourceVersion`.
- Only one version is current at a time.
- Previous current versions are archived but remain available to staff/admins.
- Members see current active member-visible versions by default.
- Staff can view version history when they have deployment resource management or audit permissions.

## CONOP Rules

- CONOP files or external links are `CONOP` resources.
- The active CONOP path is an event-scoped weekly operation resource, not a rich editor-first record.
- A deployment may have multiple CONOPs over time by attaching one to each weekly operation when needed.
- Member-visible current CONOP versions appear with Weekly Tasking and Unit Taskings and are included in Discord operation announcements when published.
- Older CONOP versions remain visible to authorized staff/admins through version history.

## Arma 3 Preset Rules

- Arma 3 Launcher presets are `ARMA3_PRESET` resources.
- Accept `.html` and `.htm` uploads only.
- Uploaded preset files must download and must never render in-browser.
- Parse preset name, mod count, and Workshop URLs when practical.
- Display Current Mod Preset on deployment, weekly operation, member dashboard, and Discord announcements.

## Storage

Files are not stored as database blobs. The database stores metadata and storage keys. The current local storage adapter can later be replaced by S3, Cloudflare R2, Azure Blob, or another provider without changing business logic.

## Audit

Audit resource version created, current version changed, Arma 3 preset updated, old version archived, resource archived, file uploaded, and file removed where applicable.
