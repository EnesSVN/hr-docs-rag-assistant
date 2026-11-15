"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  id?: string;
  number: number;
  filename: string;
  content: string;
  // The answer cites this passage.
  cited?: boolean;
  // Flashes once to draw the eye, e.g. after its badge was pressed.
  highlighted?: boolean;
}

const LONG_TEXT = 180;

// One passage the search found: which file, which number, and the text.
export function SourceCard({ id, number, filename, content, cited = false, highlighted = false }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const long = content.length > LONG_TEXT;

  return (
    <article
      id={id}
      aria-label={`Source ${number}: ${filename}`}
      className={cn(
        "rounded-xl border bg-card px-3 py-2.5 text-[13px] transition-colors duration-300",
        cited ? "border-primary/40" : "border-border",
        highlighted && "animate-source-flash border-primary",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-md px-1 text-[11px] font-semibold",
            cited ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {number}
        </span>
        <span className="truncate font-medium" title={filename}>
          {filename}
        </span>
        {cited && <span className="ml-auto shrink-0 text-xs font-medium text-success">Cited</span>}
      </div>
      <p className={cn("whitespace-pre-wrap leading-relaxed text-muted-foreground", !expanded && "line-clamp-3")}>{content}</p>
      {long && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 text-xs font-medium text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </article>
  );
}
