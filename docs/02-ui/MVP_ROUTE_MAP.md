# MVP Route Map

## Purpose

This document lists the routes that should exist in the first project foundation build.

These routes may initially use placeholder data and placeholder components.

## Auth

```text
/
 /login
 /logout
```

## App

```text
/dashboard
/applications
/applications/[id]
```

## Personnel

```text
/personnel/members
/personnel/members/[id]
/personnel/roster
/personnel/qualifications
```

## Units

```text
/units
/units/[unitId]
```

## Operations

```text
/operations/events
/operations/events/[id]
/operations/attendance
/operations/campaigns
/operations/campaigns/[id]
/operations/packages/[campaignId]/week/[weekNumber]
/operations/packages/[campaignId]/week/[weekNumber]/releases
/operations/conops
/operations/aar-queue
/operations/aars
/operations/s3
```

## Training

```text
/training/qualification-matrix
/training/events
/training/instructors
```

## Documents

```text
/documents
/documents/[id]
```

## Administration

```text
/administration
/administration/forms
/administration/forms/[id]
/administration/submissions
/administration/users
/administration/roles
/administration/discord
/administration/audit-logs
/administration/settings
```

## Route Guard Rule

All application routes except `/login` should require authentication once auth is implemented.

During the foundation build, route guard placeholders are acceptable.
