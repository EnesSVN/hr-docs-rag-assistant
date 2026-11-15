import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { FakeEmbeddingProvider } from "./embeddings/fake";
import { deleteDocument, listDocuments } from "./documents";
import { ingestDocument } from "./ingest";

// Uses the real local database (with a fake embedding model). TypeScript cannot check SQL
// text, so this is the test that would catch a wrong column name. Run on purpose:
//   REAL_DATABASE_URL=<your url> RUN_DB_TESTS=1 npm test -- documents.integration
const connectionString = process.env.REAL_DATABASE_URL;
const run = process.env.RUN_DB_TESTS === "1" && Boolean(connectionString);

describe.skipIf(!run)("documents (real database)", () => {
  const pool = new Pool({ connectionString });
  const embeddings = new FakeEmbeddingProvider(384);
  const created: string[] = [];

  beforeAll(async () => {
    const result = await ingestDocument(
      { pool, embeddings },
      { filename: "documents-test.md", text: "Some text. ".repeat(200), chunkSize: 500, overlap: 50 },
    );
    created.push(result.documentId);
  });

  afterAll(async () => {
    for (const id of created) await pool.query("DELETE FROM documents WHERE id = $1", [id]);
    await pool.end();
  });

  it("lists the document with the right number of parts and a valid date", async () => {
    const documents = await listDocuments(pool);

    const ours = documents.find((d) => d.id === created[0]);
    expect(ours).toBeDefined();
    expect(ours?.filename).toBe("documents-test.md");
    expect(ours?.chunkCount).toBeGreaterThan(1);
    expect(Number.isNaN(Date.parse(ours?.createdAt ?? ""))).toBe(false);
  });

  it("deletes the document together with its parts, and reports a second delete as not found", async () => {
    const result = await ingestDocument(
      { pool, embeddings },
      { filename: "documents-test-delete.md", text: "To be deleted. ".repeat(100), chunkSize: 500, overlap: 50 },
    );

    expect(await deleteDocument(pool, result.documentId)).toBe(true);

    const leftovers = await pool.query("SELECT count(*)::int AS n FROM chunks WHERE document_id = $1", [result.documentId]);
    expect(leftovers.rows[0].n).toBe(0);
    expect(await deleteDocument(pool, result.documentId)).toBe(false);
  });
});
