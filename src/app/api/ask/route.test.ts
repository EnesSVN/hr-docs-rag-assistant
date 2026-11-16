import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { answerQuestion } from "../../../lib/answer";
import { LlmError } from "../../../lib/llm/provider";
import { MAX_BODY_BYTES, checkRateLimit } from "../../../lib/limits";
import { rejectOversizedBody } from "../../../lib/request-limits";

// The route is tested without a real database, embedding model or chat model.
const fakeEnv = vi.hoisted(() => ({
  LOG_LEVEL: "error",
  NVIDIA_API_KEY: "test-key" as string | undefined,
  NVIDIA_MODEL: "test/model" as string | undefined,
}));
vi.mock("../../../lib/env", () => ({ env: fakeEnv }));
vi.mock("../../../lib/db", () => ({ pool: {} }));
vi.mock("../../../lib/embeddings/local", () => ({ LocalEmbeddingProvider: class {} }));
vi.mock("../../../lib/answer", () => ({ answerQuestion: vi.fn() }));
// The limits have their own tests; here we only check how the route uses them.
vi.mock("../../../lib/limits", async (original) => ({ ...(await original<typeof import("../../../lib/limits")>()), checkRateLimit: vi.fn() }));
vi.mock("../../../lib/request-limits", async (original) => ({ ...(await original<typeof import("../../../lib/request-limits")>()), rejectOversizedBody: vi.fn() }));

function askRequest(body: unknown) {
  return new Request("http://localhost/api/ask", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/ask", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // calls from earlier tests must not count in "was not called" checks
    vi.mocked(answerQuestion).mockReset();
    vi.mocked(checkRateLimit).mockReturnValue(null);
    vi.mocked(rejectOversizedBody).mockReturnValue(null);
    fakeEnv.NVIDIA_API_KEY = "test-key";
    fakeEnv.NVIDIA_MODEL = "test/model";
  });

  it("returns the answer and sources", async () => {
    const result = { answer: "20 days [1]", refused: false, sources: [] };
    vi.mocked(answerQuestion).mockResolvedValue(result);

    const response = await POST(askRequest({ question: "  How many days?  " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(answerQuestion).toHaveBeenCalledWith(expect.anything(), "How many days?");
  });

  it("returns 400 when the body is not JSON", async () => {
    expect((await POST(askRequest("not json"))).status).toBe(400);
  });

  it("returns 400 for a missing, empty or too long question", async () => {
    for (const body of [{}, { question: "   " }, { question: 5 }, { question: "x".repeat(1001) }]) {
      expect((await POST(askRequest(body))).status).toBe(400);
    }
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it("returns 503 when the model is not configured", async () => {
    fakeEnv.NVIDIA_API_KEY = undefined;

    const response = await POST(askRequest({ question: "q" }));

    expect(response.status).toBe(503);
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it("returns 502 when the model fails, without internal details", async () => {
    vi.mocked(answerQuestion).mockRejectedValue(new LlmError("model returned HTTP 503 secret detail"));

    const response = await POST(askRequest({ question: "q" }));

    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("secret detail");
  });

  it("returns 500 for an unexpected error, without internal details", async () => {
    vi.mocked(answerQuestion).mockRejectedValue(new Error("relation chunks does not exist"));

    const response = await POST(askRequest({ question: "q" }));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("relation");
  });

  describe("limits", () => {
    it("uses the ask rate limit and the ask body size limit", async () => {
      vi.mocked(answerQuestion).mockResolvedValue({ answer: "a", refused: false, sources: [] });

      await POST(askRequest({ question: "q" }));

      expect(checkRateLimit).toHaveBeenCalledWith("ask", expect.any(Request));
      expect(rejectOversizedBody).toHaveBeenCalledWith(expect.any(Request), MAX_BODY_BYTES.ask);
    });

    it("answers 429 and does no work when the client asks too often", async () => {
      vi.mocked(checkRateLimit).mockReturnValue(Response.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": "12" } }));

      const response = await POST(askRequest({ question: "q" }));

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("12");
      expect(answerQuestion).not.toHaveBeenCalled();
      // The rate limit is checked first, so a flood of big bodies is stopped without more work.
      expect(rejectOversizedBody).not.toHaveBeenCalled();
    });

    it("answers 413 and does no work when the body is too big", async () => {
      vi.mocked(rejectOversizedBody).mockReturnValue(Response.json({ error: "request is too large" }, { status: 413 }));

      expect((await POST(askRequest({ question: "q" }))).status).toBe(413);
      expect(answerQuestion).not.toHaveBeenCalled();
    });
  });

  describe("requests from other sites", () => {
    const fromOtherSite = () =>
      new Request("http://localhost/api/ask", { method: "POST", headers: { origin: "https://evil.example" }, body: JSON.stringify({ question: "q" }) });

    it("are refused with 403 before the rate limit, the size check or any work", async () => {
      const response = await POST(fromOtherSite());

      expect(response.status).toBe(403);
      expect(checkRateLimit).not.toHaveBeenCalled();
      expect(answerQuestion).not.toHaveBeenCalled();
    });

    it("are refused even when the body is plain text that happens to be JSON (the cross-site trick)", async () => {
      const trick = new Request("http://localhost/api/ask", {
        method: "POST",
        headers: { origin: "https://evil.example", "content-type": "text/plain" },
        body: JSON.stringify({ question: "run up the bill" }),
      });

      expect((await POST(trick)).status).toBe(403);
      expect(answerQuestion).not.toHaveBeenCalled();
    });

    it("do not stop our own page, which sends the same Origin as the server address", async () => {
      vi.mocked(answerQuestion).mockResolvedValue({ answer: "a", refused: false, sources: [] });
      const own = new Request("http://localhost/api/ask", { method: "POST", headers: { origin: "http://localhost" }, body: JSON.stringify({ question: "q" }) });

      expect((await POST(own)).status).toBe(200);
    });
  });
});
