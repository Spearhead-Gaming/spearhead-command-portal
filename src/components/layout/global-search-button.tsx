"use client";

import { Command, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

type GlobalSearchButtonProps = {
  onOpen: () => void;
};

export function GlobalSearchButton({ onOpen }: GlobalSearchButtonProps) {
  return (
    <Button
      aria-label="Open global search placeholder"
      className="min-w-0 flex-1 justify-between sm:max-w-xl"
      onClick={onOpen}
      variant="outline"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Search className="h-4 w-4" />
        <span className="truncate text-muted-foreground">
          Search people, units, events, or actions
        </span>
      </span>
      <span className="hidden items-center gap-1 rounded-md border border-border/70 bg-background/55 px-2 py-1 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
        <Command className="h-3 w-3" />K
      </span>
    </Button>
  );
}
