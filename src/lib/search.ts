import type { EmbeddingProvider } from "./embeddings/provider";
import { toVectorLiteral } from "./vector";
import z from "zod";

export interface SearchResult {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  distance: number;
}

export interface SearchDb {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export async function searchChunks(
  { db, embeddings }: { db: SearchDb; embeddings: EmbeddingProvider },
  question: string,
  k = 5,
): Promise<SearchResult[]> {
  validateSearchParams({ question, k });
  const embedQuery = await embeddings.embedQuery(question);
  const vectorLiteral = toVectorLiteral(embedQuery);
  const result = await db.query(
    `SELECT c.id, c.document_id, d.filename, c.chunk_index, c.content,
    c.embedding <=> $1::vector AS distance
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2`,
    [vectorLiteral, k],
  );
  return result.rows.map((row) => ({
    chunkId: String(row.id),
    documentId: String(row.document_id),
    filename: String(row.filename),
    chunkIndex: Number(row.chunk_index),
    content: String(row.content),
    distance: Number(row.distance),
  }));
}

const searchParamsSchema = z.object({
  question: z.string().trim().min(1, "Question cannot be empty"),
  k: z.number().int().min(1).max(20),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export function validateSearchParams(params: unknown): SearchParams {
  return searchParamsSchema.parse(params);
}
