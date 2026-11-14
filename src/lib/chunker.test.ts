import { describe, it, expect } from "vitest";
import { chunkText } from "./chunker";

describe("chunkText", () => {
  it("returns an empty list for empty text", () => {
    expect(chunkText("", { size: 10, overlap: 3 })).toEqual([]);
  });

  it("returns a single chunk when the text fits in one chunk", () => {
    expect(chunkText("abcdefghij", { size: 10, overlap: 3 })).toEqual([
      "abcdefghij",
    ]);
  });

  it("overlaps consecutive chunks", () => {
    expect(chunkText("abcdefghijklmno", { size: 10, overlap: 3 })).toEqual([
      "abcdefghij",
      "hijklmno",
    ]);
  });

  it("works with zero overlap", () => {
    expect(chunkText("abcdef", { size: 3, overlap: 0 })).toEqual([
      "abc",
      "def",
    ]);
  });

  it("rejects overlap that is not smaller than size", () => {
    expect(() => chunkText("abc", { size: 5, overlap: 5 })).toThrow(
      "overlap must be smaller than size",
    );
  });

  it("rejects a size of zero or less", () => {
    expect(() => chunkText("abc", { size: 0, overlap: 0 })).toThrow(
      "size must be greater than 0",
    );
  });

  it("rejects a negative overlap", () => {
    expect(() => chunkText("abc", { size: 5, overlap: -1 })).toThrow(
      "overlap must not be negative",
    );
  });

  it("rejects non-integer values", () => {
    expect(() => chunkText("abc", { size: 2.5, overlap: 1 })).toThrow();
  });
});
