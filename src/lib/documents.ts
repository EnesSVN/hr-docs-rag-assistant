import { z } from "zod";

export interface DocumentSummary {
  id: string;
  filename: string;
  chunkCount: number;
  createdAt: string;
}

// The small part of pg's Pool that this module needs (easy to fake in tests).
export interface DocumentsDb {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>;
}

// Newest first, with the number of parts each document was split into.
export async function listDocuments(db: DocumentsDb): Promise<DocumentSummary[]> {
  const result = await db.query(
    `SELECT d.id, d.filename, d.created_at, count(c.id)::int AS chunk_count
     FROM documents d
     LEFT JOIN chunks c ON c.document_id = d.id
     GROUP BY d.id
     ORDER BY d.created_at DESC, d.id DESC`,
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    filename: String(row.filename),
    chunkCount: Number(row.chunk_count),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
  }));
}

// Ids are bigint in the database; as text they are digits only (no sign, no decimals).
const documentIdSchema = z.string().regex(/^[1-9]\d{0,17}$/, "document id must be a positive whole number");

export function parseDocumentId(value: unknown): string {
  return documentIdSchema.parse(value);
}

// Deletes the document; its chunks go with it (ON DELETE CASCADE). False if there was no such document.
export async function deleteDocument(db: DocumentsDb, id: string): Promise<boolean> {
  const result = await db.query("DELETE FROM documents WHERE id = $1", [parseDocumentId(id)]);
  return result.rowCount === 1;
}
