# Patrol AAR Workflow

Patrols are member-led operations that require AAR follow-up.

## Doctrine

- Patrols are an event type.
- Patrols may be started by authorized members.
- Patrols may be led by authorized members.
- Patrol AARs are required.
- Weekend Operations do not use the AAR workflow.
- Patrol AARs linked to an active Deployment inform progression context for future weeks.

## AAR Submission

Patrol leaders can submit an AAR from:

- Dashboard action: Submit Patrol AAR
- Portal AAR form
- Discord `/aar` or `/patrol aar` modal when the later Discord command workflow is enabled

Portal AAR collection uses the official patrol report structure:

- Deployment, week, patrol, patrol leader, submitter, and submission time are auto-populated where possible.
- DTG is generated from the patrol end time when practical and may be edited.
- Required fields: DTG, Tasking, Callsigns, FKIA, FWIA, FMIA, EKIA, and Report.
- Reports should use grid coordinates, be descriptive but concise, and read as an operational report.
- Portal-side submission requires a map screenshot immediately.
- Discord modal submission may create a `pending-map` record because Discord modals cannot upload files; S3 cannot review until the screenshot is uploaded.
- A map screenshot is required before the AAR can be marked reviewed.
- Map screenshots must be PNG, JPG, JPEG, or WEBP and store uploader, upload time, filename, MIME type, size, Deployment, week, and patrol metadata.
- Optional supporting media may be attached as file-backed AAR attachments when it helps S3 understand the patrol.

Discord `/aar` modal collection is grouped to fit Discord modal limits while preserving the required patrol report categories:

- Patrol/event and patrol leader.
- Tasking.
- Callsigns.
- Casualty report using FKIA, FWIA, FMIA, and EKIA labels.
- Report.

Discord `/aar` and `/patrol aar` create Portal AAR records in `pending-map` state. The bot also creates pending screenshot state so a future Discord attachment handler can attach the required map screenshot; S3 review cannot mark the AAR reviewed until the screenshot exists.

Submitted AARs create Portal AAR records, notify S3 Staff, and create audit/activity entries.

Discord is only a client. Portal AAR records are authoritative.

## S3 Review and Progression

S3 review captures:

- Progression Decision.
- Recommended Next Operation Version.
- Enemy Activity Notes.
- Friendly Activity Notes.
- Unit Performance Notes.
- Suggested Tasking Adjustments.
- Planning Notes for Next Week.
- Lessons Learned.

Reviewed Patrol AARs surface on Deployment timelines and operational week views so operation creators can decide the next version, branch, or tasking path.

## Queue States

The AAR queue separates:

- Awaiting AAR: completed patrols with no AAR yet.
- Missing Screenshot: AAR text exists but the required map screenshot is missing.
- Awaiting Review: AAR text and map screenshot exist and S3 review is needed.
- Reviewed: S3 has closed the loop.
