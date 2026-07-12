"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/server/permissions/access";
import {
  disableDiscordChannelMapping,
  disableDiscordRoleMapping,
  testDiscordChannelDeliveryPlaceholder,
  upsertDiscordChannelMapping,
  upsertDiscordRoleMapping,
  upsertDiscordServerMapping,
} from "@/server/discord/service";
import {
  isDiscordChannelMappingKey,
  isDiscordRoleMappingType,
} from "@/server/discord/constants";
import {
  previewDiscordRoleSync,
  runDiscordRoleSync,
} from "@/server/discord/role-sync";
import {
  kickDiscordGuildMember,
  runDiscordGuildMemberSync,
} from "@/server/discord/guild-members";
import { mergeDiscordIdentityDuplicates } from "@/server/discord/identity";
import {
  type DiscordDiscoveryResourceType,
  runDiscordResourceDiscovery,
} from "@/server/discord/discovery";
import {
  discoverAvailableDiscordGuilds,
  ensurePrimaryCommunityGuild,
} from "@/server/discord/platform";

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  return value || null;
}

function getBooleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function revalidateDiscordAdmin() {
  revalidatePath("/administration/discord");
}

export async function saveDiscordServerMappingAction(formData: FormData) {
  const actor = await requirePermission("discord.servers.manage");

  await upsertDiscordServerMapping({
    actorUserId: actor.id,
    description: getOptionalString(formData, "description"),
    gatewayEnabled: getBooleanValue(formData, "gatewayEnabled"),
    guildType: getOptionalString(formData, "guildType"),
    guildId: getRequiredString(formData, "guildId", "Guild ID"),
    iconUrl: getOptionalString(formData, "iconUrl"),
    id: getOptionalString(formData, "id") ?? undefined,
    inviteUrl: getOptionalString(formData, "inviteUrl"),
    isActive: getBooleanValue(formData, "isActive"),
    isPrimary: getBooleanValue(formData, "isPrimary"),
    locale: getOptionalString(formData, "locale"),
    memberSyncPolicy: getOptionalString(formData, "memberSyncPolicy"),
    name: getRequiredString(formData, "name", "Server name"),
    nicknameSyncPolicy: getOptionalString(formData, "nicknameSyncPolicy"),
    roleSyncPolicy: getOptionalString(formData, "roleSyncPolicy"),
    shortName: getOptionalString(formData, "shortName"),
    timezone: getOptionalString(formData, "timezone"),
    unitId: getOptionalString(formData, "unitId"),
    voiceAwarenessEnabled: getBooleanValue(formData, "voiceAwarenessEnabled"),
  });
}

export async function bootstrapPrimaryCommunityGuildAction(formData: FormData) {
  const actor = await requirePermission("discord.guilds.manage");

  await ensurePrimaryCommunityGuild({
    actorUserId: actor.id,
    guildId: getOptionalString(formData, "guildId"),
  });
  revalidateDiscordAdmin();
}

export async function discoverDiscordGuildsAction() {
  const actor = await requirePermission("discord.guilds.discover");

  await discoverAvailableDiscordGuilds({
    actorUserId: actor.id,
  });
  revalidateDiscordAdmin();
}

export async function importDiscordGuildInventoryAction(formData: FormData) {
  const actor = await requirePermission("discord.guilds.discover");

  await runDiscordResourceDiscovery({
    actorUserId: actor.id,
    discoveryType: "full",
    discordServerId: getRequiredString(formData, "discordServerId", "Discord guild"),
  });
  revalidateDiscordAdmin();
}

export async function runDiscordDiscoveryDryRunAction(formData: FormData) {
  const actor = await requirePermission("discord.discovery.run");

  await runDiscordResourceDiscovery({
    actorUserId: actor.id,
    discoveryType: "dry_run",
    discordServerId: getRequiredString(formData, "discordServerId", "Discord guild"),
    dryRun: true,
  });
  revalidateDiscordAdmin();
}

export async function runDiscordTargetedDiscoveryAction(formData: FormData) {
  const actor = await requirePermission("discord.discovery.run");
  const resourceTypes = formData
    .getAll("resourceTypes")
    .map((value) => String(value))
    .filter((value): value is DiscordDiscoveryResourceType =>
      ["guild", "channels", "roles", "events", "emojis", "stickers", "permissions"].includes(value),
    );

  await runDiscordResourceDiscovery({
    actorUserId: actor.id,
    discoveryType: "targeted",
    discordServerId: getRequiredString(formData, "discordServerId", "Discord guild"),
    resourceTypes,
  });
  revalidateDiscordAdmin();
}

export async function saveDiscordChannelMappingAction(formData: FormData) {
  const actor = await requirePermission("discord.channels.manage");
  const key = getRequiredString(formData, "key", "Mapping type");

  if (!isDiscordChannelMappingKey(key)) {
    throw new Error("Select a valid Discord channel mapping type.");
  }

  await upsertDiscordChannelMapping({
    actorUserId: actor.id,
    channelId: getRequiredString(formData, "channelId", "Channel ID"),
    description: getOptionalString(formData, "description"),
    discordServerId: getRequiredString(formData, "discordServerId", "Discord server"),
    id: getOptionalString(formData, "id") ?? undefined,
    isActive: getBooleanValue(formData, "isActive"),
    key,
  });
}

export async function disableDiscordChannelMappingAction(formData: FormData) {
  const actor = await requirePermission("discord.channels.manage");

  await disableDiscordChannelMapping({
    actorUserId: actor.id,
    id: getRequiredString(formData, "mappingId", "Discord channel mapping"),
  });
}

export async function requestDiscordTestDeliveryAction(formData: FormData) {
  const actor = await requirePermission("discord.notifications.send");

  await testDiscordChannelDeliveryPlaceholder({
    actorUserId: actor.id,
    mappingId: getRequiredString(formData, "mappingId", "Discord channel mapping"),
  });
}

export async function saveDiscordRoleMappingAction(formData: FormData) {
  const actor = await requirePermission("discord.roles.manage");
  const mappingType = getRequiredString(formData, "mappingType", "Role mapping type");

  if (!isDiscordRoleMappingType(mappingType)) {
    throw new Error("Select a valid Discord role mapping type.");
  }

  await upsertDiscordRoleMapping({
    actorUserId: actor.id,
    description: getOptionalString(formData, "description"),
    discordRoleId: getRequiredString(formData, "discordRoleId", "Discord role ID"),
    discordRoleName: getOptionalString(formData, "discordRoleName"),
    discordServerId: getRequiredString(formData, "discordServerId", "Discord server"),
    id: getOptionalString(formData, "id") ?? undefined,
    isActive: getBooleanValue(formData, "isActive"),
    mappingType,
    qualificationId: getOptionalString(formData, "qualificationId"),
    rankId: getOptionalString(formData, "rankId"),
    roleId: getOptionalString(formData, "roleId"),
    unitId: getOptionalString(formData, "unitId"),
  });
}

export async function disableDiscordRoleMappingAction(formData: FormData) {
  const actor = await requirePermission("discord.roles.manage");

  await disableDiscordRoleMapping({
    actorUserId: actor.id,
    id: getRequiredString(formData, "roleMappingId", "Discord role mapping"),
  });
}

export async function previewDiscordRoleSyncAction(formData: FormData) {
  const actor = await requirePermission("discord.sync.view");

  await previewDiscordRoleSync({
    actorUserId: actor.id,
    discordServerId: getRequiredString(formData, "discordServerId", "Discord server"),
  });
}

export async function runDiscordRoleSyncAction(formData: FormData) {
  const actor = await requirePermission("discord.sync.run");

  await runDiscordRoleSync({
    actorUserId: actor.id,
    discordServerId: getRequiredString(formData, "discordServerId", "Discord server"),
  });
}

export async function runDiscordMemberSyncAction(formData: FormData) {
  const actor = await requirePermission("discord.members.sync");

  await runDiscordGuildMemberSync({
    actorUserId: actor.id,
    discordServerId: getRequiredString(formData, "discordServerId", "Discord server"),
  });
}

export async function mergeDiscordIdentityDuplicateAction(formData: FormData) {
  const actor = await requirePermission("discord.identity.merge");

  await mergeDiscordIdentityDuplicates({
    actorUserId: actor.id,
    discordUserId: getRequiredString(formData, "discordUserId", "Discord user"),
  });
}

export async function kickDiscordMemberAction(formData: FormData) {
  const actor = await requirePermission("discord.moderation.kick");

  await kickDiscordGuildMember({
    actorUserId: actor.id,
    discordServerId: getRequiredString(formData, "discordServerId", "Discord server"),
    reason: getRequiredString(formData, "reason", "Reason"),
    targetDiscordUserId: getRequiredString(formData, "targetDiscordUserId", "Target Discord user"),
  });
}
