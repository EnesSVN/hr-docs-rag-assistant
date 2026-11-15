import { describe, it, expect, vi } from "vitest";
import { NvidiaLlmProvider } from "./nvidia";

const ok = (content: string | null, finish = "stop") =>
  new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: finish }] }), { status: 200 });

function provider(fetchFn: typeof fetch, extra = {}) {
  const sleep = vi.fn(async () => {});
  const llm = new NvidiaLlmProvider({ apiKey: "test-key", model: "test/model", fetchFn, sleep, ...extra });
  return { llm, sleep };
}

describe("NvidiaLlmProvider", () => {
  it("returns the answer text and sends the model, prompt and key", async () => {
    const fetchFn = vi.fn(async () => ok("  Four.  "));
    const { llm } = provider(fetchFn as unknown as typeof fetch);

    const answer = await llm.generateAnswer("2+2?");

    expect(answer).toBe("Four.");
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test/model");
    expect(body.messages).toEqual([{ role: "user", content: "2+2?" }]);
  });

  it("retries on 429 and then succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(ok("done"));
    const { llm, sleep } = provider(fetchFn as unknown as typeof fetch);

    await expect(llm.generateAnswer("q")).resolves.toBe("done");
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("retries after a timeout or network error", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"))
      .mockResolvedValueOnce(ok("done"));
    const { llm } = provider(fetchFn as unknown as typeof fetch);

    await expect(llm.generateAnswer("q")).resolves.toBe("done");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry limit with a short error", async () => {
    const fetchFn = vi.fn(async () => new Response("down", { status: 503 }));
    const { llm } = provider(fetchFn as unknown as typeof fetch, { maxRetries: 2 });

    await expect(llm.generateAnswer("q")).rejects.toThrow("model returned HTTP 503");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("does not retry other client errors such as a wrong key", async () => {
    const fetchFn = vi.fn(async () => new Response("no", { status: 401 }));
    const { llm } = provider(fetchFn as unknown as typeof fetch);

    await expect(llm.generateAnswer("q")).rejects.toThrow("model returned HTTP 401");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("fails clearly when the answer text is empty (for example the thinking used all tokens)", async () => {
    const fetchFn = vi.fn(async () => ok(null, "length"));
    const { llm } = provider(fetchFn as unknown as typeof fetch);

    await expect(llm.generateAnswer("q")).rejects.toThrow("finish reason: length");
  });

  it("rejects an unexpected response shape", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ hello: "world" }), { status: 200 }));
    const { llm } = provider(fetchFn as unknown as typeof fetch);

    await expect(llm.generateAnswer("q")).rejects.toThrow("unexpected shape");
  });

  it("never puts the key or the prompt into error messages", async () => {
    const fetchFn = vi.fn(async () => new Response("secret prompt echo", { status: 500 }));
    const { llm } = provider(fetchFn as unknown as typeof fetch, { maxRetries: 0 });

    const error = await llm.generateAnswer("my private prompt").catch((e: Error) => e);

    expect((error as Error).message).not.toContain("test-key");
    expect((error as Error).message).not.toContain("my private prompt");
    expect((error as Error).message).not.toContain("secret prompt echo");
  });

  it("refuses an empty API key", () => {
    expect(() => new NvidiaLlmProvider({ apiKey: " ", model: "m" })).toThrow("API key");
  });
});
