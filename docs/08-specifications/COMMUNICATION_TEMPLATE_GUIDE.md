# Communication Template Guide

## Purpose

Communication templates standardize repeatable portal and Discord messages without hard-coding copy into every module.

## Template Fields

Templates should define:

- key
- title
- description
- category
- subject
- body
- supported channels
- active state

## Variables

Templates may use simple double-brace variables:

```text
{{title}}
{{body}}
{{eventTitle}}
{{operationDate}}
```

The communication service renders templates before delivery. Missing variables should fall back to an empty string rather than leaking raw placeholders to members.

## Defaults

Default templates should cover:

- community announcements
- operation releases
- event reminders
- qualification awards
- form review alerts
- Discord delivery failures

## Rules

- Templates do not decide authorization.
- Templates do not resolve recipients.
- Templates do not choose Discord channels directly.
- Templates may define supported channels, but the communication request still controls requested delivery.
