# Discord Communication Workflow

## 1. Purpose

The Discord communication workflow defines how the Spearhead Command Portal interacts with Spearhead's Discord servers and channels.

The portal should reduce manual announcements, reminders, and role updates while keeping Discord as the primary member-facing workspace.

## 2. Guiding Principle

> Discord is where members act. The portal is where records live.

## 3. Current Process Analysis

Questions to answer:

- How many Discord servers does Spearhead use?
- Which units have separate Discord servers?
- Which channels are used for announcements?
- Which channels are used for attendance?
- Which channels are used for CONOPs?
- Which channels are used for intel?
- Who can post official announcements?
- Are Discord roles tied to rank/unit/qualification?
- Are nicknames standardized?

## 4. Pain Points

Common issues this workflow should solve:

- Announcements manually reposted across multiple servers
- Attendance responses scattered
- Unit-specific information hard to route
- Role updates done manually
- Members forget where to find information
- No audit trail for official announcements

## 5. Discord Server Model

The portal should support multiple Discord servers.

Potential mappings:

- Spearhead Command Discord
- Reaper Discord
- Misfit Discord
- Gambler Discord
- Viking Discord

Each server can map to one or more units.

## 6. Channel Mapping Types

Recommended channel mapping types:

- announcements
- events
- attendance
- conops
- intel
- staff-alerts
- admin-alerts
- qualification-alerts
- promotion-alerts

## 7. Notification Routing

Notifications must be targeted.

Examples:

### Promotion

Notify:
- Member
- Unit leadership
- Staff channel
- Optional public announcement channel

### Transfer

Notify:
- Member
- Previous unit leadership
- Receiving unit leadership
- S1

### Qualification Awarded

Notify:
- Member
- Instructor
- Unit leadership, if required
- Qualification channel, if configured

### Event Published

Notify:
- Participating units
- Required roles
- Attendance channel

## 8. Discord Actions

MVP actions:

- RSVP buttons
- Event notifications
- Basic announcements
- Channel mapping
- Discord OAuth login

Future actions:

- `/profile`
- `/quals`
- `/events`
- `/myunit`
- `/attendance`
- role sync
- nickname sync
- approval buttons

## 9. Required Portal Features

- Discord server settings
- Unit-to-server mapping
- Channel mapping UI
- Notification templates
- Notification delivery logs
- Bot health status
- Failed delivery alerts

## 10. Required Data

Core data objects:

- DiscordServer
- DiscordChannelMapping
- DiscordRoleMapping
- DiscordUserLink
- Notification
- NotificationDelivery
- Unit
- Role
- Profile

## 11. Permissions

Example permissions:

- `discord.view`
- `discord.manage`
- `discord.channels.manage`
- `discord.roles.manage`
- `discord.notifications.send`
- `announcements.publish`

## 12. Audit Requirements

Log all changes to:

- Discord server mappings
- Channel mappings
- Role mappings
- Manual notification sends
- Failed notification retries
- Announcement publishing

## 13. Automation Opportunities

- Auto-post event reminders
- Auto-post CONOP summaries
- Auto-notify leadership for missing attendance
- Auto-sync roles after rank/unit changes
- Auto-DM members for pending tasks
- Auto-post campaign updates

## 14. Future Expansion

Future Discord features:

- Interactive admin approvals
- Command-based roster lookup
- Qualification lookup
- Attendance check-in
- Discord thread creation for missions
- Cross-unit announcement routing
