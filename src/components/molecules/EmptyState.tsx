import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  // Optional actions or hints shown under the text.
  children?: ReactNode;
  // "sm" is for small spaces such as the sidebar.
  size?: "md" | "sm";
  className?: string;
}

// What a space shows before it has content: an invitation, not an apology.
export function EmptyState({ icon, title, description, children, size = "md", className }: EmptyStateProps) {
  const small = size === "sm";
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center text-center animate-in fade-in slide-in-from-bottom-2 duration-500 ease-apple",
        small ? "gap-2 px-3 py-6" : "gap-3 px-6 py-12",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground ring-1 ring-inset ring-border",
          small ? "size-10 rounded-xl [&_svg]:size-5" : "size-14 rounded-2xl [&_svg]:size-6",
        )}
      >
        {icon}
      </div>
      <h2 className={cn("font-semibold tracking-tight", small ? "text-sm" : "text-xl")}>{title}</h2>
      <p className={cn("leading-relaxed text-muted-foreground", small ? "text-xs" : "text-sm")}>{description}</p>
      {children && <div className="mt-2 w-full">{children}</div>}
    </div>
  );
}
