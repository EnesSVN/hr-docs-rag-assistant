import { chunkText } from "./chunker";
import type { EmbeddingProvider } from "./embeddings/provider";
import { createLogger } from "./logger";
import { toVectorLiteral } from "./vector";

const log = createLogger("ingest");

// Starting values, to be tuned in Milestone 3 with a retrieval test set.
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 150;

// The small part of pg's Pool and client that this module needs.
// Keeping it small makes the code easy to test with a fake database.
export interface DbClient {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
  release(): void;
}

export interface DbPool {
  connect(): Promise<DbClient>;
}

export interface IngestDependencies {
  pool: DbPool;
  embeddings: EmbeddingProvider;
}

export interface IngestInput {
  filename: string;
  text: string;
  chunkSize?: number;
  overlap?: number;
}

export interface IngestResult {
  documentId: string;
  chunkCount: number;
}

export async function ingestDocument(
  { pool, embeddings }: IngestDependencies,
  input: IngestInput,
): Promise<IngestResult> {
  const filename = input.filename.trim();
  if (filename === "") {
    throw new Error("filename must not be empty");
  }
  if (input.text.trim() === "") {
    throw new Error("document text must not be empty");
  }

  const chunks = chunkText(input.text, {
    size: input.chunkSize ?? DEFAULT_CHUNK_SIZE,
    overlap: input.overlap ?? DEFAULT_OVERLAP,
  });

  // Embed before opening a transaction: the model is slow and we do not want
  // to hold a database connection while it runs.
  const vectors = await embeddings.embedDocuments(chunks);
  if (vectors.length !== chunks.length) {
    throw new Error(
      `embedding provider returned ${vectors.length} vectors for ${chunks.length} chunks`,
    );
  }
  for (const vector of vectors) {
    if (vector.length !== embeddings.dimensions) {
      throw new Error(
        `embedding has ${vector.length} dimensions, expected ${embeddings.dimensions}`,
      );
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      "INSERT INTO documents (filename) VALUES ($1) RETURNING id",
      [filename],
    );
    const documentId = String(inserted.rows[0].id);

    for (let index = 0; index < chunks.length; index++) {
      await client.query(
        "INSERT INTO chunks (document_id, chunk_index, content, embedding) VALUES ($1, $2, $3, $4::vector)",
        [documentId, index, chunks[index], toVectorLiteral(vectors[index])],
      );
    }

    await client.query("COMMIT");
    log.info({ documentId, filename, chunkCount: chunks.length }, "document ingested");
    return { documentId, chunkCount: chunks.length };
  } catch (error) {
    await client.query("ROLLBACK");
    log.error({ err: error, filename }, "ingest failed, rolled back");
    throw error;
  } finally {
    client.release();
  }
}
