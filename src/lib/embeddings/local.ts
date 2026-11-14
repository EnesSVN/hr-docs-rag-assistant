import { env as hfEnv, pipeline } from "@huggingface/transformers";
import { createLogger } from "../logger";
import type { EmbeddingProvider } from "./provider";

const log = createLogger("embeddings");

const MODEL = "Xenova/multilingual-e5-small";
const DIMENSIONS = 384;
const BATCH_SIZE = 16;

// Keep the downloaded model inside the project folder (git-ignored).
hfEnv.cacheDir = "./.cache/models";

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

// Load the model once and reuse it: loading is slow, running it is fast.
let extractorPromise: Promise<Extractor> | undefined;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    log.info({ model: MODEL }, "loading embedding model");
    extractorPromise = pipeline("feature-extraction", MODEL, {
      dtype: "q8",
    }).then((extractor) => {
      log.info({ model: MODEL }, "embedding model ready");
      return extractor as unknown as Extractor;
    });
    // If loading fails, allow a later call to try again.
    extractorPromise.catch(() => {
      extractorPromise = undefined;
    });
  }
  return extractorPromise;
}

// E5 models need a prefix that tells them what kind of text they are reading.
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = DIMENSIONS;

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map((text) => `passage: ${text}`));
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([`query: ${text}`]);
    return vector;
  }

  private async embed(prefixedTexts: string[]): Promise<number[][]> {
    const extractor = await getExtractor();
    const vectors: number[][] = [];
    for (let i = 0; i < prefixedTexts.length; i += BATCH_SIZE) {
      const batch = prefixedTexts.slice(i, i + BATCH_SIZE);
      const output = await extractor(batch, { pooling: "mean", normalize: true });
      vectors.push(...output.tolist());
    }
    return vectors;
  }
}
