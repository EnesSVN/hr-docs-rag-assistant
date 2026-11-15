import { env as hfEnv, pipeline } from "@huggingface/transformers";
import { createLogger } from "../logger";
import type { EmbeddingProvider } from "./provider";

const log = createLogger("embeddings");

export const DEFAULT_MODEL = "Xenova/multilingual-e5-small";
export const DEFAULT_DIMENSIONS = 384;
const BATCH_SIZE = 16;

// Keep the downloaded models inside the project folder (git-ignored).
hfEnv.cacheDir = "./.cache/models";

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

// Load each model once and reuse it: loading is slow, running it is fast.
const extractors = new Map<string, Promise<Extractor>>();

function getExtractor(model: string): Promise<Extractor> {
  let extractor = extractors.get(model);
  if (!extractor) {
    log.info({ model }, "loading embedding model");
    extractor = pipeline("feature-extraction", model, { dtype: "q8" }).then(
      (loaded) => {
        log.info({ model }, "embedding model ready");
        return loaded as unknown as Extractor;
      },
    );
    extractors.set(model, extractor);
    // If loading fails, allow a later call to try again.
    extractor.catch(() => extractors.delete(model));
  }
  return extractor;
}

export interface LocalEmbeddingOptions {
  model?: string;
  dimensions?: number;
}

// E5 models need a prefix that tells them what kind of text they are reading.
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;

  constructor(options: LocalEmbeddingOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.dimensions = options.dimensions ?? DEFAULT_DIMENSIONS;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map((text) => `passage: ${text}`));
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([`query: ${text}`]);
    return vector;
  }

  private async embed(prefixedTexts: string[]): Promise<number[][]> {
    const extractor = await getExtractor(this.model);
    const vectors: number[][] = [];
    for (let i = 0; i < prefixedTexts.length; i += BATCH_SIZE) {
      const batch = prefixedTexts.slice(i, i + BATCH_SIZE);
      const output = await extractor(batch, { pooling: "mean", normalize: true });
      vectors.push(...output.tolist());
    }
    return vectors;
  }
}
