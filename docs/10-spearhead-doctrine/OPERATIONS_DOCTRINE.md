# Spearhead Operations Doctrine

## Language

- User-facing copy says Deployment, Weekend Operation, Patrol, Training, Meeting, Community Event, or Operation.
- Generic Mission language is limited to internal compatibility fields and legacy model names.
- The database model `Campaign` remains the compatibility model for Deployments.

## Hierarchy

- Deployment is the multi-week operational arc.
- Deployment Week is the planning bucket for a single operational week.
- Weekend Operation is the primary weekly operation.
- Patrol is a separate event that may be started and led by authorized members.
- Weekly Tasking and Unit Taskings describe what the whole community and each unit are doing that week.

## Participation

- Every active unit participates in each Deployment by default.
- Unit-specific work is expressed through Unit Tasking.
- Deployment creation should create the configured number of Deployment Weeks, typically four or five.

## Weekly Operation Package

Each Deployment Week owns exactly one Operations Package. The Operations Package is the central planning object for that week.

Each package contains:

- Weekly Tasking.
- Unit Taskings.
- CONOP file or external link.
- OPORD, Player Primer, mod preset, map, radio, intel, briefing, and other inherited Deployment Resources.
- Optional week-level resource overrides.
- Zeus assignment.
- Timeline.
- Attendance and RSVP.

Planning status moves through Planning, Tasking, Resources, and Review. Publishing and Discord delivery are separate later workflow phases.

## Readiness

Operations Package readiness answers whether a weekly package is complete enough to proceed.

- Operational Readiness checks planning completeness.
- Publication Readiness checks future publication safety.
- Blocking failures create a No-Go state.
- Warnings should be visible but do not block.
- Continue to Preview and Publish become available when publication readiness is not blocked and the user has release permissions.

## Release Management

- Publishing an Operations Package creates an immutable Operations Release snapshot.
- The first published release is `v1.0`.
- Amendments preserve older releases and increment the version.
- Only one published release is active for an operational week.
- Discord delivers the release announcement; the Portal remains the source of truth.

## CONOP

- CONOP is a file or external link attached to the Weekly Operation Package.
- CONOP is not primarily a rich editor record.
- A Deployment may have multiple CONOPs over time, usually one per week or operation when needed.
- Discord operation announcements should include the current CONOP when member-visible.

## AAR

- Weekend Operations do not use AARs.
- Patrol AARs are required.
- Patrol AARs inform Deployment progression decisions and the next operation version/path.
- Patrol AAR review captures progression decision, recommended next version/path, enemy activity, friendly activity, issues for next week, unit performance notes, tasking adjustments, planning notes for next week, and lessons learned.
- Patrol AARs require a map screenshot before S3 can mark them reviewed.
- Discord `/aar` or `/patrol aar` captures the report, then the submitter uploads the map screenshot through the portal or future Discord attachment handling.

## Patrols

- User-facing copy should say Start Patrol, not Create Patrol.
- Patrols are lightweight and should be startable in under 30 seconds.
- Patrols default to the current active Deployment and operational week.
- Patrol RSVP interest is not final attendance.
- Confirmed patrol participants are managed separately from RSVP interest.
- Multiple patrols may run at the same time.

## Zeus

- Deployment Zeus mode supports creator-as-Zeus, assigned Zeus, and unassigned.
- Zeus changes are tracked in assignment history and audited.
