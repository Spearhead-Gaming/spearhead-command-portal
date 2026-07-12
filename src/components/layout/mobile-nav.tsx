"use client";

import { useRef } from "react";

import { useFocusTrap } from "@/components/layout/focus-management";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { AuthenticatedPortalSession } from "@/features/auth/types";
import { cn } from "@/lib/utils";
import type { WorkspaceProfile } from "@/server/personas/types";

type MobileNavProps = {
  open: boolean;
  session: AuthenticatedPortalSession;
  onClose: () => void;
  workspaceProfile: WorkspaceProfile;
};

export function MobileNav({ open, session, onClose, workspaceProfile }: MobileNavProps) {
  const drawerRef = useRef<HTMLElement | null>(null);

  useFocusTrap(drawerRef, {
    active: open,
    onEscape: onClose,
  });

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
        aria-label="Mobile navigation"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] outline-none transition-transform lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <SidebarNav onNavigate={onClose} session={session} workspaceProfile={workspaceProfile} />
      </aside>
    </>
  );
}
