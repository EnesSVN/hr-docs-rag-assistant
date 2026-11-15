import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface CitationBadgeProps extends Omit<ComponentProps<"button">, "children"> {
  number: number;
  // True while the source it points to is the one being shown.
  active?: boolean;
}

// The small "3" inside an answer. Pressing it shows the source passage it points to.
export function CitationBadge({ number, active = false, className, ...props }: CitationBadgeProps) {
  return (
    <button
      type="button"
      aria-label={`Show source ${number}`}
      aria-pressed={active}
      className={cn(
        "mx-0.5 inline-flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-md px-1 align-baseline text-[11px] font-semibold leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-link hover:bg-primary/20",
        className,
      )}
      {...props}
    >
      {number}
    </button>
  );
}
