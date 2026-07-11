"use server";

import { revalidatePath } from "next/cache";

import {
  cancelScheduledCommunication,
  createAnnouncement,
  retryAllFailedCommunicationDeliveries,
  retryCommunicationDelivery,
  sendAnnouncement,
} from "@/server/communications/service";
import { ensureDefaultCommunicationTemplates } from "@/server/communications/templates";
import { requirePermission } from "@/server/permissions/access";

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
}

export async function createAnnouncementAction(formData: FormData) {
  await createAnnouncement({
    body: getRequiredString(formData, "body", "Announcement body"),
    requestedChannels: [{ type: "portal" }],
    targetAudience: [{ type: "all_active_members" }],
    title: getRequiredString(formData, "title", "Announcement title"),
    type: getRequiredString(formData, "type", "Announcement type"),
  });
}

export async function sendAnnouncementAction(formData: FormData) {
  await sendAnnouncement(getRequiredString(formData, "announcementId", "Announcement"));
}

export async function ensureCommunicationTemplatesAction() {
  await requirePermission("communications.templates.manage");
  await ensureDefaultCommunicationTemplates();
  revalidatePath("/communications");
}

export async function retryCommunicationDeliveryAction(formData: FormData) {
  await retryCommunicationDelivery(getRequiredString(formData, "deliveryId", "Delivery"));
}

export async function retryAllFailedCommunicationDeliveriesAction() {
  await retryAllFailedCommunicationDeliveries();
}

export async function cancelScheduledCommunicationAction(formData: FormData) {
  await cancelScheduledCommunication(getRequiredString(formData, "communicationId", "Communication"));
}
