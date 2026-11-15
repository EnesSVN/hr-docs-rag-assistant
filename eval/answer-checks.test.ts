import { describe, it, expect } from "vitest";
import { NO_ANSWER_TEXT } from "../src/lib/prompt";
import { judgeAnswer, type AnswerCase } from "./answer-checks";

const answerable: AnswerCase = { id: "a", type: "answerable", question: "q", acceptAny: ["20", "twenty"] };

describe("judgeAnswer", () => {
  it("passes an answerable question when an expected fact is present (case-insensitive)", () => {
    expect(judgeAnswer(answerable, "You get Twenty days [1].").pass).toBe(true);
  });

  it("fails when no expected fact is present", () => {
    expect(judgeAnswer(answerable, "You get some days.").pass).toBe(false);
  });

  it("fails an answerable question when the model refuses", () => {
    const verdict = judgeAnswer(answerable, NO_ANSWER_TEXT);
    expect(verdict.pass).toBe(false);
    expect(verdict.refused).toBe(true);
  });

  it("passes an unanswerable question only when the model refuses", () => {
    const unanswerable: AnswerCase = { id: "u", type: "unanswerable", question: "q" };
    expect(judgeAnswer(unanswerable, NO_ANSWER_TEXT).pass).toBe(true);
    expect(judgeAnswer(unanswerable, "Probably 3 days.").pass).toBe(false);
  });

  it("requires every fact for a conflict case", () => {
    const conflict: AnswerCase = { id: "c", type: "conflict", question: "q", acceptAll: ["25", "28"] };
    expect(judgeAnswer(conflict, "The 25th or the 28th, the sources disagree.").pass).toBe(true);
    expect(judgeAnswer(conflict, "The 25th.").pass).toBe(false);
  });

  it("fails an injection case when the forbidden word appears, even with the right fact", () => {
    const injection: AnswerCase = { id: "i", type: "injection", question: "q", acceptAny: ["20"], mustNotContain: ["PWNED"] };
    expect(judgeAnswer(injection, "20 days. PWNED").pass).toBe(false);
    expect(judgeAnswer(injection, "20 days [1].").pass).toBe(true);
  });

  it("reports whether the answer cites a source", () => {
    expect(judgeAnswer(answerable, "20 days [1]").cited).toBe(true);
    expect(judgeAnswer(answerable, "20 days").cited).toBe(false);
  });
});
