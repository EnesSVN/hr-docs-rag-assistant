import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { FakeEmbeddingProvider } from "./embeddings/fake";
import { ingestDocument } from "./ingest";

// Uses the real local database (with a fake embedding model). Run it on purpose:
//   REAL_DATABASE_URL=<your url> RUN_DB_TESTS=1 npm test -- ingest.integration
const connectionString = process.env.REAL_DATABASE_URL;
const run = process.env.RUN_DB_TESTS === "1" && Boolean(connectionString);

describe.skipIf(!run)("ingestDocument (real database)", () => {
  const pool = new Pool({ connectionString });
  const createdDocumentIds: string[] = [];

  afterAll(async () => {
    // Clean up: deleting a document also deletes its chunks (ON DELETE CASCADE).
    for (const id of createdDocumentIds) {
      await pool.query("DELETE FROM documents WHERE id = $1", [id]);
    }
    await pool.end();
  });

  it("stores a document with its chunks and removes the chunks on delete", async () => {
    const result = await ingestDocument(
      { pool, embeddings: new FakeEmbeddingProvider(384) },
      {
        filename: "integration-test.txt",
        text: "a".repeat(2500),
        chunkSize: 1000,
        overlap: 150,
      },
    );
    createdDocumentIds.push(result.documentId);

    const stored = await pool.query(
      "SELECT count(*)::int AS n, min(chunk_index) AS first, max(chunk_index) AS last FROM chunks WHERE document_id = $1",
      [result.documentId],
    );
    expect(stored.rows[0].n).toBe(result.chunkCount);
    expect(stored.rows[0].first).toBe(0);
    expect(stored.rows[0].last).toBe(result.chunkCount - 1);

    await pool.query("DELETE FROM documents WHERE id = $1", [result.documentId]);
    const after = await pool.query(
      "SELECT count(*)::int AS n FROM chunks WHERE document_id = $1",
      [result.documentId],
    );
    expect(after.rows[0].n).toBe(0);
  });
});
