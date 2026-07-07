"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type ConfirmDialogPlaceholderProps = {
  triggerLabel?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
};

export function ConfirmDialogPlaceholder({
  triggerLabel = "Confirm Placeholder",
  title = "Confirm placeholder action",
  description = "This modal reserves space for later destructive or high-impact confirmations without wiring real behavior yet.",
  confirmLabel = "Confirm",
}: ConfirmDialogPlaceholderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        {triggerLabel}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/65 px-4 py-6">
          <Card className="flex max-h-[min(38rem,calc(100dvh-3rem))] w-full max-w-lg flex-col border-border/80 bg-card">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 overflow-y-auto text-sm leading-7 text-muted-foreground">
              No business logic is connected here. This is strictly a reusable visual placeholder
              for future confirmation flows.
            </CardContent>
            <CardFooter className="shrink-0 justify-end">
              <Button onClick={() => setOpen(false)} variant="ghost">
                Cancel
              </Button>
              <Button
                aria-disabled="true"
                disabled
                title={`${confirmLabel} is not implemented yet.`}
              >
                {confirmLabel}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </>
  );
}
