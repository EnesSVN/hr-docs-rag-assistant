// Answers cite their sources like "[3]" or "[1, 2]". These helpers turn that text into
// parts the screen can show as clickable badges. A number only counts when a source
// with that number exists, so a made-up "[9]" is shown as plain text, never as a link.

export type AnswerPart =
  | { type: "text"; value: string }
  | { type: "citation"; numbers: number[]; raw: string };

const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

function validNumbers(group: string, sourceCount: number): number[] {
  const numbers = group.split(",").map((part) => Number(part.trim()));
  const valid = numbers.filter((n) => Number.isInteger(n) && n >= 1 && n <= sourceCount);
  return [...new Set(valid)];
}

export function splitCitations(text: string, sourceCount: number): AnswerPart[] {
  const parts: AnswerPart[] = [];
  let last = 0;

  for (const match of text.matchAll(CITATION)) {
    const numbers = validNumbers(match[1], sourceCount);
    if (numbers.length === 0) continue; // leave it inside the surrounding text

    const start = match.index ?? 0;
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    parts.push({ type: "citation", numbers, raw: match[0] });
    last = start + match[0].length;
  }

  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

// Source numbers the answer really cites, smallest first, without repeats.
export function citedNumbers(text: string, sourceCount: number): number[] {
  const numbers = splitCitations(text, sourceCount).flatMap((part) => (part.type === "citation" ? part.numbers : []));
  return [...new Set(numbers)].sort((a, b) => a - b);
}
