import type { SearchResult } from "@/lib/search";

// What POST /api/ask returns.
export interface AskResponse {
  answer: string;
  refused: boolean;
  sources: SearchResult[];
}

// The two ways a question can end.
export type AnsweredReply = { status: "answered" } & AskResponse;
export type ErrorReply = { status: "error"; message: string };
export type Reply = AnsweredReply | ErrorReply;

// One entry in the conversation. An assistant message goes through
// pending -> answered (or error); "question" lets us ask again after an error.
export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; question: string; status: "pending" }
  | ({ id: string; role: "assistant"; question: string } & ErrorReply)
  | ({ id: string; role: "assistant"; question: string } & AnsweredReply);

export function isAskResponse(value: unknown): value is AskResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.answer === "string" &&
    typeof candidate.refused === "boolean" &&
    Array.isArray(candidate.sources)
  );
}
