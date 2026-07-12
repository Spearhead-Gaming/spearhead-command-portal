export const discordEventManagementWidgets = [
  {
    dataProvider: "discord.events.upcoming",
    id: "upcoming-discord-events",
    permissions: ["discord.events.view"],
    title: "Upcoming Discord Events",
  },
  {
    dataProvider: "discord.events.approvals",
    id: "pending-event-approvals",
    permissions: ["discord.events.approve"],
    title: "Pending Event Approvals",
  },
  {
    dataProvider: "discord.events.health",
    id: "event-synchronization-health",
    permissions: ["discord.events.diagnostics.view"],
    title: "Event Synchronization Health",
  },
  {
    dataProvider: "discord.events.drift",
    id: "drifted-discord-events",
    permissions: ["discord.events.reconcile"],
    title: "Drifted Events",
  },
  {
    dataProvider: "discord.events.participation",
    id: "event-participation-signals",
    permissions: ["discord.events.participation.view"],
    title: "Event Participation Signals",
  },
] as const;
