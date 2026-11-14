import { describe, it, expect } from "vitest";
import { LocalEmbeddingProvider } from "./local";

// Slow: the first run downloads the model. Run it on purpose with:
//   RUN_MODEL_TESTS=1 npm test -- local.integration
const run = process.env.RUN_MODEL_TESTS === "1";

// Vectors are normalized to length 1, so the dot product is the cosine similarity.
const similarity = (a: number[], b: number[]) =>
  a.reduce((sum, value, i) => sum + value * b[i], 0);

describe.skipIf(!run)("LocalEmbeddingProvider (real model)", () => {
  const provider = new LocalEmbeddingProvider();

  it("returns vectors of the declared size with length 1", async () => {
    const [vector] = await provider.embedDocuments(["Annual leave policy"]);
    expect(vector).toHaveLength(provider.dimensions);
    const length = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(length).toBeCloseTo(1, 3);
  }, 180_000);

  it("finds the related English passage for an English question", async () => {
    const passages = await provider.embedDocuments([
      "Employees receive 20 days of paid annual leave per year.",
      "The company car park is open from 7 a.m. to 8 p.m.",
    ]);
    const query = await provider.embedQuery("How many vacation days do I get?");
    expect(similarity(query, passages[0])).toBeGreaterThan(
      similarity(query, passages[1]),
    );
  }, 180_000);

  it("finds the related Turkish passage for a Turkish question", async () => {
    const passages = await provider.embedDocuments([
      "Çalışanlar yılda 20 gün ücretli yıllık izin kullanabilir.",
      "Şirket otoparkı sabah 7 ile akşam 8 arasında açıktır.",
    ]);
    const query = await provider.embedQuery("Yıllık iznim kaç gün?");
    expect(similarity(query, passages[0])).toBeGreaterThan(
      similarity(query, passages[1]),
    );
  }, 180_000);
});
