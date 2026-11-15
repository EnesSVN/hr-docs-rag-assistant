import { useCallback, useRef, useState } from "react";
import { isAskResponse, type ChatMessage, type Reply } from "@/lib/chat";
import { capitalize, pluralize } from "@/lib/format";

const MESSAGES = {
  network: "Could not reach the server. Check your connection and try again.",
  timeout: "The answer is taking too long. Try again.",
  modelDown: "The answer model is not available right now. Try again in a moment.",
  notConfigured: "The answer model is not set up yet.",
  generic: "Something went wrong. Try again.",
} as const;

function tooFast(response: Response): string {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isInteger(seconds) && seconds > 0
    ? `You are asking too quickly. Try again in ${pluralize(seconds, "second")}.`
    : "You are asking too quickly. Wait a moment and try again.";
}

async function requestAnswer(question: string, timeoutMs: number): Promise<Reply> {
  let response: Response;
  try {
    response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return { status: "error", message: timedOut ? MESSAGES.timeout : MESSAGES.network };
  }

  const body: unknown = await response.json().catch(() => null);

  if (response.ok) {
    return isAskResponse(body)
      ? { status: "answered", answer: body.answer, refused: body.refused, sources: body.sources }
      : { status: "error", message: MESSAGES.generic };
  }

  // The server's own text is shown only for 400 (a problem with the question itself).
  if (response.status === 400) {
    const text = typeof body === "object" && body !== null && "error" in body ? String((body as { error: unknown }).error) : "";
    return { status: "error", message: text ? capitalize(text) : MESSAGES.generic };
  }
  if (response.status === 429) return { status: "error", message: tooFast(response) };
  if (response.status === 413) return { status: "error", message: "That question is too long." };
  if (response.status === 502) return { status: "error", message: MESSAGES.modelDown };
  if (response.status === 503) return { status: "error", message: MESSAGES.notConfigured };
  return { status: "error", message: MESSAGES.generic };
}

interface UseChatOptions {
  timeoutMs?: number;
}

// The conversation: send a question, wait for the answer, keep the history.
export function useChat({ timeoutMs = 120_000 }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // A ref, not state: it must be right immediately, before the next render.
  const busy = useRef(false);
  const counter = useRef(0);
  const newId = () => `m${++counter.current}`;

  const pending = messages.some((message) => message.role === "assistant" && message.status === "pending");

  const answer = useCallback(
    async (replyId: string, question: string) => {
      const reply = await requestAnswer(question, timeoutMs);
      setMessages((current) =>
        current.map((message) => (message.id === replyId ? { id: replyId, role: "assistant", question, ...reply } : message)),
      );
      busy.current = false;
    },
    [timeoutMs],
  );

  // Returns false when nothing was sent (empty question, or still waiting for an answer).
  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const question = text.trim();
      if (!question || busy.current) return false;
      busy.current = true;

      const replyId = newId();
      setMessages((current) => [
        ...current,
        { id: newId(), role: "user", text: question },
        { id: replyId, role: "assistant", question, status: "pending" },
      ]);
      await answer(replyId, question);
      return true;
    },
    [answer],
  );

  // Ask the same question again after an error.
  const retry = useCallback(
    async (replyId: string) => {
      if (busy.current) return;
      const failed = messages.find((message) => message.id === replyId);
      if (!failed || failed.role !== "assistant" || failed.status !== "error") return;

      busy.current = true;
      setMessages((current) =>
        current.map((message) => (message.id === replyId ? { id: replyId, role: "assistant", question: failed.question, status: "pending" } : message)),
      );
      await answer(replyId, failed.question);
    },
    [messages, answer],
  );

  const clear = useCallback(() => {
    if (!busy.current) setMessages([]);
  }, []);

  return { messages, pending, send, retry, clear };
}
