import { describe, expect, it } from "vitest";
import { citedNumbers, splitCitations } from "./citations";

describe("splitCitations", () => {
  it("returns a single text part when there is no citation", () => {
    expect(splitCitations("No sources here.", 3)).toEqual([{ type: "text", value: "No sources here." }]);
  });

  it("returns nothing for an empty text", () => {
    expect(splitCitations("", 3)).toEqual([]);
  });

  it("splits text and a citation", () => {
    expect(splitCitations("You get 20 days [3] per year.", 5)).toEqual([
      { type: "text", value: "You get 20 days " },
      { type: "citation", numbers: [3], raw: "[3]" },
      { type: "text", value: " per year." },
    ]);
  });

  it("handles a citation at the very start and at the very end", () => {
    expect(splitCitations("[1] first, last [2]", 2)).toEqual([
      { type: "citation", numbers: [1], raw: "[1]" },
      { type: "text", value: " first, last " },
      { type: "citation", numbers: [2], raw: "[2]" },
    ]);
  });

  it("handles several citations in a row", () => {
    const parts = splitCitations("Both agree [1][2].", 2);

    expect(parts.filter((p) => p.type === "citation")).toHaveLength(2);
  });

  it("understands a list like [1, 2]", () => {
    expect(splitCitations("See [1, 2].", 3)[1]).toEqual({ type: "citation", numbers: [1, 2], raw: "[1, 2]" });
  });

  it("does not link a source number that does not exist", () => {
    expect(splitCitations("Made up [9].", 5)).toEqual([{ type: "text", value: "Made up [9]." }]);
  });

  it("does not link [0]", () => {
    expect(splitCitations("Zero [0].", 5)).toEqual([{ type: "text", value: "Zero [0]." }]);
  });

  it("keeps only the real numbers of a mixed list", () => {
    expect(splitCitations("Mixed [1, 9].", 3)[1]).toEqual({ type: "citation", numbers: [1], raw: "[1, 9]" });
  });

  it("ignores brackets that are not citations", () => {
    expect(splitCitations("See [the policy] and [a1].", 5)).toEqual([
      { type: "text", value: "See [the policy] and [a1]." },
    ]);
  });

  it("links nothing when there are no sources", () => {
    expect(splitCitations("Odd [1].", 0)).toEqual([{ type: "text", value: "Odd [1]." }]);
  });

  it("keeps the original text when the parts are put back together", () => {
    const text = "A [1] and B [2, 3] but [7] stays.";
    const rebuilt = splitCitations(text, 3)
      .map((part) => (part.type === "text" ? part.value : part.raw))
      .join("");

    expect(rebuilt).toBe(text);
  });
});

describe("citedNumbers", () => {
  it("lists the cited sources once each, smallest first", () => {
    expect(citedNumbers("B [3] and A [1] and again [3], also [2, 1].", 5)).toEqual([1, 2, 3]);
  });

  it("is empty when nothing is cited", () => {
    expect(citedNumbers("No citations.", 5)).toEqual([]);
  });

  it("ignores numbers without a source", () => {
    expect(citedNumbers("Bad [8].", 5)).toEqual([]);
  });
});
