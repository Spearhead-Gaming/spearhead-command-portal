import { Clock3 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityTimelinePlaceholderProps = {
  title?: string;
  description?: string;
  items?: Array<{
    label: string;
    meta: string;
    detail: string;
  }>;
};

const defaultItems = [
  {
    label: "Roster readiness reviewed",
    meta: "Today · 0900",
    detail: "Placeholder milestone for leadership review and assignment follow-up.",
  },
  {
    label: "Qualification window opened",
    meta: "Yesterday · 1930",
    detail: "Reserved for future qualification award or expiry events.",
  },
  {
    label: "Deployment briefing drafted",
    meta: "Yesterday · 1700",
    detail: "Timeline component reserved for operational narrative updates.",
  },
];

export function ActivityTimelinePlaceholder({
  title = "Activity timeline",
  description = "Reusable timeline placeholder for profiles, deployments, and operations.",
  items = defaultItems,
}: ActivityTimelinePlaceholderProps) {
  return (
    <Card className="border-border/80 bg-card/72">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/55 text-primary">
                  <Clock3 className="h-4 w-4" />
                </div>
                {index < items.length - 1 ? <div className="mt-2 h-full w-px bg-border/80" /> : null}
              </div>
              <div className="space-y-1 pb-6">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.meta}</p>
                <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
