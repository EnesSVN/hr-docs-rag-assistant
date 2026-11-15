import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { ingestDocument } from "../../../lib/ingest";
import { listDocuments } from "../../../lib/documents";

// The route is tested without a real database or model.
vi.mock("../../../lib/db", () => ({ pool: {} }));
vi.mock("../../../lib/embeddings/local", () => ({
  LocalEmbeddingProvider: class {},
}));
vi.mock("../../../lib/ingest", () => ({ ingestDocument: vi.fn() }));
vi.mock("../../../lib/documents", () => ({ listDocuments: vi.fn() }));

function uploadRequest(file?: File) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost/api/documents", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/documents", () => {
  beforeEach(() => {
    vi.mocked(ingestDocument).mockReset();
  });

  it("returns 201 and the result for a valid text file", async () => {
    vi.mocked(ingestDocument).mockResolvedValue({
      documentId: "7",
      chunkCount: 2,
    });

    const response = await POST(
      uploadRequest(new File(["hello world"], "policy.txt")),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ documentId: "7", chunkCount: 2 });
    expect(ingestDocument).toHaveBeenCalledWith(
      expect.anything(),
      { filename: "policy.txt", text: "hello world" },
    );
  });

  it("returns 400 when the body is not multipart form data", async () => {
    const request = new Request("http://localhost/api/documents", {
      method: "POST",
      body: "not a form",
    });
    expect((await POST(request)).status).toBe(400);
  });

  it("returns 400 when no file is sent", async () => {
    expect((await POST(uploadRequest())).status).toBe(400);
  });

  it("returns 415 for an unsupported file type", async () => {
    const response = await POST(uploadRequest(new File(["x"], "image.png")));
    expect(response.status).toBe(415);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it("returns 400 for a file with only whitespace", async () => {
    const response = await POST(uploadRequest(new File(["   \n"], "a.txt")));
    expect(response.status).toBe(400);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it("returns 500 without leaking details when ingestion fails", async () => {
    vi.mocked(ingestDocument).mockRejectedValue(new Error("secret db detail"));

    const response = await POST(uploadRequest(new File(["hello"], "a.txt")));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret db detail");
  });
});

describe("GET /api/documents", () => {
  beforeEach(() => {
    vi.mocked(listDocuments).mockReset();
  });

  it("returns the documents", async () => {
    const documents = [{ id: "1", filename: "a.md", chunkCount: 2, createdAt: "2026-11-15T10:00:00.000Z" }];
    vi.mocked(listDocuments).mockResolvedValue(documents);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ documents });
  });

  it("returns 500 without internal details when the database fails", async () => {
    vi.mocked(listDocuments).mockRejectedValue(new Error("connection refused 10.0.0.5"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("10.0.0.5");
  });
});
