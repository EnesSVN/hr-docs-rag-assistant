import { describe, it, expect } from "vitest";
import { validateUpload } from "./upload";

describe("validateUpload", () => {
  it("accepts a normal .txt file", () => {
    expect(validateUpload(new File(["hello"], "policy.txt"))).toBeNull();
  });

  it("accepts a .md file", () => {
    expect(validateUpload(new File(["# Title"], "notes.md"))).toBeNull();
  });

  it("ignores the case of the extension", () => {
    expect(validateUpload(new File(["hello"], "POLICY.TXT"))).toBeNull();
  });

  it("rejects an unsupported file type with 415", () => {
    expect(validateUpload(new File(["x"], "image.png"))).toEqual({
      status: 415,
      message: "only .txt and .md files are supported",
    });
  });

  it("rejects a name that only contains the extension text", () => {
    expect(validateUpload(new File(["x"], "txt.exe"))?.status).toBe(415);
  });

  it("rejects an empty file with 400", () => {
    expect(validateUpload(new File([], "empty.txt"))).toEqual({
      status: 400,
      message: "file is empty",
    });
  });

  it("accepts a file of exactly 1 MB", () => {
    const file = new File(["a".repeat(1_000_000)], "limit.txt");
    expect(validateUpload(file)).toBeNull();
  });

  it("rejects a file larger than 1 MB with 413", () => {
    const file = new File(["a".repeat(1_000_001)], "big.txt");
    expect(validateUpload(file)).toEqual({
      status: 413,
      message: "file is too large (max 1 MB)",
    });
  });

  it("accepts a name of 255 characters and rejects a longer one with 400", () => {
    const withLength = (n: number) => new File(["hello"], "a".repeat(n - 3) + ".md");

    expect(validateUpload(withLength(255))).toBeNull();
    expect(validateUpload(withLength(256))).toEqual({ status: 400, message: "file name is too long" });
  });
});
