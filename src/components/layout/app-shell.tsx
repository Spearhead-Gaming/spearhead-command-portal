"use client";

import { useState } from "react";

import { CommandPalette } from "@/components/command/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PageContent } from "@/components/layout/page-content";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
import type { AuthenticatedPortalSession } from "@/features/auth/types";
import { NotificationCenterDrawer } from "@/features/notifications/components/notification-center-drawer";
import type { NotificationCenterData } from "@/server/notifications/types";

type AppShellProps = {
  children: React.ReactNode;
  notificationCenter: NotificationCenterData;
  session: AuthenticatedPortalSession;
};

export function AppShell({ children, notificationCenter, session }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <aside className="hidden h-full w-72 shrink-0 xl:w-80 lg:block">
          <SidebarNav session={session} />
        </aside>
        <MobileNav
          onClose={() => setMobileNavOpen(false)}
          open={mobileNavOpen}
          session={session}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar
            notificationCenter={notificationCenter}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenNavigation={() => setMobileNavOpen(true)}
            session={session}
          />
          <PageContent>{children}</PageContent>
        </div>
      </div>
      <CommandPalette
        onClose={() => setCommandPaletteOpen(false)}
        onToggleShortcut={() => setCommandPaletteOpen((current) => !current)}
        open={commandPaletteOpen}
      />
      <NotificationCenterDrawer
        data={notificationCenter}
        onClose={() => setNotificationsOpen(false)}
        open={notificationsOpen}
      />
      <div
        aria-atomic="true"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 px-4"
      />
    </div>
  );
}
