import { toVectorLiteral } from "./vector";
import { describe, it, expect } from "vitest";

describe("toVectorLiteral", () => {
  it("should convert a vector to a literal string", () => {
    const vector = [1, 2, 3];
    const result = toVectorLiteral(vector);
    expect(result).toBe("[1,2,3]");
  });
});

describe("toVectorLiteral with empty vector", () => {
  it("should throw an error for empty vector", () => {
    const vector: number[] = [];
    expect(() => toVectorLiteral(vector)).toThrow();
  });
});

describe("toVectorLiteral with non-finite numbers", () => {
  it("should throw an error for non-finite numbers", () => {
    const vector = [1, 2, Infinity];
    expect(() => toVectorLiteral(vector)).toThrow();
  });
});

describe("toVectorLiteral with negative numbers", () => {
  it("should correctly convert negative numbers", () => {
    const vector = [-1, -2, -3];
    const result = toVectorLiteral(vector);
    expect(result).toBe("[-1,-2,-3]");
  });
});
