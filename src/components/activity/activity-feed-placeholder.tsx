import { BellRing, MessageSquareMore, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/status/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityFeedPlaceholderProps = {
  title?: string;
  description?: string;
};

const feedItems = [
  {
    title: "Discord routing placeholder",
    description: "Portal-originated notifications will appear here once integrations are implemented.",
    icon: BellRing,
    tone: "warning" as const,
  },
  {
    title: "Role-aware action queue",
    description: "Future workflow nudges can surface alongside the operational context panel.",
    icon: ShieldCheck,
    tone: "info" as const,
  },
  {
    title: "Discussion summaries",
    description: "Reserved for concise updates that complement Discord instead of duplicating it.",
    icon: MessageSquareMore,
    tone: "muted" as const,
  },
];

export function ActivityFeedPlaceholder({
  title = "Activity feed",
  description = "A lightweight placeholder for updates, nudges, and portal-side operational signals.",
}: ActivityFeedPlaceholderProps) {
  return (
    <Card className="border-border/80 bg-card/72">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/35 p-4"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/90 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <StatusBadge label="Placeholder" tone={item.tone} />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
