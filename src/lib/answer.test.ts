import { describe, it, expect, vi } from "vitest";
import { answerQuestion } from "./answer";
import { FakeEmbeddingProvider } from "./embeddings/fake";
import { FakeLlmProvider } from "./llm/fake";
import { NO_ANSWER_TEXT } from "./prompt";
import type { SearchDb } from "./search";

const embeddings = new FakeEmbeddingProvider(3);

function dbWith(rows: Array<Record<string, unknown>>): SearchDb {
  return { query: vi.fn(async () => ({ rows })) };
}

const leaveRow = {
  id: 1,
  document_id: 1,
  filename: "leave.md",
  chunk_index: 0,
  content: "Annual leave is 14 days.",
  distance: "0.1",
};

describe("answerQuestion", () => {
  it("returns the model answer together with the sources it was shown", async () => {
    const llm = new FakeLlmProvider("Annual leave is 14 days [1].");

    const result = await answerQuestion({ db: dbWith([leaveRow]), embeddings, llm }, "How many leave days?");

    expect(result.refused).toBe(false);
    expect(result.answer).toBe("Annual leave is 14 days [1].");
    expect(result.sources.map((s) => s.filename)).toEqual(["leave.md"]);
  });

  it("sends the found passages and the question to the model", async () => {
    const llm = new FakeLlmProvider();

    await answerQuestion({ db: dbWith([leaveRow]), embeddings, llm }, "How many leave days?");

    expect(llm.prompts).toHaveLength(1);
    expect(llm.prompts[0]).toContain("Annual leave is 14 days.");
    expect(llm.prompts[0]).toContain("Question: How many leave days?");
  });

  it("refuses without calling the model when there are no documents", async () => {
    const llm = new FakeLlmProvider();

    const result = await answerQuestion({ db: dbWith([]), embeddings, llm }, "anything");

    expect(result).toEqual({ answer: NO_ANSWER_TEXT, refused: true, sources: [] });
    expect(llm.prompts).toHaveLength(0);
  });

  it("marks the result as refused, without sources, when the model says it has no answer", async () => {
    const llm = new FakeLlmProvider(NO_ANSWER_TEXT);

    const result = await answerQuestion({ db: dbWith([leaveRow]), embeddings, llm }, "What is the CEO's salary?");

    expect(result.refused).toBe(true);
    expect(result.sources).toEqual([]);
  });

  it("does not call the model for an empty question", async () => {
    const llm = new FakeLlmProvider();

    await expect(answerQuestion({ db: dbWith([leaveRow]), embeddings, llm }, "  ")).rejects.toThrow();
    expect(llm.prompts).toHaveLength(0);
  });
});
