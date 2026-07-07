"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { getDeveloperBootstrapReadiness } from "@/server/auth/developer-bootstrap";
import {
  isDeveloperBootstrapEnabled,
  isDiscordOAuthConfigured,
} from "@/server/auth/runtime-config";

export async function loginWithDiscord() {
  if (!isDiscordOAuthConfigured()) {
    redirect("/login?error=discord-not-configured");
  }

  await signIn("discord", { redirectTo: "/dashboard" });
}

export async function loginWithDeveloperBootstrap(formData: FormData) {
  if (!isDeveloperBootstrapEnabled()) {
    redirect("/login");
  }

  const readiness = await getDeveloperBootstrapReadiness();

  if (!readiness.ready) {
    if (readiness.reason === "database_unavailable") {
      redirect("/internal/bootstrap?error=database-unavailable");
    }

    if (readiness.reason === "system_role_missing") {
      redirect("/internal/bootstrap?error=system-role-missing");
    }

    redirect("/internal/bootstrap?error=bootstrap-disabled");
  }

  const secret = String(formData.get("secret") ?? "");

  try {
    await signIn("credentials", {
      redirectTo: "/dashboard",
      secret,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/internal/bootstrap?error=invalid-credentials");
    }

    throw error;
  }
}

export async function logoutFromPortal() {
  await signOut({ redirectTo: "/login" });
}
