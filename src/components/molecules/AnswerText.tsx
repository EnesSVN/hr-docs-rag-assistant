import { Fragment } from "react";
import { CitationBadge } from "@/components/molecules/CitationBadge";
import { splitCitations } from "@/lib/citations";

interface AnswerTextProps {
  text: string;
  sourceCount: number;
  // The source number that is open right now, if any.
  activeSource?: number | null;
  onCitationClick?: (number: number) => void;
}

// An answer where "[3]" is shown as a badge that can be pressed.
export function AnswerText({ text, sourceCount, activeSource = null, onCitationClick }: AnswerTextProps) {
  const parts = splitCitations(text, sourceCount);

  return (
    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
      {parts.map((part, index) =>
        part.type === "text" ? (
          // Models often write "[1] ." with a space before the dot; remove it after a badge.
          <Fragment key={index}>{index > 0 ? part.value.replace(/^\s+(?=[.,;:!?])/, "") : part.value}</Fragment>
        ) : (
          <Fragment key={index}>
            {part.numbers.map((number) => (
              <CitationBadge
                key={number}
                number={number}
                active={activeSource === number}
                onClick={() => onCitationClick?.(number)}
              />
            ))}
          </Fragment>
        ),
      )}
    </p>
  );
}
