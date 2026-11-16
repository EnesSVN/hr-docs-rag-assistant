import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { FakeEmbeddingProvider } from "./embeddings/fake";
import { chunkText } from "./chunker";
import { ingestDocument } from "./ingest";
import { searchChunks } from "./search";

// Uses the real local database (with a fake embedding model), so it checks the
// SQL and the shape of the results, not the quality of the search. Run on purpose:
//   REAL_DATABASE_URL=<your url> RUN_DB_TESTS=1 npm test -- search.integration
const connectionString = process.env.REAL_DATABASE_URL;
const run = process.env.RUN_DB_TESTS === "1" && Boolean(connectionString);

describe.skipIf(!run)("searchChunks (real database)", () => {
  const pool = new Pool({ connectionString });
  const embeddings = new FakeEmbeddingProvider(384);
  const documentIds: string[] = [];

  beforeAll(async () => {
    for (const name of ["search-test-a.txt", "search-test-b.txt"]) {
      const result = await ingestDocument(
        { pool, embeddings },
        { filename: name, text: `Text of ${name}. `.repeat(100), chunkSize: 500, overlap: 50 },
      );
      documentIds.push(result.documentId);
    }
  });

  afterAll(async () => {
    for (const id of documentIds) {
      await pool.query("DELETE FROM documents WHERE id = $1", [id]);
    }
    await pool.end();
  });

  // The database may hold other documents too (for example a real one), so these tests
  // must not assume that only our two test documents exist.
  it("returns complete results, closest first, at most k", async () => {
    const results = await searchChunks({ db: pool, embeddings }, "any question", 3);

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.chunkId).toMatch(/^\d+$/);
      expect(result.documentId).toMatch(/^\d+$/);
      expect(typeof result.filename).toBe("string");
      expect(typeof result.chunkIndex).toBe("number");
      expect(result.content.length).toBeGreaterThan(0);
      expect(typeof result.distance).toBe("number");
    }
    const distances = results.map((r) => r.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("puts the chunk that matches exactly first, whatever else is stored", async () => {
    // Ask with the very vector stored for one of our chunks: its distance must be (almost) 0.
    const ownChunk = chunkText(`Text of search-test-a.txt. `.repeat(100), { size: 500, overlap: 50 })[0];
    const asTheStoredPassage = {
      ...embeddings,
      dimensions: embeddings.dimensions,
      embedDocuments: embeddings.embedDocuments.bind(embeddings),
      embedQuery: async (text: string) => (await embeddings.embedDocuments([text]))[0],
    };

    const results = await searchChunks({ db: pool, embeddings: asTheStoredPassage }, ownChunk, 3);

    expect(results[0].filename).toBe("search-test-a.txt");
    expect(results[0].content).toBe(ownChunk);
    expect(results[0].distance).toBeLessThan(1e-6);
  });
});
