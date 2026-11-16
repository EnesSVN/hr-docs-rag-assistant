import { describe, expect, it } from "vitest";
import pino from "pino";
import { loggerOptions } from "./logger";

// Runs the real logger options but writes into memory, so we can read what would be printed.
function logLine(data: object) {
  const lines: string[] = [];
  const log = pino(loggerOptions("info"), { write: (line: string) => void lines.push(line) });
  log.info(data, "test");
  return lines[0];
}

describe("logger redaction", () => {
  it.each([
    { apiKey: "key-123456" },
    { options: { apiKey: "key-123456" } },
    { authorization: "Bearer key-123456" },
    { headers: { authorization: "Bearer key-123456" } },
    { password: "key-123456" },
    { config: { password: "key-123456" } },
    { NVIDIA_API_KEY: "key-123456" },
    { env: { NVIDIA_API_KEY: "key-123456" } },
  ])("hides a secret in %j", (data) => {
    const line = logLine(data);

    expect(line).not.toContain("key-123456");
    expect(line).toContain("[redacted]");
  });

  it("keeps ordinary fields readable", () => {
    const line = logLine({ documentId: "42", chunkCount: 3 });

    expect(line).toContain('"documentId":"42"');
    expect(line).toContain('"chunkCount":3');
  });
});
