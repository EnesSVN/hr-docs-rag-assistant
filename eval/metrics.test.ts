import { describe, it, expect } from "vitest";
import { breakdownByLanguage, rankOfExpected, summarize } from "./metrics";

describe("rankOfExpected", () => {
  it("returns the 1-based position of the expected document", () => {
    expect(rankOfExpected(["a.md", "b.md", "c.md"], "b.md")).toBe(2);
  });

  it("uses the first position when the document appears more than once", () => {
    expect(rankOfExpected(["a.md", "b.md", "b.md"], "b.md")).toBe(2);
  });

  it("returns null when the document is missing", () => {
    expect(rankOfExpected(["a.md", "b.md"], "z.md")).toBeNull();
  });

  it("returns null for an empty result list", () => {
    expect(rankOfExpected([], "a.md")).toBeNull();
  });
});

describe("summarize", () => {
  it("counts hits at 1, 3 and 5", () => {
    const summary = summarize([1, 2, 3, 4, 5, null]);
    expect(summary).toEqual({ total: 6, hitAt1: 1, hitAt3: 3, hitAt5: 5 });
  });

  it("handles an empty list", () => {
    expect(summarize([])).toEqual({ total: 0, hitAt1: 0, hitAt3: 0, hitAt5: 0 });
  });
});

describe("breakdownByLanguage", () => {
  it("separates same-language and cross-language questions", () => {
    const result = breakdownByLanguage([
      { rank: 1, sameLanguage: true },
      { rank: 1, sameLanguage: true },
      { rank: 3, sameLanguage: false },
      { rank: null, sameLanguage: false },
    ]);
    expect(result.sameLanguage).toEqual({ total: 2, hitAt1: 2, hitAt3: 2, hitAt5: 2 });
    expect(result.crossLanguage).toEqual({ total: 2, hitAt1: 0, hitAt3: 1, hitAt5: 1 });
  });
});
