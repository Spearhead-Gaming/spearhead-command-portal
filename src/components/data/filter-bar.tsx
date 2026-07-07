import { SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type FilterBarProps = {
  filters?: string[];
  supports?: string[];
};

export function FilterBar({ filters, supports }: FilterBarProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Badge className="gap-1 border-border bg-card/70 text-muted-foreground" variant="outline">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
      </Badge>
      {filters?.map((filter) => (
        <Badge
          key={filter}
          className="max-w-full border-border bg-card/70 text-muted-foreground"
          variant="outline"
        >
          <span className="truncate">{filter}</span>
        </Badge>
      ))}
      {supports?.map((support) => (
        <Badge
          key={support}
          className="max-w-full border-primary/20 bg-primary/8 text-primary"
          variant="outline"
        >
          <span className="truncate">{support}</span>
        </Badge>
      ))}
    </div>
  );
}
