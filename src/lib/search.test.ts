import { describe, it, expect, vi } from "vitest";
import { FakeEmbeddingProvider } from "./embeddings/fake";
import { searchChunks, type SearchDb } from "./search";

const embeddings = new FakeEmbeddingProvider(3);

function fakeDb(rows: Array<Record<string, unknown>> = []) {
  const query = vi.fn(async () => ({ rows }));
  const db: SearchDb = { query };
  return { db, query };
}

describe("searchChunks", () => {
  it("maps database rows to results", async () => {
    const { db } = fakeDb([
      { id: 7, document_id: 2, filename: "a.md", chunk_index: 0, content: "text", distance: "0.25" },
    ]);

    const results = await searchChunks({ db, embeddings }, "question", 3);

    expect(results).toEqual([
      { chunkId: "7", documentId: "2", filename: "a.md", chunkIndex: 0, content: "text", distance: 0.25 },
    ]);
  });

  it("sends the query vector and k as parameters, not inside the SQL text", async () => {
    const { db, query } = fakeDb();

    await searchChunks({ db, embeddings }, "question", 4);

    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).not.toContain("question");
    expect(params[0]).toMatch(/^\[.+\]$/);
    expect(params[1]).toBe(4);
  });

  it("uses 5 results by default", async () => {
    const { db, query } = fakeDb();

    await searchChunks({ db, embeddings }, "question");

    const params = (query.mock.calls[0] as unknown as [string, unknown[]])[1];
    expect(params[1]).toBe(5);
  });

  it("rejects an empty or whitespace-only question without touching the database", async () => {
    const { db, query } = fakeDb();

    await expect(searchChunks({ db, embeddings }, "")).rejects.toThrow();
    await expect(searchChunks({ db, embeddings }, "   ")).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects k outside 1 to 20 or not a whole number", async () => {
    const { db, query } = fakeDb();

    for (const k of [0, 21, 2.5, -1]) {
      await expect(searchChunks({ db, embeddings }, "question", k)).rejects.toThrow();
    }
    expect(query).not.toHaveBeenCalled();
  });
});
