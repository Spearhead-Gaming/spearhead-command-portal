export const discordModerationWidgets = [
  {
    dataProvider: "discord.moderation.cases",
    id: "discord-moderation-open-cases",
    permissions: ["discord.moderation.view"],
    title: "Open Moderation Cases",
  },
  {
    dataProvider: "discord.moderation.approvals",
    id: "discord-moderation-pending-approvals",
    permissions: ["discord.moderation.case.manage"],
    title: "Pending Moderation Approvals",
  },
  {
    dataProvider: "discord.moderation.appeals",
    id: "discord-moderation-appeals",
    permissions: ["discord.moderation.appeals"],
    title: "Pending Appeals",
  },
] as const;
