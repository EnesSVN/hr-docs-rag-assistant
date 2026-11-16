import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { listDocuments } from "../../../lib/documents";
import { MAX_BODY_BYTES, checkRateLimit } from "../../../lib/limits";
import { LocalEmbeddingProvider } from "../../../lib/embeddings/local";
import { ingestDocument } from "../../../lib/ingest";
import { createLogger } from "../../../lib/logger";
import { rejectCrossOrigin } from "../../../lib/origin";
import { rejectOversizedBody } from "../../../lib/request-limits";
import { validateUpload } from "../../../lib/upload";

const log = createLogger("api.documents");
const embeddings = new LocalEmbeddingProvider();

// The list is read from the database on every request (a database query makes a GET
// handler run at request time even with Cache Components, so it is never stale).
export async function GET(request: Request) {
  const limited = checkRateLimit("general", request);
  if (limited) return limited;

  try {
    return NextResponse.json({ documents: await listDocuments(pool) });
  } catch (error) {
    log.error({ err: error }, "listing documents failed");
    return NextResponse.json({ error: "could not load the documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Refuse another site, too many uploads, and a body that is too big, before reading it into memory.
  const refused =
    rejectCrossOrigin(request) ?? checkRateLimit("upload", request) ?? rejectOversizedBody(request, MAX_BODY_BYTES.upload);
  if (refused) return refused;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "request must be multipart form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "a file is required in the 'file' field" },
      { status: 400 },
    );
  }

  const problem = validateUpload(file);
  if (problem) {
    return NextResponse.json({ error: problem.message }, { status: problem.status });
  }

  try {
    const text = await file.text();
    if (text.trim() === "") {
      return NextResponse.json({ error: "file is empty" }, { status: 400 });
    }
    const result = await ingestDocument(
      { pool, embeddings },
      { filename: file.name, text },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    log.error({ err: error, bytes: file.size }, "document upload failed");
    return NextResponse.json(
      { error: "could not process the document" },
      { status: 500 },
    );
  }
}
