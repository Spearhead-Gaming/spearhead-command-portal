"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type DeploymentCreateDrawerProps = {
  closeHref: string;
  children: React.ReactNode;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function DeploymentCreateDrawer({
  closeHref,
  children,
}: DeploymentCreateDrawerProps) {
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeDrawer = useCallback(() => {
    router.push(closeHref);
  }, [closeHref, router]);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const currentFocusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => element.offsetParent !== null);

      if (currentFocusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = currentFocusable[0];
      const lastElement = currentFocusable[currentFocusable.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [closeDrawer]);

  return (
    <div className="fixed inset-0 z-[85] flex overscroll-contain bg-black/65">
      <button
        aria-label="Close deployment creation drawer"
        className="hidden flex-1 lg:block"
        onClick={closeDrawer}
        type="button"
      />
      <aside
        aria-labelledby="deployment-create-title"
        aria-modal="true"
        className="ml-auto flex h-full w-full max-w-full flex-col border-l border-border/80 bg-background shadow-[0_24px_80px_rgba(2,6,14,0.62)] sm:max-w-[min(56rem,calc(100vw-2rem))]"
        ref={drawerRef}
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/80 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Deployment workflow
            </p>
            <h2 id="deployment-create-title" className="mt-1 text-xl font-semibold text-foreground">
              Create deployment
            </h2>
          </div>
          <Button onClick={closeDrawer} size="icon" type="button" variant="ghost">
            <X className="h-4 w-4" />
            <span className="sr-only">Close deployment creation drawer</span>
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {children}
        </div>
      </aside>
    </div>
  );
}
