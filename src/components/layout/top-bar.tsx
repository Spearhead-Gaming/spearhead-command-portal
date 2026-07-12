"use client";

import { Menu } from "lucide-react";

import { GlobalSearchButton } from "@/components/layout/global-search-button";
import { NotificationButton } from "@/components/layout/notification-button";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AuthenticatedPortalSession } from "@/features/auth/types";
import type { NotificationCenterData } from "@/server/notifications/types";
import type { WorkspaceProfile } from "@/server/personas/types";

type TopBarProps = {
  session: AuthenticatedPortalSession;
  notificationCenter: NotificationCenterData;
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
  onOpenNavigation: () => void;
  workspaceProfile: WorkspaceProfile;
};

export function TopBar({
  session,
  notificationCenter,
  onOpenCommandPalette,
  onOpenNotifications,
  onOpenNavigation,
  workspaceProfile,
}: TopBarProps) {
  return (
    <header className="z-30 shrink-0 border-b border-border/80 bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[100rem] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8 xl:px-10">
        <Button
          className="shrink-0 lg:hidden"
          onClick={onOpenNavigation}
          size="icon"
          variant="outline"
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open navigation</span>
        </Button>
        <GlobalSearchButton onOpen={onOpenCommandPalette} />
        <WorkspaceSwitcher workspaceProfile={workspaceProfile} />
        <div className="hidden min-w-0 shrink items-center gap-2 2xl:flex">
          <StatusBadge label="Authenticated" tone="success" />
          <StatusBadge
            label={session.user.discordLinked ? "Discord Linked" : "Discord Not Linked"}
            tone={session.user.discordLinked ? "success" : "warning"}
          />
          <StatusBadge
            label={session.user.memberProfileLinked ? "Profile Linked" : "Profile Link Pending"}
            tone={session.user.memberProfileLinked ? "info" : "warning"}
          />
        </div>
        <NotificationButton
          disabled={!notificationCenter.enabled}
          onOpen={onOpenNotifications}
          unreadCount={notificationCenter.unreadCount}
        />
        <Separator className="hidden h-8 lg:block" orientation="vertical" />
        <UserMenu session={session} />
      </div>
    </header>
  );
}
