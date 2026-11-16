import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion } from "../../../lib/answer";
import { pool } from "../../../lib/db";
import { LocalEmbeddingProvider } from "../../../lib/embeddings/local";
import { env } from "../../../lib/env";
import { NvidiaLlmProvider } from "../../../lib/llm/nvidia";
import { LlmError } from "../../../lib/llm/provider";
import { MAX_BODY_BYTES, checkRateLimit } from "../../../lib/limits";
import { createLogger } from "../../../lib/logger";
import { rejectCrossOrigin } from "../../../lib/origin";
import { rejectOversizedBody } from "../../../lib/request-limits";

const log = createLogger("api.ask");
const embeddings = new LocalEmbeddingProvider();

const bodySchema = z.object({
  question: z.string().trim().min(1, "question must not be empty").max(1000, "question is too long"),
});

// Created per request (it only stores settings, so it is cheap). The app and the
// health check start without a key; only this route needs one.
function getLlm(): NvidiaLlmProvider | null {
  if (!env.NVIDIA_API_KEY || !env.NVIDIA_MODEL) return null;
  return new NvidiaLlmProvider({ apiKey: env.NVIDIA_API_KEY, model: env.NVIDIA_MODEL });
}

export async function POST(request: Request) {
  // Cheap checks first: another site, too many requests, or a body that is too big are refused before any work.
  const refused =
    rejectCrossOrigin(request) ?? checkRateLimit("ask", request) ?? rejectOversizedBody(request, MAX_BODY_BYTES.ask);
  if (refused) return refused;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "request body must be JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid request" },
      { status: 400 },
    );
  }

  const model = getLlm();
  if (!model) {
    log.error("NVIDIA_API_KEY or NVIDIA_MODEL is not set");
    return NextResponse.json({ error: "the answer model is not configured" }, { status: 503 });
  }

  try {
    const result = await answerQuestion({ db: pool, embeddings, llm: model }, parsed.data.question);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LlmError) {
      // The model failed (timeout, rate limit, bad reply). Not our bug, not the user's.
      log.error({ err: error }, "answer model failed");
      return NextResponse.json({ error: "the answer model is not available right now, try again" }, { status: 502 });
    }
    log.error({ err: error }, "ask failed");
    return NextResponse.json({ error: "could not answer the question" }, { status: 500 });
  }
}
