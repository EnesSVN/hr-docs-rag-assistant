import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { MAX_BODY_BYTES, checkRateLimit } from "../../../lib/limits";
import { rejectOversizedBody } from "../../../lib/request-limits";
import { ingestDocument } from "../../../lib/ingest";
import { listDocuments } from "../../../lib/documents";

// The route is tested without a real database or model.
vi.mock("../../../lib/db", () => ({ pool: {} }));
vi.mock("../../../lib/embeddings/local", () => ({
  LocalEmbeddingProvider: class {},
}));
vi.mock("../../../lib/ingest", () => ({ ingestDocument: vi.fn() }));
vi.mock("../../../lib/documents", () => ({ listDocuments: vi.fn() }));
// The limits have their own tests; here we only check how the route uses them.
vi.mock("../../../lib/limits", async (original) => ({ ...(await original<typeof import("../../../lib/limits")>()), checkRateLimit: vi.fn() }));
vi.mock("../../../lib/request-limits", async (original) => ({ ...(await original<typeof import("../../../lib/request-limits")>()), rejectOversizedBody: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks(); // calls from earlier tests must not count in "was not called" checks
  vi.mocked(checkRateLimit).mockReturnValue(null);
  vi.mocked(rejectOversizedBody).mockReturnValue(null);
});

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

    const response = await GET(new Request("http://localhost/api/documents"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ documents });
  });

  it("returns 500 without internal details when the database fails", async () => {
    vi.mocked(listDocuments).mockRejectedValue(new Error("connection refused 10.0.0.5"));

    const response = await GET(new Request("http://localhost/api/documents"));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("10.0.0.5");
  });
});

describe("limits of /api/documents", () => {
  const listRequest = () => new Request("http://localhost/api/documents");
  const tooMany = () => Response.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": "5" } });

  it("limits uploads with the upload policy and the upload body size", async () => {
    vi.mocked(ingestDocument).mockResolvedValue({ documentId: "1", chunkCount: 1 });

    await POST(uploadRequest(new File(["x"], "a.md")));

    expect(checkRateLimit).toHaveBeenCalledWith("upload", expect.any(Request));
    expect(rejectOversizedBody).toHaveBeenCalledWith(expect.any(Request), MAX_BODY_BYTES.upload);
  });

  it("answers 429 to too many uploads without reading the file or doing any work", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(tooMany());

    const response = await POST(uploadRequest(new File(["x"], "a.md")));

    expect(response.status).toBe(429);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it("answers 413 to a body that is too big without doing any work", async () => {
    vi.mocked(rejectOversizedBody).mockReturnValue(Response.json({ error: "request is too large" }, { status: 413 }));

    expect((await POST(uploadRequest(new File(["x"], "a.md")))).status).toBe(413);
    expect(ingestDocument).not.toHaveBeenCalled();
  });

  it("limits the list with the general policy and answers 429 without touching the database", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(tooMany());

    const response = await GET(listRequest());

    expect(checkRateLimit).toHaveBeenCalledWith("general", expect.any(Request));
    expect(response.status).toBe(429);
    expect(listDocuments).not.toHaveBeenCalled();
  });
});
