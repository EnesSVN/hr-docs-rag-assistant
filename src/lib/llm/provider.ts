export interface LlmProvider {
  generateAnswer(prompt: string): Promise<string>;
}
