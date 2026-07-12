# File Upload Standards

File upload should use one shared presentation and validation model as it matures.

## Supported Artifact Types

- Mod presets
- CONOP
- OPORD
- Player primer
- AAR screenshot
- Case evidence
- Qualification evidence
- Documents

## Requirements

- Drag and drop where practical.
- File picker fallback.
- Accepted types and max size visible.
- Progress and retry state.
- Validation errors near the control.
- Filename display.
- Replacement/versioning mode for deployment resources.
- Images may preview when safe.
- `.html` Arma presets download rather than render inline.
- External links open safely.

## Rule

Do not store file blobs in the database. Store metadata and object/file references.

