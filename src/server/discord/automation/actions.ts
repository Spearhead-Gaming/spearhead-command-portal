"use server";

import { revalidatePath } from "next/cache";

import { discordAutomationEngine } from "@/server/discord/automation/service";
import { requirePermission } from "@/server/permissions/access";

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

function revalidateDiscordAutomation() {
  revalidatePath("/administration/discord");
  revalidatePath("/personnel/qualifications");
  revalidatePath("/training/qualification-matrix");
}

export async function syncDiscordAutomationDefinitionsAction() {
  const actor = await requirePermission("discord.automation.manage");

  await discordAutomationEngine.syncDefinitionsFromRoleMappings({
    actorUserId: actor.id,
  });
  revalidateDiscordAutomation();
}

export async function approveDiscordAutomationExecutionAction(formData: FormData) {
  const actor = await requirePermission("discord.automation.approve");

  await discordAutomationEngine.approveExecution({
    actorUserId: actor.id,
    executionId: getRequiredString(formData, "executionId", "Automation execution"),
    reason: getOptionalString(formData, "reason"),
  });
  revalidateDiscordAutomation();
}

export async function rejectDiscordAutomationExecutionAction(formData: FormData) {
  const actor = await requirePermission("discord.automation.approve");

  await discordAutomationEngine.rejectExecution({
    actorUserId: actor.id,
    executionId: getRequiredString(formData, "executionId", "Automation execution"),
    reason: getOptionalString(formData, "reason"),
  });
  revalidateDiscordAutomation();
}

export async function runDiscordAutomationExecutionAction(formData: FormData) {
  const actor = await requirePermission("discord.automation.execute");

  await discordAutomationEngine.executeAutomationExecution({
    actorUserId: actor.id,
    executionId: getRequiredString(formData, "executionId", "Automation execution"),
  });
  revalidateDiscordAutomation();
}

export async function retryDiscordAutomationExecutionAction(formData: FormData) {
  const actor = await requirePermission("discord.automation.retry");

  await discordAutomationEngine.retryExecution({
    actorUserId: actor.id,
    executionId: getRequiredString(formData, "executionId", "Automation execution"),
    reason: getOptionalString(formData, "reason"),
  });
  revalidateDiscordAutomation();
}
