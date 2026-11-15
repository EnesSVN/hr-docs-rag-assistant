import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  // Optional actions or hints shown under the text.
  children?: ReactNode;
  className?: string;
}

// What a space shows before it has content: an invitation, not an apology.
export function EmptyState({ icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center animate-in fade-in slide-in-from-bottom-2 duration-500 ease-apple",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-inset ring-border [&_svg]:size-6"
      >
        {icon}
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children && <div className="mt-2 w-full">{children}</div>}
    </div>
  );
}
