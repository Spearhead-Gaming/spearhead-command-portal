import { cn } from "@/lib/utils";

type LayoutPrimitiveProps = {
  children: React.ReactNode;
  className?: string;
};

type SectionHeaderProps = {
  action?: React.ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  status?: React.ReactNode;
  title: string;
};

type ActionGroupProps = LayoutPrimitiveProps & {
  align?: "start" | "end" | "between";
};

type PageContainerProps = LayoutPrimitiveProps & {
  variant?: "standard" | "wide" | "full-width" | "focused-workflow";
};

export function PageContainer({
  children,
  className,
  variant = "wide",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 flex-col gap-7 pb-10 sm:gap-8",
        variant === "standard" && "max-w-6xl",
        variant === "wide" && "max-w-[100rem]",
        variant === "full-width" && "max-w-none",
        variant === "focused-workflow" && "max-w-5xl",
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

export function SectionHeader({
  action,
  className,
  description,
  eyebrow,
  status,
  title,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {status}
        </div>
        {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ActionGroup({
  align = "start",
  children,
  className,
}: ActionGroupProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
        align === "end" && "sm:justify-end",
        align === "between" && "sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
