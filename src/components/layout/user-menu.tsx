"use client";

import Link from "next/link";
import Image from "next/image";

import type { AuthenticatedPortalSession } from "@/features/auth/types";

type UserMenuProps = {
  session: AuthenticatedPortalSession;
};

function getUserInitials(displayName: string) {
  const normalizedName = displayName.trim().replace(/\s+/g, " ");

  if (!normalizedName) {
    return "??";
  }

  return normalizedName
    .split(" ")
    .map((part) => part.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu({ session }: UserMenuProps) {
  const displayName = session.user.displayName?.trim() || "Unknown Member";
  const avatarUrl = session.user.avatarUrl?.trim() || null;
  const primaryRole = session.user.primaryRole?.trim() || "Portal User";
  const profileState = session.user.callsign?.trim()
    || (session.user.memberProfileLinked ? "Linked member profile" : "Member profile pending");
  const initials = getUserInitials(displayName);
  const avatarAlt = `${displayName} Discord avatar`;

  return (
    <Link
      aria-label={`Open user menu for ${displayName}`}
      className="flex min-w-0 shrink-0 items-center gap-3 rounded-xl border border-border/80 bg-card/70 px-2.5 py-2 transition-colors hover:bg-card sm:max-w-[16rem] sm:px-3"
      href="/logout"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-primary/14 font-mono text-sm font-semibold text-primary">
        {avatarUrl ? (
          // This URL is server-provided from the authenticated session, so the
          // first client render matches SSR and avoids hydration drift.
          <Image
            alt={avatarAlt}
            className="h-full w-full object-cover"
            height={40}
            src={avatarUrl}
            width={40}
          />
        ) : (
          <span aria-label={`${displayName} initials`}>{initials}</span>
        )}
      </div>
      <div className="hidden min-w-0 text-left sm:block">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {primaryRole}
        </p>
        <p className="truncate text-xs text-muted-foreground/90">{profileState}</p>
      </div>
    </Link>
  );
}
