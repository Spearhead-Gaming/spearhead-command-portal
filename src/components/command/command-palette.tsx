"use client";

import { useEffect } from "react";
import { Command, CornerDownLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onToggleShortcut: () => void;
};

const groups = [
  {
    title: "Members",
    items: ["Alex Mercer", "Harper Vale", "Jordan Pike"],
  },
  {
    title: "Units",
    items: ["Spearhead Command", "Reaper", "Misfit", "Gambler", "Viking"],
  },
  {
    title: "Deployments",
    items: ["Cold Harbor", "Black Tide"],
  },
  {
    title: "Events",
    items: ["Operation Nightfall", "Leadership Sync", "Qualification Lane"],
  },
  {
    title: "Qualifications",
    items: ["JTAC", "Medic", "AR Lead"],
  },
  {
    title: "Quick Actions",
    items: ["Open Roster", "Record Attendance", "Review Audit Logs"],
  },
];

export function CommandPalette({
  open,
  onClose,
  onToggleShortcut,
}: CommandPaletteProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onToggleShortcut();
      }

      if (event.key === "Escape" && open) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onToggleShortcut, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto bg-black/65 px-3 py-6 sm:px-4 sm:py-12">
      <button
        aria-label="Close command palette"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <Card className="relative z-10 flex max-h-[calc(100dvh-3rem)] w-full max-w-5xl flex-col border-border/80 bg-card/98 shadow-[0_30px_120px_rgba(2,6,14,0.6)]">
        <CardHeader className="space-y-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Command className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Command Palette</CardTitle>
              <CardDescription>
                UI placeholder for search-first navigation, quick actions, and one-click inspect workflows.
              </CardDescription>
            </div>
          </div>
          <Input autoFocus placeholder="Search placeholder commands, members, units, or events" />
        </CardHeader>
        <CardContent className="grid min-h-0 gap-4 overflow-y-auto p-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <section key={group.title} className="rounded-xl border border-border/70 bg-background/35 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.title}
              </h3>
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <button
                    aria-disabled="true"
                    disabled
                    key={`${group.title}-${item}`}
                    className="flex w-full cursor-not-allowed items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-sm text-muted-foreground/70"
                    title="Command palette result actions are not implemented yet."
                    type="button"
                  >
                    <span>{item}</span>
                    <CornerDownLeft className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
