import { describe, it, expect, vi } from "vitest";
import { FakeEmbeddingProvider } from "./embeddings/fake";
import type { EmbeddingProvider } from "./embeddings/provider";
import { ingestDocument, type DbClient, type DbPool } from "./ingest";

// A fake database that records every query instead of running it.
function createFakeDb(options: { failOnChunkIndex?: number } = {}) {
  const queries: { sql: string; params?: unknown[] }[] = [];
  const release = vi.fn();
  let chunkInserts = 0;

  const client: DbClient = {
    release,
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.startsWith("INSERT INTO documents")) {
        return { rows: [{ id: "42" }] };
      }
      if (sql.startsWith("INSERT INTO chunks")) {
        if (chunkInserts === options.failOnChunkIndex) {
          throw new Error("insert failed");
        }
        chunkInserts++;
      }
      return { rows: [] };
    },
  };
  const connect = vi.fn(async () => client);
  const pool: DbPool = { connect };
  return { pool, queries, release, connect };
}

const embeddings = new FakeEmbeddingProvider(4);

describe("ingestDocument", () => {
  it("stores the document and one row per chunk inside a transaction", async () => {
    const db = createFakeDb();
    const text = "a".repeat(25);

    const result = await ingestDocument(
      { pool: db.pool, embeddings },
      { filename: "policy.txt", text, chunkSize: 10, overlap: 3 },
    );

    expect(result).toEqual({ documentId: "42", chunkCount: 4 });
    const sqls = db.queries.map((q) => q.sql.split(" (")[0]);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls[1]).toBe("INSERT INTO documents");
    expect(sqls.filter((s) => s === "INSERT INTO chunks")).toHaveLength(4);
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(db.release).toHaveBeenCalledTimes(1);
  });

  it("writes the chunk index and the vector literal", async () => {
    const db = createFakeDb();

    await ingestDocument(
      { pool: db.pool, embeddings },
      { filename: "a.txt", text: "hello" },
    );

    const chunkInsert = db.queries.find((q) =>
      q.sql.startsWith("INSERT INTO chunks"),
    );
    expect(chunkInsert?.params?.[0]).toBe("42");
    expect(chunkInsert?.params?.[1]).toBe(0);
    expect(chunkInsert?.params?.[2]).toBe("hello");
    expect(chunkInsert?.params?.[3]).toMatch(/^\[.+\]$/);
  });

  it("rolls back and releases the connection when an insert fails", async () => {
    const db = createFakeDb({ failOnChunkIndex: 1 });

    await expect(
      ingestDocument(
        { pool: db.pool, embeddings },
        { filename: "a.txt", text: "a".repeat(25), chunkSize: 10, overlap: 3 },
      ),
    ).rejects.toThrow("insert failed");

    const sqls = db.queries.map((q) => q.sql);
    expect(sqls).toContain("ROLLBACK");
    expect(sqls).not.toContain("COMMIT");
    expect(db.release).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty filename or empty text without touching the database", async () => {
    const db = createFakeDb();

    await expect(
      ingestDocument({ pool: db.pool, embeddings }, { filename: " ", text: "x" }),
    ).rejects.toThrow("filename");
    await expect(
      ingestDocument({ pool: db.pool, embeddings }, { filename: "a", text: "  " }),
    ).rejects.toThrow("text");

    expect(db.connect).not.toHaveBeenCalled();
  });

  it("does not open a database connection when embedding fails", async () => {
    const db = createFakeDb();
    const failing: EmbeddingProvider = {
      dimensions: 4,
      embedDocuments: async () => {
        throw new Error("model unavailable");
      },
      embedQuery: async () => [],
    };

    await expect(
      ingestDocument(
        { pool: db.pool, embeddings: failing },
        { filename: "a.txt", text: "hello" },
      ),
    ).rejects.toThrow("model unavailable");

    expect(db.connect).not.toHaveBeenCalled();
  });

  it("rejects vectors with the wrong number of dimensions", async () => {
    const db = createFakeDb();
    const wrongSize: EmbeddingProvider = {
      dimensions: 4,
      embedDocuments: async (texts) => texts.map(() => [1, 2, 3]),
      embedQuery: async () => [],
    };

    await expect(
      ingestDocument(
        { pool: db.pool, embeddings: wrongSize },
        { filename: "a.txt", text: "hello" },
      ),
    ).rejects.toThrow("dimensions");

    expect(db.connect).not.toHaveBeenCalled();
  });
});
