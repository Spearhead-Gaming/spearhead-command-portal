import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed border-border/90 bg-card/70">
      <CardHeader>
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <FilePlus2 aria-hidden="true" className="h-5 w-5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {actionLabel ? (
        <CardContent>
          <Button
            aria-disabled="true"
            disabled
            title={`${actionLabel} is not implemented yet.`}
            variant="outline"
          >
            {actionLabel}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
