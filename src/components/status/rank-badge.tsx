import { Badge } from "@/components/ui/badge";

type RankBadgeProps = {
  label: string;
};

export function RankBadge({ label }: RankBadgeProps) {
  return (
    <Badge className="border-primary/25 bg-primary/10 font-mono text-primary" variant="outline">
      {label}
    </Badge>
  );
}
