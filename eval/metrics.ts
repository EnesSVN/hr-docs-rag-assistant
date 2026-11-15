// Position (1 = best) of the expected document in the search results,
// or null when it is not among them.
export function rankOfExpected(
  returnedFilenames: string[],
  expected: string,
): number | null {
  const index = returnedFilenames.indexOf(expected);
  return index === -1 ? null : index + 1;
}

export interface EvalSummary {
  total: number;
  hitAt1: number;
  hitAt3: number;
  hitAt5: number;
}

// "hitAtN" counts the questions whose expected document was in the first N results.
export function summarize(ranks: (number | null)[]): EvalSummary {
  const hits = (n: number) =>
    ranks.filter((rank) => rank !== null && rank <= n).length;
  return {
    total: ranks.length,
    hitAt1: hits(1),
    hitAt3: hits(3),
    hitAt5: hits(5),
  };
}

export interface RankedQuestion {
  rank: number | null;
  // true when the question and the expected document are in the same language
  sameLanguage: boolean;
}

// Splits the result by whether question and document share a language.
export function breakdownByLanguage(items: RankedQuestion[]): {
  sameLanguage: EvalSummary;
  crossLanguage: EvalSummary;
} {
  return {
    sameLanguage: summarize(items.filter((i) => i.sameLanguage).map((i) => i.rank)),
    crossLanguage: summarize(items.filter((i) => !i.sameLanguage).map((i) => i.rank)),
  };
}
