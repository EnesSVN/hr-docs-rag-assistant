import { describe, expect, it, vi } from "vitest";
import { deleteDocument, listDocuments, parseDocumentId, type DocumentsDb } from "./documents";

function fakeDb(rows: Array<Record<string, unknown>> = [], rowCount: number | null = 1) {
  const query = vi.fn(async () => ({ rows, rowCount }));
  const db: DocumentsDb = { query };
  return { db, query };
}

describe("listDocuments", () => {
  it("maps rows to documents with text ids, a number of parts and an ISO date", async () => {
    const { db } = fakeDb([
      { id: 7, filename: "leave.md", chunk_count: 3, created_at: new Date("2026-11-15T10:00:00Z") },
    ]);

    expect(await listDocuments(db)).toEqual([
      { id: "7", filename: "leave.md", chunkCount: 3, createdAt: "2026-11-15T10:00:00.000Z" },
    ]);
  });

  it("returns an empty list when there are no documents", async () => {
    const { db } = fakeDb([]);

    expect(await listDocuments(db)).toEqual([]);
  });

  it("counts parts with a LEFT JOIN, so a document without parts is still listed", async () => {
    const { db, query } = fakeDb([]);

    await listDocuments(db);

    const [sql] = query.mock.calls[0] as unknown as [string];
    expect(sql).toContain("LEFT JOIN chunks");
    expect(sql).toContain("ORDER BY d.created_at DESC");
  });
});

describe("parseDocumentId", () => {
  it("accepts a positive whole number written as text", () => {
    expect(parseDocumentId("42")).toBe("42");
  });

  it.each(["", "0", "-1", "1.5", "abc", "1; DROP TABLE documents", " 1", "01", "1".repeat(19)])(
    "rejects %j",
    (value) => {
      expect(() => parseDocumentId(value)).toThrow();
    },
  );

  it("rejects values that are not text", () => {
    expect(() => parseDocumentId(5)).toThrow();
    expect(() => parseDocumentId(undefined)).toThrow();
  });
});

describe("deleteDocument", () => {
  it("deletes by id using a parameter, never by putting the id into the SQL text", async () => {
    const { db, query } = fakeDb([], 1);

    expect(await deleteDocument(db, "12")).toBe(true);

    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("DELETE FROM documents WHERE id = $1");
    expect(sql).not.toContain("12");
    expect(params).toEqual(["12"]);
  });

  it("returns false when no such document exists", async () => {
    const { db } = fakeDb([], 0);

    expect(await deleteDocument(db, "12")).toBe(false);
  });

  it("does not touch the database for an invalid id", async () => {
    const { db, query } = fakeDb();

    await expect(deleteDocument(db, "1 OR 1=1")).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });
});
