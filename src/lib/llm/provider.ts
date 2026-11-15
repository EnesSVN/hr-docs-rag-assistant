export interface LlmProvider {
  generateAnswer(prompt: string): Promise<string>;
}

// Thrown when the model could not give an answer (timeout, HTTP error, bad reply).
// Lets callers tell "the model failed" apart from "our code has a bug".
export class LlmError extends Error {}
