import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlaceholderSection as PlaceholderSectionType } from "@/types/placeholder-page";

type PlaceholderSectionProps = {
  section: PlaceholderSectionType;
};

export function PlaceholderSection({ section }: PlaceholderSectionProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {section.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
