import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { answerQuestion } from "../../../lib/answer";
import { LlmError } from "../../../lib/llm/provider";

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

function askRequest(body: unknown) {
  return new Request("http://localhost/api/ask", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/ask", () => {
  beforeEach(() => {
    vi.mocked(answerQuestion).mockReset();
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
});
