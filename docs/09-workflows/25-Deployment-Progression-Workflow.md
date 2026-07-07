# Deployment Progression Workflow

## Purpose

Deployment progression uses reviewed Patrol AARs as operational intelligence for deciding the next weekly operation version, path, or tasking adjustment.

Weekend Operations do not use AARs. Patrols always require AARs.

## Inputs

- Completed Patrols linked to a Deployment or Deployment Week.
- Patrol AAR report fields.
- Required map screenshot.
- Optional supporting media.
- S3 review notes.

## S3 Review Outputs

S3 reviewers record:

- Progression Decision.
- Recommended Next Operation Version.
- Enemy Activity Notes.
- Friendly Activity Notes.
- Unit Performance Notes.
- Suggested Tasking Adjustments.
- Planning Notes for Next Week.
- Lessons Learned.

## Workflow

1. Patrol ends and enters AAR follow-up.
2. Patrol leader submits the official Patrol AAR.
3. If the map screenshot is missing, the AAR stays `pending-map`.
4. Screenshot upload moves the AAR to `submitted`.
5. S3 reviews the AAR.
6. S3 records progression context.
7. Deployment timeline and week views surface the progression decision and next-week notes.

## Dashboard Signals

Operations Center surfaces:

- Patrols Awaiting AAR.
- AARs Missing Screenshot.
- AARs Awaiting Review.
- Recent Progression Recommendations.
- Current Week Planning Notes where available.

## Audit Events

- `aar.draft_created`
- `aar.submitted`
- `aar.map_screenshot_uploaded`
- `aar.additional_media_uploaded`
- `aar.reviewed`
- `deployment.progression_recommendation_added`
- `deployment.progression_decision_updated`

## Notification Hooks

- `patrol.aar_required`
- `patrol.aar_submitted`
- `patrol.aar_missing_screenshot`
- `patrol.aar_reviewed`
- `deployment.progression_recommended`

## Safety Rules

- Portal remains source of truth.
- Discord may submit text and upload a screenshot, but cannot bypass portal validation.
- AAR review is blocked until the required map screenshot exists.
- Staff-only progression notes must not be posted publicly.
