"use client";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { AuthenticatedPortalSession } from "@/features/auth/types";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  open: boolean;
  session: AuthenticatedPortalSession;
  onClose: () => void;
};

export function MobileNav({ open, session, onClose }: MobileNavProps) {
  return (
    <>
      <button
        aria-hidden={!open}
        aria-label="Close navigation drawer"
        className={cn(
          "fixed inset-0 z-40 bg-black/55 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transition-transform lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarNav onNavigate={onClose} session={session} />
      </aside>
    </>
  );
}
