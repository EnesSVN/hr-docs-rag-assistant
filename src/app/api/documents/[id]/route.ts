import { NextResponse } from "next/server";
import { pool } from "../../../../lib/db";
import { deleteDocument, parseDocumentId } from "../../../../lib/documents";
import { createLogger } from "../../../../lib/logger";

const log = createLogger("api.documents.delete");

export async function DELETE(_request: Request, context: RouteContext<"/api/documents/[id]">) {
  const { id } = await context.params;

  let documentId: string;
  try {
    documentId = parseDocumentId(id);
  } catch {
    return NextResponse.json({ error: "invalid document id" }, { status: 400 });
  }

  try {
    const deleted = await deleteDocument(pool, documentId);
    if (!deleted) {
      return NextResponse.json({ error: "document not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    log.error({ err: error, documentId }, "deleting a document failed");
    return NextResponse.json({ error: "could not delete the document" }, { status: 500 });
  }
}
