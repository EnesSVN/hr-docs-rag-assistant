import type { EmbeddingProvider } from "./embeddings/provider";
import type { LlmProvider } from "./llm/provider";
import { createLogger } from "./logger";
import { buildPrompt, NO_ANSWER_TEXT } from "./prompt";
import { searchChunks, type SearchDb, type SearchResult } from "./search";

const log = createLogger("answer");

export interface AnswerDependencies {
  db: SearchDb;
  embeddings: EmbeddingProvider;
  llm: LlmProvider;
}

export interface Answer {
  answer: string;
  // true when the documents did not contain the answer
  refused: boolean;
  // the passages the model was shown; empty when refused
  sources: SearchResult[];
}

export async function answerQuestion(
  { db, embeddings, llm }: AnswerDependencies,
  question: string,
  k = 5,
): Promise<Answer> {
  const sources = await searchChunks({ db, embeddings }, question, k);

  // Search always returns the closest chunks, so this only happens when
  // nothing has been uploaded yet. Do not spend a model call on it.
  if (sources.length === 0) {
    log.info("no documents to search, refusing without calling the model");
    return { answer: NO_ANSWER_TEXT, refused: true, sources: [] };
  }

  const reply = (await llm.generateAnswer(buildPrompt(question, sources))).trim();
  const refused = reply.includes(NO_ANSWER_TEXT);

  log.info({ refused, sourceCount: sources.length }, "question answered");
  return { answer: reply, refused, sources: refused ? [] : sources };
}
