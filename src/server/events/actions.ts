"use server";

import { redirect } from "next/navigation";

import {
  archiveEvent,
  cancelEvent,
  createEvent,
  editEvent,
  publishEvent,
} from "@/server/events/service";
import { sendEventAnnouncementToDiscord } from "@/server/discord/events";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRequiredDate(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);

  return new Date(value);
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  return value ? new Date(value) : null;
}

function withFlash(returnTo: string, key: "message" | "error", value: string) {
  const [pathname, existingQuery] = returnTo.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  params.set(key, value);

  return `${pathname}?${params.toString()}`;
}

async function runAction(
  formData: FormData,
  operation: () => Promise<void>,
  successMessage: string,
) {
  const returnTo = getRequiredString(formData, "returnTo") || "/operations/events";

  try {
    await operation();
    redirect(withFlash(returnTo, "message", successMessage));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete the request.";
    redirect(withFlash(returnTo, "error", message));
  }
}

export async function createEventAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await createEvent({
        title: getRequiredString(formData, "title"),
        description: getOptionalString(formData, "description"),
        eventType: getRequiredString(formData, "eventType"),
        hostUnitId: getOptionalString(formData, "hostUnitId"),
        campaignId: getOptionalString(formData, "campaignId"),
        startsAt: getRequiredDate(formData, "startsAt"),
        endsAt: getOptionalDate(formData, "endsAt"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Event created.",
  );
}

export async function editEventAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await editEvent({
        eventId: getRequiredString(formData, "eventId"),
        title: getRequiredString(formData, "title"),
        description: getOptionalString(formData, "description"),
        eventType: getRequiredString(formData, "eventType"),
        hostUnitId: getOptionalString(formData, "hostUnitId"),
        campaignId: getOptionalString(formData, "campaignId"),
        startsAt: getRequiredDate(formData, "startsAt"),
        endsAt: getOptionalDate(formData, "endsAt"),
        reason: getOptionalString(formData, "reason"),
      });
    },
    "Event updated.",
  );
}

export async function publishEventAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await publishEvent(
        getRequiredString(formData, "eventId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Event published.",
  );
}

export async function cancelEventAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await cancelEvent(
        getRequiredString(formData, "eventId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Event cancelled.",
  );
}

export async function archiveEventAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await archiveEvent(
        getRequiredString(formData, "eventId"),
        getOptionalString(formData, "reason"),
      );
    },
    "Event archived.",
  );
}

export async function sendDiscordAnnouncementAction(formData: FormData) {
  await runAction(
    formData,
    async () => {
      await sendEventAnnouncementToDiscord(getRequiredString(formData, "eventId"));
    },
    "Discord announcement sent.",
  );
}
