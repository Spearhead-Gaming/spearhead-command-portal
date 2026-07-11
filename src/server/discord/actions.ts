"use server";

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

export async function saveDiscordServerMappingAction(formData: FormData) {
  const actor = await requirePermission("discord.servers.manage");

  await upsertDiscordServerMapping({
    actorUserId: actor.id,
    gatewayEnabled: getBooleanValue(formData, "gatewayEnabled"),
    guildId: getRequiredString(formData, "guildId", "Guild ID"),
    id: getOptionalString(formData, "id") ?? undefined,
    isActive: getBooleanValue(formData, "isActive"),
    isPrimary: getBooleanValue(formData, "isPrimary"),
    memberSyncPolicy: getOptionalString(formData, "memberSyncPolicy"),
    name: getRequiredString(formData, "name", "Server name"),
    nicknameSyncPolicy: getOptionalString(formData, "nicknameSyncPolicy"),
    roleSyncPolicy: getOptionalString(formData, "roleSyncPolicy"),
    unitId: getOptionalString(formData, "unitId"),
    voiceAwarenessEnabled: getBooleanValue(formData, "voiceAwarenessEnabled"),
  });
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
