"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { StatusBadge } from "@/components/shared/status-badge";
import type { AuthenticatedPortalSession } from "@/features/auth/types";
import { filterNavigationGroups, isNavigationItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  session: AuthenticatedPortalSession;
  onNavigate?: () => void;
};

export function SidebarNav({ session, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const groups = filterNavigationGroups(session.user.permissions);

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border/80 bg-linear-to-b from-[#091320] to-[#07111d]">
      <div className="border-b border-border/80 px-4 py-5 xl:px-5">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Spearhead
          </p>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">Command Portal</h2>
            <p className="text-sm text-muted-foreground">Milestone 2 shell polish</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/45 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Context</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">
              {session.user.unit ?? "No unit linked yet"}
            </p>
          </div>
        </div>
      </div>
      <nav
        aria-label="Primary navigation"
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5 xl:px-4"
      >
        {groups.map((group) => (
          <section key={group.title} className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {group.title}
              </h3>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isNavigationItemActive(pathname, item.href, item.exact);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    className={cn(
                      "flex min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_rgba(111,152,201,0.2)]"
                        : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                    )}
                    href={item.href}
                    onClick={onNavigate}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </span>
                    {active ? <StatusBadge className="hidden xl:inline-flex" label="Live" tone="info" /> : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
      <div className="border-t border-border/80 p-4">
        <div className="rounded-xl border border-border/70 bg-background/45 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Portal Status</p>
          <p className="mt-1 text-sm text-foreground">
            Discord OAuth is live, while feature workflows and Discord automation stay in scaffold mode.
          </p>
        </div>
      </div>
    </div>
  );
}
