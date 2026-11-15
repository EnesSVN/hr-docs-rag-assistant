"use client";

import { ChevronDown } from "lucide-react";
import { SourceCard } from "@/components/molecules/SourceCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { citedNumbers } from "@/lib/citations";
import type { SearchResult } from "@/lib/search";

interface SourceListProps {
  // Used to give each card a unique id, so a badge can scroll to it.
  messageId: string;
  sources: SearchResult[];
  // The answer text; the numbers inside it decide which sources count as cited.
  answer: string;
  activeSource: number | null;
}

export const sourceCardId = (messageId: string, number: number) => `${messageId}-source-${number}`;

// The passages behind an answer. Cited ones come first and are always visible; the other
// passages that were searched are folded away. Numbers match the "[n]" in the answer.
export function SourceList({ messageId, sources, answer, activeSource }: SourceListProps) {
  if (sources.length === 0) return null;

  const cited = citedNumbers(answer, sources.length);
  const others = sources.map((source, index) => ({ source, number: index + 1 })).filter(({ number }) => !cited.includes(number));

  const card = (number: number, isCited: boolean) => {
    const source = sources[number - 1];
    return (
      <SourceCard
        key={number}
        id={sourceCardId(messageId, number)}
        number={number}
        filename={source.filename}
        content={source.content}
        cited={isCited}
        highlighted={activeSource === number}
      />
    );
  };

  return (
    <section aria-label="Sources" className="flex flex-col gap-2">
      {cited.map((number) => card(number, true))}

      {others.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown aria-hidden="true" className="size-3.5 transition-transform duration-200 ease-apple group-data-[state=open]:rotate-180" />
            {cited.length > 0 ? `Also searched (${others.length})` : `Passages searched (${others.length})`}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 flex flex-col gap-2">
            {others.map(({ number }) => card(number, false))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}
