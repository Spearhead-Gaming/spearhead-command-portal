# Form Standards

Forms should feel deliberate, short, and recoverable.

## Canonical Structure

- Required fields first.
- Optional or advanced fields in collapsible sections.
- Labels always visible.
- Help text concise.
- Validation near the field.
- One submit action.
- Cancel behavior predictable.
- Server action forms must not specify conflicting `method` or `encType`.

## Field Groups

Use grouped sections for:

- Deployment creation
- Weekly planning
- Unit tasking
- Patrol AAR
- Member profile
- Qualification requirements
- Attendance policy
- Communication template
- Case creation
- Discord configuration

## File Inputs

Use the canonical upload/resource pattern when available. Do not store blobs in the database.

