import { describe, it, expect } from "vitest";
import { FakeEmbeddingProvider } from "./fake";

describe("FakeEmbeddingProvider", () => {
  const provider = new FakeEmbeddingProvider();

  it("returns one vector per text with the configured size", async () => {
    const vectors = await provider.embedDocuments(["a", "b", "c"]);
    expect(vectors).toHaveLength(3);
    for (const vector of vectors) {
      expect(vector).toHaveLength(384);
    }
  });

  it("gives the same vector for the same text", async () => {
    const [first] = await provider.embedDocuments(["same text"]);
    const [second] = await provider.embedDocuments(["same text"]);
    expect(first).toEqual(second);
  });

  it("gives different vectors for different texts", async () => {
    const [first] = await provider.embedDocuments(["one"]);
    const [second] = await provider.embedDocuments(["two"]);
    expect(first).not.toEqual(second);
  });

  it("treats a query differently from a document with the same text", async () => {
    const [document] = await provider.embedDocuments(["hello"]);
    const query = await provider.embedQuery("hello");
    expect(query).not.toEqual(document);
  });

  it("returns an empty list when there are no texts", async () => {
    expect(await provider.embedDocuments([])).toEqual([]);
  });
});
