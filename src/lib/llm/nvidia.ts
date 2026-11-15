import { z } from "zod";
import { createLogger } from "../logger";
import { LlmError, type LlmProvider } from "./provider";

const log = createLogger("llm");

export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

// Only the part of the response we use. Reasoning models also send
// "reasoning_content"; we ignore it and use the final "content" only.
const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

export interface NvidiaLlmOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  // Free endpoints are shared and can be slow, so the limits are generous.
  timeoutMs?: number;
  maxRetries?: number;
  // Reasoning models spend tokens on thinking first; too small a limit leaves "content" empty.
  maxTokens?: number;
  // Replaceable in tests.
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

// Failures worth trying again: rate limit, server errors, timeouts, network errors.
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export class NvidiaLlmProvider implements LlmProvider {
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxTokens: number;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: NvidiaLlmOptions) {
    if (options.apiKey.trim() === "") {
      throw new Error("NVIDIA API key is empty");
    }
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? NVIDIA_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.maxTokens = options.maxTokens ?? 1500;
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async generateAnswer(prompt: string): Promise<string> {
    let lastError: Error = new Error("no attempt was made");

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = 500 * 2 ** (attempt - 1);
        log.warn({ model: this.model, attempt, delay }, "retrying model call");
        await this.sleep(delay);
      }

      try {
        return await this.callOnce(prompt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!(error instanceof RetryableError)) {
          throw lastError;
        }
      }
    }

    log.error({ err: lastError, model: this.model }, "model call failed after retries");
    throw lastError;
  }

  private async callOnce(prompt: string): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          max_tokens: this.maxTokens,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      // Timeout or network failure. The message never contains the key or the prompt.
      throw new RetryableError(`model request failed: ${error instanceof Error ? error.name : "unknown error"}`);
    }

    if (!response.ok) {
      // The status is enough; the body is not logged or thrown (it may echo input).
      const message = `model returned HTTP ${response.status}`;
      throw isRetryableStatus(response.status) ? new RetryableError(message) : new LlmError(message);
    }

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new LlmError("model response had an unexpected shape");
    }

    const choice = parsed.data.choices[0];
    const content = choice.message.content?.trim() ?? "";
    if (content === "") {
      throw new LlmError(`model returned no answer text (finish reason: ${choice.finish_reason ?? "unknown"})`);
    }
    return content;
  }
}

class RetryableError extends LlmError {}
