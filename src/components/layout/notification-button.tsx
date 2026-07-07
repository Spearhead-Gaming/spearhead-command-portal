"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

type NotificationButtonProps = {
  disabled?: boolean;
  onOpen: () => void;
  unreadCount: number;
};

export function NotificationButton({
  disabled = false,
  onOpen,
  unreadCount,
}: NotificationButtonProps) {
  return (
    <Button
      aria-label="Open notifications"
      className="relative"
      disabled={disabled}
      onClick={onOpen}
      size="icon"
      type="button"
      variant="outline"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
      <span className="sr-only">Notifications</span>
    </Button>
  );
}
