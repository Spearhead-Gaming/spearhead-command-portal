# Product Requirements Document

## 1. Overview

The Spearhead Command Portal is a Discord-first personnel, operations, and community management platform built specifically for Spearhead Gaming.

The system should support Spearhead's current structure while allowing future changes through configuration and seed data rather than hard-coded logic.

## 2. Product Positioning

This project is built for one community: **Spearhead Gaming**.

It should not attempt to satisfy every possible Milsim community. Design decisions should prioritize Spearhead's actual workflows, staff structure, Discord usage, and member expectations.

## 3. Required MVP Capabilities

### Personnel
- Member profiles
- Roster management
- Rank tracking
- Unit assignment
- Position/billet assignment
- Profile status
- Basic service history

### Qualifications
- Qualification catalog
- Member qualification records
- Instructor sign-off
- Qualification matrix
- Unit-required qualifications
- Position-required qualifications

### Units
Initial units:
- Spearhead Command
- 3rd Infantry Division (Reaper)
- 75th Ranger Regiment (Misfit)
- 1st Air Cavalry Brigade (Gambler)
- Detachment-7 (Viking)

Units must be configurable records.

### Operations
- Events
- Attendance
- RSVP
- Event reminders
- Operation history

### Campaigns
- Campaign overview pages
- Campaign timeline
- Participating units
- Related operations
- CONOP links
- AAR links

### Discord
- Discord OAuth
- Bot notifications
- Channel mapping
- RSVP buttons
- Role sync later

## 4. Non-Goals

- Do not replace Discord
- Do not force members to use the portal for every action
- Do not overbuild ERP-style features in the MVP
- Do not build a generic marketplace/SaaS product
- Do not hard-code the current unit structure into business logic

## 5. Success Metrics

- Leaders can update roster data quickly
- Qualification status is clear at a glance
- Members can RSVP from Discord
- Campaign pages are easy to read
- Discord remains the primary member workflow
- New Spearhead units, qualifications, ranks, and workflows can be added without redesigning the app
