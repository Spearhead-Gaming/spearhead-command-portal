# Discord Architecture

## Core Concept

Discord is the front door.  
The portal is the system of record.

## Bot Name

Recommended: Spearhead C2 Bot

## Features

### MVP
- Discord OAuth login
- Channel mapping
- Event announcements
- Attendance RSVP buttons
- Basic notifications

### Later
- Role sync
- Nickname sync
- Qualification announcements
- Promotion announcements
- Transfer notifications
- Slash command profile lookup

## Multi-Discord Support

Each unit may have its own Discord server.

The portal must support:
- multiple Discord servers
- server-to-unit mapping
- channel mappings per unit
- role mappings per unit

## Channel Mapping Types

- announcements
- events
- attendance
- conops
- intel
- staff-alerts
- admin-alerts

## Notification Routing

Notifications should target the correct people, not spam the entire community.
