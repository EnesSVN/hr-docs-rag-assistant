import type { EmbeddingProvider } from "./provider";

// Test-only provider. The same text always gives the same vector, so tests are
// repeatable. The vectors have no real meaning: similar texts are NOT close.
export class FakeEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  constructor(dimensions = 384) {
    this.dimensions = dimensions;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.vectorFor(`passage: ${text}`));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.vectorFor(`query: ${text}`);
  }

  private vectorFor(text: string): number[] {
    // Turn the text into a number (a simple hash), then use it as the seed
    // of a small pseudo-random generator.
    let seed = 2166136261;
    for (let i = 0; i < text.length; i++) {
      seed ^= text.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    const vector: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      vector.push(seed / 0xffffffff - 0.5);
    }
    return vector;
  }
}
