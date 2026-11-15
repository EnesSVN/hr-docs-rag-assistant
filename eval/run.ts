// Measures how well search finds the right document for a set of questions.
//   npm run eval                                  (chunk size 1000, default model)
//   npm run eval -- --sizes=500,1000 --save       (compare sizes, save the result)
// Another model: EVAL_MODEL=<hugging face id> EVAL_DIMENSIONS=<n> EVAL_DATABASE_URL=<db with vector(n)>
// Uses the real embedding model. Documents it adds are deleted again at the end.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { env } from "../src/lib/env";
import { LocalEmbeddingProvider } from "../src/lib/embeddings/local";
import { ingestDocument } from "../src/lib/ingest";
import { searchChunks } from "../src/lib/search";
import { breakdownByLanguage, rankOfExpected, summarize } from "./metrics";

const K = 5;
const OVERLAP_SHARE = 0.15;

interface Question {
  question: string;
  language: string;
  expectedDocument: string;
}

function parseSizes(): number[] {
  const arg = process.argv.find((a) => a.startsWith("--sizes="));
  const raw = arg ? arg.slice("--sizes=".length) : "1000";
  const sizes = raw.split(",").map((s) => Number(s.trim()));
  if (sizes.some((s) => !Number.isInteger(s) || s < 100)) {
    throw new Error(`invalid --sizes value: ${raw} (use whole numbers of 100 or more)`);
  }
  return sizes;
}

async function main() {
  const sizes = parseSizes();
  const save = process.argv.includes("--save");
  const root = process.cwd();
  const documentsDir = path.resolve(root, "eval/documents");
  const questions: Question[] = JSON.parse(readFileSync(path.resolve(root, "eval/questions.json"), "utf8"));
  const documentLanguages: Record<string, string> = JSON.parse(
    readFileSync(path.resolve(root, "eval/documents.json"), "utf8"),
  );
  const files = readdirSync(documentsDir).filter((f) => f.endsWith(".md") || f.endsWith(".txt"));

  const model = process.env.EVAL_MODEL;
  const dimensions = process.env.EVAL_DIMENSIONS ? Number(process.env.EVAL_DIMENSIONS) : undefined;
  const embeddings = new LocalEmbeddingProvider({ model, dimensions });
  const pool = new Pool({ connectionString: process.env.EVAL_DATABASE_URL ?? env.DATABASE_URL });

  const saved: unknown[] = [];

  try {
    // Other documents would compete with ours and distort the result.
    const existing = await pool.query("SELECT id, filename FROM documents");
    const foreign = existing.rows.filter((r) => !files.includes(String(r.filename)));
    if (foreign.length > 0) {
      throw new Error(
        `the database holds ${foreign.length} other document(s). Use an empty database (EVAL_DATABASE_URL) or delete them first.`,
      );
    }
    // Leftovers of a crashed earlier run are ours: remove them.
    for (const row of existing.rows) {
      await pool.query("DELETE FROM documents WHERE id = $1", [row.id]);
    }

    for (const size of sizes) {
      const overlap = Math.round(size * OVERLAP_SHARE);
      const started = performance.now();
      const createdIds: string[] = [];
      let totalChunks = 0;

      try {
        for (const file of files) {
          const text = readFileSync(path.join(documentsDir, file), "utf8");
          const result = await ingestDocument(
            { pool, embeddings },
            { filename: file, text, chunkSize: size, overlap },
          );
          createdIds.push(result.documentId);
          totalChunks += result.chunkCount;
        }

        console.log(
          `\n=== ${embeddings.model} | chunk size ${size}, overlap ${overlap}, ${totalChunks} chunks from ${files.length} documents ===`,
        );
        const perQuestion = [];
        for (const q of questions) {
          const results = await searchChunks({ db: pool, embeddings }, q.question, K);
          const returned = results.map((r) => r.filename);
          const rank = rankOfExpected(returned, q.expectedDocument);
          const sameLanguage = q.language === documentLanguages[q.expectedDocument];
          perQuestion.push({ question: q.question, language: q.language, expectedDocument: q.expectedDocument, sameLanguage, rank, returned });
          const mark = rank === 1 ? "ok  " : rank !== null && rank <= 3 ? "top3" : "MISS";
          console.log(`${mark} rank=${rank ?? "-"} [${q.language}]  ${q.question}`);
          if (rank !== 1) {
            console.log(`       expected ${q.expectedDocument}, got: ${returned.slice(0, 3).join(", ")}`);
          }
        }

        const overall = summarize(perQuestion.map((p) => p.rank));
        const byLanguage = breakdownByLanguage(perQuestion);
        const seconds = Number(((performance.now() - started) / 1000).toFixed(1));
        console.log(`\nresult (${embeddings.model}, chunk size ${size}):`);
        console.log(`  all questions:        first correct ${overall.hitAt1}/${overall.total}, top 3: ${overall.hitAt3}/${overall.total}, top 5: ${overall.hitAt5}/${overall.total}`);
        console.log(`  same language:        first correct ${byLanguage.sameLanguage.hitAt1}/${byLanguage.sameLanguage.total}`);
        console.log(`  different language:   first correct ${byLanguage.crossLanguage.hitAt1}/${byLanguage.crossLanguage.total}`);
        console.log(`  took ${seconds}s including model loading and embedding`);

        saved.push({ chunkSize: size, overlap, totalChunks, overall, byLanguage, seconds, perQuestion });
      } finally {
        for (const id of createdIds) {
          await pool.query("DELETE FROM documents WHERE id = $1", [id]);
        }
      }
    }

    if (save) {
      const dir = path.resolve(root, "eval/results");
      mkdirSync(dir, { recursive: true });
      const date = new Date().toISOString().slice(0, 10);
      const file = path.join(dir, `${date}-${embeddings.model.replace(/[^a-zA-Z0-9.-]+/g, "_")}.json`);
      writeFileSync(
        file,
        JSON.stringify(
          {
            date,
            model: embeddings.model,
            dimensions: embeddings.dimensions,
            quantization: "q8",
            questions: questions.length,
            documents: files.length,
            k: K,
            note: "Synthetic documents and questions written by Claude Code; a small test, not a general accuracy figure.",
            runs: saved,
          },
          null,
          2,
        ) + "\n",
      );
      console.log(`\nsaved: ${path.relative(root, file)}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("eval failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
