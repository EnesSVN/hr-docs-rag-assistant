import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";
import { deleteDocument } from "../../../../lib/documents";
import { checkRateLimit } from "../../../../lib/limits";

// Tested without a real database. parseDocumentId stays real, so id checks are really tested.
vi.mock("../../../../lib/db", () => ({ pool: {} }));
vi.mock("../../../../lib/limits", async (original) => ({ ...(await original<typeof import("../../../../lib/limits")>()), checkRateLimit: vi.fn() }));
vi.mock("../../../../lib/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/documents")>()),
  deleteDocument: vi.fn(),
}));

const call = (id: string) =>
  DELETE(new Request(`http://localhost/api/documents/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  } as Parameters<typeof DELETE>[1]);

describe("DELETE /api/documents/[id]", () => {
  beforeEach(() => {
    vi.mocked(deleteDocument).mockReset();
    vi.mocked(checkRateLimit).mockReturnValue(null);
  });

  it("returns 204 with no body when the document was deleted", async () => {
    vi.mocked(deleteDocument).mockResolvedValue(true);

    const response = await call("7");

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(deleteDocument).toHaveBeenCalledWith(expect.anything(), "7");
  });

  it("returns 404 when there is no such document", async () => {
    vi.mocked(deleteDocument).mockResolvedValue(false);

    expect((await call("7")).status).toBe(404);
  });

  it.each(["abc", "0", "-3", "1.5", "1%3B%20DROP"])("returns 400 for the invalid id %s without touching the database", async (id) => {
    expect((await call(id)).status).toBe(400);
    expect(deleteDocument).not.toHaveBeenCalled();
  });

  it("returns 500 without internal details when the database fails", async () => {
    vi.mocked(deleteDocument).mockRejectedValue(new Error('relation "documents" does not exist'));

    const response = await call("7");

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("relation");
  });

  it("answers 429 without touching the database when the client deletes too often", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(Response.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": "5" } }));

    const response = await call("7");

    expect(response.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith("general", expect.any(Request));
    expect(deleteDocument).not.toHaveBeenCalled();
  });
});
