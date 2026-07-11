export const notificationTypeCatalog = [
  {
    key: "personnel.rank_changed",
    label: "Rank Changed",
    defaultUrgency: "info",
  },
  {
    key: "personnel.unit_changed",
    label: "Unit Changed",
    defaultUrgency: "action_required",
  },
  {
    key: "qualification.awarded",
    label: "Qualification Awarded",
    defaultUrgency: "info",
  },
  {
    key: "qualification.revoked",
    label: "Qualification Revoked",
    defaultUrgency: "warning",
  },
  {
    key: "qualification.expiring",
    label: "Qualification Expiring",
    defaultUrgency: "action_required",
  },
  {
    key: "qualification.signoff_required",
    label: "Qualification Sign-Off Required",
    defaultUrgency: "action_required",
  },
  {
    key: "document.published",
    label: "Document Published",
    defaultUrgency: "info",
  },
  {
    key: "document.review_required",
    label: "Document Review Required",
    defaultUrgency: "action_required",
  },
  {
    key: "document.review_overdue",
    label: "Document Review Overdue",
    defaultUrgency: "warning",
  },
  {
    key: "document.archived",
    label: "Document Archived",
    defaultUrgency: "info",
  },
  {
    key: "form.submitted",
    label: "Form Submitted",
    defaultUrgency: "action_required",
  },
  {
    key: "form.review_requested",
    label: "Form Review Requested",
    defaultUrgency: "action_required",
  },
  {
    key: "form.approved",
    label: "Form Approved",
    defaultUrgency: "info",
  },
  {
    key: "form.denied",
    label: "Form Denied",
    defaultUrgency: "warning",
  },
  {
    key: "form.changes_requested",
    label: "Form Changes Requested",
    defaultUrgency: "action_required",
  },
  {
    key: "form.comment_added",
    label: "Form Comment Added",
    defaultUrgency: "info",
  },
  {
    key: "transfer.requested",
    label: "Transfer Requested",
    defaultUrgency: "action_required",
  },
  {
    key: "transfer.approved",
    label: "Transfer Approved",
    defaultUrgency: "info",
  },
  {
    key: "transfer.denied",
    label: "Transfer Denied",
    defaultUrgency: "warning",
  },
  {
    key: "personnel.action_assigned",
    label: "Personnel Action Assigned",
    defaultUrgency: "action_required",
  },
  {
    key: "personnel.action_resolved",
    label: "Personnel Action Resolved",
    defaultUrgency: "info",
  },
  {
    key: "loa.requested",
    label: "LOA Requested",
    defaultUrgency: "action_required",
  },
  {
    key: "loa.approved",
    label: "LOA Approved",
    defaultUrgency: "info",
  },
  {
    key: "loa.denied",
    label: "LOA Denied",
    defaultUrgency: "warning",
  },
  {
    key: "loa.returned",
    label: "LOA Returned",
    defaultUrgency: "info",
  },
  {
    key: "loa.return_due",
    label: "LOA Return Due",
    defaultUrgency: "action_required",
  },
  {
    key: "rasp.application_submitted",
    label: "RASP Application Submitted",
    defaultUrgency: "action_required",
  },
  {
    key: "event.published",
    label: "Event Published",
    defaultUrgency: "action_required",
  },
  {
    key: "event.reminder",
    label: "Event Reminder",
    defaultUrgency: "action_required",
  },
  {
    key: "attendance.finalized",
    label: "Attendance Finalized",
    defaultUrgency: "info",
  },
  {
    key: "campaign.published",
    label: "Deployment Published",
    defaultUrgency: "info",
  },
  {
    key: "deployment.resource.updated",
    label: "Deployment Resource Updated",
    defaultUrgency: "info",
  },
  {
    key: "deployment.arma3_preset_updated",
    label: "Arma 3 Preset Updated",
    defaultUrgency: "action_required",
  },
  {
    key: "s3.mission_review_requested",
    label: "Operation Review Requested",
    defaultUrgency: "action_required",
  },
  {
    key: "s3.conop_published",
    label: "CONOP Published",
    defaultUrgency: "info",
  },
  {
    key: "s3.aar_missing",
    label: "AAR Missing",
    defaultUrgency: "warning",
  },
  {
    key: "s3.aar_submitted",
    label: "AAR Submitted",
    defaultUrgency: "action_required",
  },
  {
    key: "patrol.started",
    label: "Patrol Started",
    defaultUrgency: "info",
  },
  {
    key: "patrol.completed",
    label: "Patrol Completed",
    defaultUrgency: "action_required",
  },
  {
    key: "patrol.aar_required",
    label: "Patrol AAR Required",
    defaultUrgency: "action_required",
  },
  {
    key: "patrol.aar_submitted",
    label: "Patrol AAR Submitted",
    defaultUrgency: "action_required",
  },
  {
    key: "patrol.aar_missing",
    label: "Patrol AAR Missing",
    defaultUrgency: "warning",
  },
  {
    key: "patrol.aar_missing_screenshot",
    label: "Patrol AAR Missing Screenshot",
    defaultUrgency: "action_required",
  },
  {
    key: "patrol.aar_reviewed",
    label: "Patrol AAR Reviewed",
    defaultUrgency: "info",
  },
  {
    key: "deployment.progression_recommended",
    label: "Deployment Progression Recommended",
    defaultUrgency: "action_required",
  },
  {
    key: "operations.release.published",
    label: "Operations Release Published",
    defaultUrgency: "action_required",
  },
  {
    key: "operations.release.amendment_published",
    label: "Operations Release Amendment Published",
    defaultUrgency: "action_required",
  },
  {
    key: "operations.release.publication_failed",
    label: "Operations Release Publication Failed",
    defaultUrgency: "warning",
  },
  {
    key: "recommendation.generated",
    label: "Recommendation Generated",
    defaultUrgency: "info",
  },
  {
    key: "recommendation.critical",
    label: "Critical Recommendation",
    defaultUrgency: "action_required",
  },
  {
    key: "recommendation.resolved",
    label: "Recommendation Resolved",
    defaultUrgency: "info",
  },
  {
    key: "recommendation.dismissed",
    label: "Recommendation Dismissed",
    defaultUrgency: "info",
  },
  {
    key: "patrol.rsvp_recorded",
    label: "Patrol RSVP Recorded",
    defaultUrgency: "info",
  },
  {
    key: "community.announcement",
    label: "Community Announcement",
    defaultUrgency: "info",
  },
  {
    key: "system.alert",
    label: "System Alert",
    defaultUrgency: "critical",
  },
  {
    key: "discord.delivery_failed",
    label: "Discord Delivery Failed",
    defaultUrgency: "critical",
  },
  {
    key: "discord.member_joined",
    label: "Discord Member Joined",
    defaultUrgency: "info",
  },
  {
    key: "discord.member_left",
    label: "Discord Member Left",
    defaultUrgency: "warning",
  },
  {
    key: "discord.member_synced",
    label: "Discord Member Synced",
    defaultUrgency: "info",
  },
  {
    key: "discord.moderation.kicked",
    label: "Discord Member Kicked",
    defaultUrgency: "warning",
  },
  {
    key: "discord.moderation.failed",
    label: "Discord Moderation Failed",
    defaultUrgency: "critical",
  },
  {
    key: "admin.permission_changed",
    label: "Permission Changed",
    defaultUrgency: "warning",
  },
] as const;

export const notificationUrgencyCatalog = [
  "info",
  "action_required",
  "warning",
  "critical",
] as const;

export const notificationChannelCatalog = [
  "portal",
  "discord_channel",
  "discord_dm",
  "email",
] as const;

export const notificationDeliveryStatusCatalog = [
  "pending",
  "sent",
  "failed",
  "retrying",
  "cancelled",
] as const;

export const finalNotificationFailureStatuses = ["failed"] as const;

export type NotificationTypeKey = (typeof notificationTypeCatalog)[number]["key"];
export type NotificationUrgency = (typeof notificationUrgencyCatalog)[number];
export type NotificationChannelType = (typeof notificationChannelCatalog)[number];
export type NotificationDeliveryStatus = (typeof notificationDeliveryStatusCatalog)[number];

const notificationTypesByKey = new Map<string, (typeof notificationTypeCatalog)[number]>(
  notificationTypeCatalog.map((definition) => [definition.key, definition]),
);

export function isNotificationTypeKey(value: string): value is NotificationTypeKey {
  return notificationTypeCatalog.some((definition) => definition.key === value);
}

export function getNotificationTypeDefinition(key: string) {
  return notificationTypesByKey.get(key) ?? null;
}

export function isNotificationUrgency(value: string): value is NotificationUrgency {
  return notificationUrgencyCatalog.some((entry) => entry === value);
}

export function isNotificationChannelType(value: string): value is NotificationChannelType {
  return notificationChannelCatalog.some((entry) => entry === value);
}

export function isNotificationDeliveryStatus(value: string): value is NotificationDeliveryStatus {
  return notificationDeliveryStatusCatalog.some((entry) => entry === value);
}
