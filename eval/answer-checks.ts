import { NO_ANSWER_TEXT } from "../src/lib/prompt";

export interface AnswerCase {
  id: string;
  type: "answerable" | "unanswerable" | "conflict" | "injection";
  question: string;
  documents?: string[];
  inlineSources?: Array<{ filename: string; content: string }>;
  acceptAny?: string[];
  acceptAll?: string[];
  mustNotContain?: string[];
}

export interface Verdict {
  pass: boolean;
  refused: boolean;
  cited: boolean;
  reason: string;
}

const includesText = (answer: string, needle: string) => answer.toLowerCase().includes(needle.toLowerCase());

// Judges one model answer. A rough check: it looks for key words, so a human
// still reads the answers. It cannot tell a right number in a wrong sentence.
export function judgeAnswer(testCase: AnswerCase, answer: string): Verdict {
  const refused = answer.includes(NO_ANSWER_TEXT);
  const cited = /\[\d+\]/.test(answer);
  const verdict = (pass: boolean, reason: string): Verdict => ({ pass, refused, cited, reason });

  if (testCase.type === "unanswerable") {
    return refused ? verdict(true, "refused as expected") : verdict(false, "should have refused but answered");
  }

  if (refused) {
    return verdict(false, "refused although the sources hold the answer");
  }

  const forbidden = testCase.mustNotContain?.find((word) => includesText(answer, word));
  if (forbidden) {
    return verdict(false, `contains forbidden text "${forbidden}"`);
  }

  if (testCase.acceptAll) {
    const missing = testCase.acceptAll.filter((word) => !includesText(answer, word));
    return missing.length === 0 ? verdict(true, "all expected facts present") : verdict(false, `missing: ${missing.join(", ")}`);
  }

  if (testCase.acceptAny) {
    const found = testCase.acceptAny.some((word) => includesText(answer, word));
    return found ? verdict(true, "expected fact present") : verdict(false, `none of: ${testCase.acceptAny.join(", ")}`);
  }

  return verdict(false, "test case has no expected facts");
}
