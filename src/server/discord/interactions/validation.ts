import { createPublicKey, verify } from "node:crypto";

import { getDiscordIntegrationConfig } from "@/server/discord/config";

const discordEd25519SpkiPrefix = Buffer.from("302a300506032b6570032100", "hex");

type ValidationInput = {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
};

export type DiscordInteractionValidationResult =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
      status: number;
    };

function getDiscordPublicKeyObject() {
  const publicKey = getDiscordIntegrationConfig().publicKey;

  if (!publicKey) {
    return null;
  }

  const rawPublicKey = Buffer.from(publicKey, "hex");

  if (rawPublicKey.length !== 32) {
    return null;
  }

  return createPublicKey({
    key: Buffer.concat([discordEd25519SpkiPrefix, rawPublicKey]),
    format: "der",
    type: "spki",
  });
}

export function validateDiscordInteractionRequest(
  input: ValidationInput,
): DiscordInteractionValidationResult {
  if (!input.signature || !input.timestamp) {
    return {
      message: "Discord signature headers are required.",
      ok: false,
      status: 401,
    };
  }

  const publicKey = getDiscordPublicKeyObject();

  if (!publicKey) {
    return {
      message: "Discord interaction validation is not configured.",
      ok: false,
      status: 503,
    };
  }

  try {
    const signature = Buffer.from(input.signature, "hex");

    if (signature.length !== 64) {
      return {
        message: "Discord signature format is invalid.",
        ok: false,
        status: 401,
      };
    }

    const isValid = verify(
      null,
      Buffer.from(`${input.timestamp}${input.rawBody}`),
      publicKey,
      signature,
    );

    if (!isValid) {
      return {
        message: "Discord request signature could not be verified.",
        ok: false,
        status: 401,
      };
    }

    return { ok: true };
  } catch {
    return {
      message: "Discord request signature could not be verified.",
      ok: false,
      status: 401,
    };
  }
}
