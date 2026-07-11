# Evidence Management

## Purpose

Evidence records preserve supporting material without storing large files directly in the database.

## Evidence Types

- image
- video
- document
- external link
- Discord message link
- screenshot
- text statement
- supporting file metadata

## Rules

- Store uploaded files through file storage abstractions.
- Store metadata, links, and storage keys in the database.
- Do not hard-delete evidence through normal workflows.
- Status values should preserve history, such as active, superseded, invalid, or removed from consideration.
- Never expose restricted evidence to unauthorized users.

