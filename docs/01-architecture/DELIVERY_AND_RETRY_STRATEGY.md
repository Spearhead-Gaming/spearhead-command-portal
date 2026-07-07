# Delivery and Retry Strategy

## 1. Purpose

This document defines how notification delivery should be tracked, retried, and surfaced to administrators.

## 2. Delivery Record

Each delivery attempt should create or update a NotificationDelivery record.

Fields:

- notificationId
- channel
- recipientUserId
- discordChannelId
- status
- errorMessage
- sentAt
- retryCount
- createdAt
- updatedAt

## 3. Delivery Statuses

- pending
- sent
- failed
- retrying
- cancelled

## 4. Retryable Failures

Retry these:

- temporary Discord API failure
- rate limit
- timeout
- network error

## 5. Non-Retryable Failures

Do not endlessly retry:

- missing Discord permissions
- invalid channel ID
- user DMs disabled
- bot removed from server
- deleted Discord server mapping

## 6. Retry Count

MVP recommendation:

- max 3 attempts
- record every failure
- mark final status as failed
- alert admin after final failure

## 7. Admin Visibility

Discord settings/admin dashboard should show:

- failed notifications
- delivery status
- retry action
- error message
- related notification
- related Discord channel/server

## 8. Core Data Safety

Notification failures should not roll back successful core actions.

Example:

If a qualification is awarded successfully but the Discord DM fails, the qualification remains awarded. The failed DM is logged and optionally retried.
