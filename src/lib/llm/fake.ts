import type { LlmProvider } from "./provider";

// Fake LlmProvider for tests: no network, no cost.
// It returns a fixed answer and remembers every prompt it received,
// so a test can check what we sent to the model.
export class FakeLlmProvider implements LlmProvider {
  readonly prompts: string[] = [];

  constructor(private readonly answer = "fake answer") {}

  async generateAnswer(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    return this.answer;
  }
}
