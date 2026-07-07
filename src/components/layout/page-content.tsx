import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/layout-primitives";

type PageContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageContent({ children, className }: PageContentProps) {
  return (
    <main
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10",
        className,
      )}
    >
      <PageContainer>{children}</PageContainer>
    </main>
  );
}
