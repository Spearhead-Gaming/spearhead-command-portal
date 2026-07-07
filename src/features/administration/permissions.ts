export const administrationPermissions = {
  overview: ["admin.users.view"],
  users: ["admin.users.view", "admin.users.manage", "admin.roles.view"],
  roles: [
    "admin.roles.view",
    "admin.roles.create",
    "admin.roles.edit",
    "admin.roles.delete",
    "admin.permissions.view",
    "admin.permissions.assign",
  ],
  discord: [
    "discord.view",
    "discord.manage",
    "discord.servers.manage",
    "discord.channels.manage",
    "discord.notifications.send",
    "discord.bot.health.view",
  ],
  auditLogs: ["audit.view", "audit.export"],
  settings: ["admin.users.view"],
} as const;
