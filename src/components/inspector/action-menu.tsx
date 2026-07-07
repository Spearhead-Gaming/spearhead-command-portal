"use client";

import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

type ActionMenuProps = {
  label?: string;
  items?: string[];
  className?: string;
};

export function ActionMenu({
  label = "Actions",
  items = ["Inspect Placeholder", "Open Detail", "Queue Follow-up"],
  className,
}: ActionMenuProps) {
  return (
    <details className={cn("group relative", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-border/70 bg-background/45 p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground">
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">{label}</span>
      </summary>
      <div className="absolute right-0 top-11 z-20 min-w-48 rounded-xl border border-border/80 bg-popover p-2 shadow-[0_20px_60px_rgba(3,8,16,0.45)]">
        <div className="px-2 pb-2 pt-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="space-y-1">
          {items.map((item) => (
            <button
              aria-disabled="true"
              disabled
              key={item}
              className="flex w-full cursor-not-allowed items-center rounded-lg px-3 py-2 text-left text-sm text-muted-foreground/70"
              title={`${item} is not implemented yet.`}
              type="button"
            >
              {item} <span className="ml-auto text-[0.65rem] uppercase tracking-[0.16em]">Soon</span>
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
