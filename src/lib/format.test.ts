import { describe, expect, it } from "vitest";
import { capitalize, formatShortDate, pluralize } from "./format";

describe("formatShortDate", () => {
  it("shows month and day", () => {
    expect(formatShortDate("2026-11-15T10:00:00.000Z", "en-US", "UTC")).toBe("Nov 15");
  });

  it("returns an empty text for an invalid date instead of throwing", () => {
    expect(formatShortDate("not a date")).toBe("");
  });
});

describe("capitalize", () => {
  it("makes the first letter a capital", () => {
    expect(capitalize("file is empty")).toBe("File is empty");
  });

  it("keeps the rest and handles an empty text", () => {
    expect(capitalize("PDF is not supported")).toBe("PDF is not supported");
    expect(capitalize("")).toBe("");
  });
});

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "part")).toBe("1 part");
  });

  it("uses the plural for zero and many", () => {
    expect(pluralize(0, "part")).toBe("0 parts");
    expect(pluralize(3, "part")).toBe("3 parts");
  });

  it("accepts an irregular plural", () => {
    expect(pluralize(2, "match", "matches")).toBe("2 matches");
  });
});
