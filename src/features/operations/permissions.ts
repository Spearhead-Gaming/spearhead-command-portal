export const operationsPermissions = {
  eventsList: ["events.view", "events.create", "events.edit", "events.publish", "attendance.rsvp.view"],
  eventDetail: [
    "events.view",
    "events.edit",
    "attendance.rsvp.manage",
    "attendance.record",
    "attendance.edit",
    "attendance.lock",
    "discord.notifications.send",
  ],
  attendance: ["attendance.rsvp.view"],
  campaignsList: ["campaigns.view", "campaigns.create", "campaigns.archive"],
  campaignDetail: [
    "campaigns.view",
    "campaigns.edit",
    "campaigns.publish",
    "campaigns.timeline.manage",
    "campaigns.statistics.view",
  ],
  conops: ["s3.conops.view"],
  aars: ["s3.aars.view"],
  s3: ["s3.dashboard.view", "s3.missions.view", "s3.missions.create", "s3.missions.review"],
} as const;
