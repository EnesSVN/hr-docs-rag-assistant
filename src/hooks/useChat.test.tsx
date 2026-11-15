// Named .test.tsx so it runs in the jsdom ("dom") project, which renderHook needs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useChat } from "./useChat";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const source = { chunkId: "1", documentId: "1", filename: "leave.md", chunkIndex: 0, content: "20 days", distance: 0.1 };
const answered = { answer: "20 days [1]", refused: false, sources: [source] };

async function sendOne(result: { current: ReturnType<typeof useChat> }, text: string) {
  let sent = false;
  await act(async () => {
    sent = await result.current.send(text);
  });
  return sent;
}

describe("useChat", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts empty", () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.pending).toBe(false);
  });

  it("sends the trimmed question as JSON to /api/ask", async () => {
    fetchMock.mockResolvedValue(json(answered));
    const { result } = renderHook(() => useChat());

    await sendOne(result, "  How many days?  ");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ask");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ question: "How many days?" });
  });

  it("shows the question, then the answer with its sources", async () => {
    fetchMock.mockResolvedValue(json(answered));
    const { result } = renderHook(() => useChat());

    await sendOne(result, "How many days?");

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({ role: "user", text: "How many days?" });
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      status: "answered",
      answer: "20 days [1]",
      refused: false,
      sources: [source],
      question: "How many days?",
    });
  });

  it("is waiting while the answer is on its way", async () => {
    let finish: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useChat());

    let sending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      sending = result.current.send("Question");
    });

    expect(result.current.pending).toBe(true);
    expect(result.current.messages[1]).toMatchObject({ role: "assistant", status: "pending" });

    await act(async () => {
      finish(json(answered));
      await sending;
    });
    expect(result.current.pending).toBe(false);
  });

  it("keeps a refusal as an answered message with refused set", async () => {
    fetchMock.mockResolvedValue(json({ answer: "I could not find the answer in the provided documents.", refused: true, sources: [] }));
    const { result } = renderHook(() => useChat());

    await sendOne(result, "Something else");

    expect(result.current.messages[1]).toMatchObject({ status: "answered", refused: true, sources: [] });
  });

  it("ignores an empty question and does not call the server", async () => {
    const { result } = renderHook(() => useChat());

    expect(await sendOne(result, "   ")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it("ignores a second question while the first one is still running", async () => {
    let finish: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useChat());

    let first: Promise<boolean> = Promise.resolve(false);
    let secondSent = true;
    await act(async () => {
      first = result.current.send("First");
      secondSent = await result.current.send("Second");
    });

    expect(secondSent).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish(json(answered));
      await first;
    });
  });

  it("keeps the whole history over several questions, with unique ids", async () => {
    fetchMock.mockResolvedValue(json(answered));
    const { result } = renderHook(() => useChat());

    await sendOne(result, "One");
    await sendOne(result, "Two");

    expect(result.current.messages).toHaveLength(4);
    const ids = result.current.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(4);
  });

  describe("when something goes wrong", () => {
    // A Response is what the server answered; { fails } is a request that never got an answer.
    async function errorFor(response: Response | { fails: unknown }) {
      if (response instanceof Response) fetchMock.mockResolvedValue(response);
      else fetchMock.mockRejectedValue(response.fails);
      const { result } = renderHook(() => useChat());
      await sendOne(result, "Question");
      return result.current.messages[1];
    }

    it("shows the server's text for a 400 (a problem with the question), in sentence case", async () => {
      expect(await errorFor(json({ error: "question is too long" }, 400))).toMatchObject({
        status: "error",
        message: "Question is too long",
      });
    });

    it("explains a model outage (502) in plain words and never shows server details", async () => {
      const message = await errorFor(json({ error: "model returned HTTP 503 secret" }, 502));

      expect(message).toMatchObject({ status: "error", message: "The answer model is not available right now. Try again in a moment." });
      expect(JSON.stringify(message)).not.toContain("secret");
    });

    it("says the model is not set up for a 503", async () => {
      expect(await errorFor(json({ error: "x" }, 503))).toMatchObject({ status: "error", message: "The answer model is not set up yet." });
    });

    it("tells the user how long to wait when asking too quickly (429 with Retry-After)", async () => {
      const response = new Response(JSON.stringify({ error: "Too many requests." }), { status: 429, headers: { "Retry-After": "12" } });

      expect(await errorFor(response)).toMatchObject({ status: "error", message: "You are asking too quickly. Try again in 12 seconds." });
    });

    it("says 'a moment' for a 429 without a usable Retry-After", async () => {
      expect(await errorFor(json({ error: "x" }, 429))).toMatchObject({
        status: "error",
        message: "You are asking too quickly. Wait a moment and try again.",
      });
    });

    it("says the question is too long for a 413", async () => {
      expect(await errorFor(json({ error: "request is too large" }, 413))).toMatchObject({ status: "error", message: "That question is too long." });
    });

    it("uses a generic message for other server errors", async () => {
      expect(await errorFor(json({ error: "relation chunks does not exist" }, 500))).toMatchObject({
        status: "error",
        message: "Something went wrong. Try again.",
      });
    });

    it("reports a connection problem", async () => {
      expect(await errorFor({ fails: new TypeError("Failed to fetch") })).toMatchObject({
        status: "error",
        message: "Could not reach the server. Check your connection and try again.",
      });
    });

    it("reports a timeout separately", async () => {
      expect(await errorFor({ fails: new DOMException("timed out", "TimeoutError") })).toMatchObject({
        status: "error",
        message: "The answer is taking too long. Try again.",
      });
    });

    it("does not trust an answer that has the wrong shape", async () => {
      expect(await errorFor(json({ hello: "world" }))).toMatchObject({ status: "error", message: "Something went wrong. Try again." });
    });

    it("can ask again after an error, using the same question and the same place in the list", async () => {
      fetchMock.mockResolvedValueOnce(json({ error: "x" }, 502)).mockResolvedValueOnce(json(answered));
      const { result } = renderHook(() => useChat());
      await sendOne(result, "Question");
      const failedId = result.current.messages[1].id;

      await act(async () => {
        await result.current.retry(failedId);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toMatchObject({ id: failedId, status: "answered" });
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ question: "Question" });
    });

    it("does not retry a message that is not an error", async () => {
      fetchMock.mockResolvedValue(json(answered));
      const { result } = renderHook(() => useChat());
      await sendOne(result, "Question");

      await act(async () => {
        await result.current.retry(result.current.messages[1].id);
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("can send a new question after an error", async () => {
      fetchMock.mockResolvedValueOnce(json({ error: "x" }, 500)).mockResolvedValueOnce(json(answered));
      const { result } = renderHook(() => useChat());
      await sendOne(result, "One");

      expect(await sendOne(result, "Two")).toBe(true);
      expect(result.current.messages).toHaveLength(4);
    });
  });

  it("clears the conversation", async () => {
    fetchMock.mockResolvedValue(json(answered));
    const { result } = renderHook(() => useChat());
    await sendOne(result, "One");

    act(() => result.current.clear());

    expect(result.current.messages).toEqual([]);
  });

  it("does not clear while an answer is still on its way", async () => {
    let finish: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useChat());
    let sending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      sending = result.current.send("One");
    });

    act(() => result.current.clear());

    expect(result.current.messages).toHaveLength(2);
    await act(async () => {
      finish(json(answered));
      await sending;
    });
  });
});
