import { cn } from "@/lib/utils";

type LayoutPrimitiveProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: LayoutPrimitiveProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[100rem] flex-col gap-7 pb-10 sm:gap-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionStack({ children, className }: LayoutPrimitiveProps) {
  return <div className={cn("space-y-6 sm:space-y-7", className)}>{children}</div>;
}

export function ResponsiveGrid({ children, className }: LayoutPrimitiveProps) {
  return (
    <section
      className={cn(
        "grid min-w-0 gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SplitWorkspace({ children, className }: LayoutPrimitiveProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Toolbar({ children, className }: LayoutPrimitiveProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
