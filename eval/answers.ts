// Compares chat models on the answer scenarios in eval/answer-questions.json.
//   npm run eval:answers                                   (the three default models)
//   npm run eval:answers -- --models=a/b,c/d --only=a1,u1  (pick models / questions)
//   npm run eval:answers -- --save                         (save answers and verdicts)
// Sends ONLY the synthetic eval documents to the NVIDIA API. Needs NVIDIA_API_KEY in .env.
// Documents are given to the model directly (no search), so this measures the model, not retrieval.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NvidiaLlmProvider } from "../src/lib/llm/nvidia";
import { buildPrompt, type PromptSource } from "../src/lib/prompt";
import { judgeAnswer, type AnswerCase, type Verdict } from "./answer-checks";

const DEFAULT_MODELS = [
  "nvidia/nemotron-3.5-bolt-e4b",
  "meta/muse-glimmer-30b",
  "mistralai/mistral-large-4-1t-a52b",
];

interface Row {
  id: string;
  type: string;
  question: string;
  answer: string | null;
  error: string | null;
  seconds: number;
  verdict: Verdict | null;
}

function argValue(name: string): string[] | null {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3).split(",").map((s) => s.trim()).filter(Boolean) : null;
}

function sourcesFor(testCase: AnswerCase, documentsDir: string): PromptSource[] {
  if (testCase.inlineSources) return testCase.inlineSources;
  return (testCase.documents ?? []).map((filename) => ({
    filename,
    content: readFileSync(path.join(documentsDir, filename), "utf8"),
  }));
}

async function runModel(model: string, cases: AnswerCase[], apiKey: string, documentsDir: string): Promise<Row[]> {
  // No retries and a 45 s limit: for a comparison, a model that does not answer in time counts as an error.
  const llm = new NvidiaLlmProvider({ apiKey, model, timeoutMs: 45_000, maxRetries: 0 });
  const rows: Row[] = [];
  const label = model.split("/").pop() ?? model;
  // One question at a time: the free endpoints are shared, so be gentle.
  for (const testCase of cases) {
    const started = performance.now();
    let row: Row;
    try {
      const answer = await llm.generateAnswer(buildPrompt(testCase.question, sourcesFor(testCase, documentsDir)));
      row = {
        id: testCase.id,
        type: testCase.type,
        question: testCase.question,
        answer,
        error: null,
        seconds: Number(((performance.now() - started) / 1000).toFixed(1)),
        verdict: judgeAnswer(testCase, answer),
      };
    } catch (error) {
      row = {
        id: testCase.id,
        type: testCase.type,
        question: testCase.question,
        answer: null,
        error: error instanceof Error ? error.message : String(error),
        seconds: Number(((performance.now() - started) / 1000).toFixed(1)),
        verdict: null,
      };
    }
    rows.push(row);
    // Live progress, so a slow model is visible while the others run.
    const mark = row.error ? "ERR " : row.verdict?.pass ? "ok  " : "FAIL";
    console.log(`[${label}] ${mark} ${row.id} ${row.seconds}s (${rows.length}/${cases.length})`);
  }
  return rows;
}

async function main() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY is not set (put it in .env)");

  const root = process.cwd();
  const documentsDir = path.resolve(root, "eval/documents");
  let cases: AnswerCase[] = JSON.parse(readFileSync(path.resolve(root, "eval/answer-questions.json"), "utf8"));
  const only = argValue("only");
  if (only) cases = cases.filter((c) => only.includes(c.id));
  const models = argValue("models") ?? DEFAULT_MODELS;

  console.log(`${cases.length} scenarios x ${models.length} models (synthetic documents only)\n`);

  // Models run side by side (different servers); questions run one by one inside each.
  const results = await Promise.all(models.map((model) => runModel(model, cases, apiKey, documentsDir)));

  const summary: Array<Record<string, unknown>> = [];
  models.forEach((model, i) => {
    const rows = results[i];
    console.log(`=== ${model}`);
    for (const row of rows) {
      const mark = row.error ? "ERR " : row.verdict?.pass ? "ok  " : "FAIL";
      const detail = row.error ?? row.verdict?.reason;
      console.log(`${mark} ${row.id.padEnd(3)} ${String(row.seconds).padStart(5)}s  ${row.question}  -> ${detail}`);
      if (row.answer) console.log(`       answer: ${row.answer.replace(/\s+/g, " ").slice(0, 220)}`);
    }
    const judged = rows.filter((r) => r.verdict);
    const passed = judged.filter((r) => r.verdict?.pass).length;
    const answerable = judged.filter((r) => r.type === "answerable");
    const cited = answerable.filter((r) => r.verdict?.cited).length;
    const errors = rows.filter((r) => r.error).length;
    const times = rows.filter((r) => !r.error).map((r) => r.seconds);
    const avg = times.length ? Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)) : null;
    console.log(`  passed ${passed}/${rows.length}, errors ${errors}, answerable with a [n] citation ${cited}/${answerable.length}, average ${avg ?? "-"}s\n`);
    summary.push({ model, passed, total: rows.length, errors, cited, answerable: answerable.length, averageSeconds: avg, rows });
  });

  if (process.argv.includes("--save")) {
    const dir = path.resolve(root, "eval/results");
    mkdirSync(dir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(dir, `${date}-answers.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          date,
          note: "Synthetic documents and questions written by Claude Code; a small test (not a general accuracy figure). Times come from shared free endpoints and vary.",
          scenarios: cases.length,
          models: summary,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`saved: ${path.relative(root, file)}`);
  }
}

main().catch((error) => {
  console.error("answer eval failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
