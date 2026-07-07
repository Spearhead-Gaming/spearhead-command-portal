import { ShieldCheck, Sparkles } from "lucide-react";

import { StatusBadge } from "@/components/status/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PageContextPanelProps = {
  route: string;
  permissions: readonly string[];
};

export function PageContextPanel({
  route,
  permissions,
}: PageContextPanelProps) {
  return (
    <aside className="space-y-4">
      <Card className="border-border/80 bg-card/72">
        <CardHeader>
          <CardTitle className="text-base">Context panel</CardTitle>
          <CardDescription>
            Optional shell-side context reserved for route metadata, quick facts, and future
            inspector-style support content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Route scaffold
            </div>
            <StatusBadge label={route} tone="info" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              Permission surface
            </div>
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <StatusBadge key={permission} label={permission} tone="muted" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-border/80 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
            Inspector drawers, quick actions, activity feeds, and command-palette actions can all
            anchor to this page scaffold without introducing feature logic yet.
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
