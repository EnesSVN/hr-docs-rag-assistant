import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { LocalEmbeddingProvider } from "../../../lib/embeddings/local";
import { ingestDocument } from "../../../lib/ingest";
import { createLogger } from "../../../lib/logger";
import { validateUpload } from "../../../lib/upload";

const log = createLogger("api.documents");
const embeddings = new LocalEmbeddingProvider();

export async function POST(request: Request) {
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
    log.error({ err: error, filename: file.name }, "document upload failed");
    return NextResponse.json(
      { error: "could not process the document" },
      { status: 500 },
    );
  }
}
