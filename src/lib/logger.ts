import pino, { type LoggerOptions } from "pino";
import { env } from "./env";

// Fields that must never reach a log line, even if someone adds them to a log call later.
export const REDACT_PATHS = [
  "apiKey",
  "*.apiKey",
  "authorization",
  "*.authorization",
  "headers.authorization",
  "password",
  "*.password",
  "NVIDIA_API_KEY",
  "*.NVIDIA_API_KEY",
];

export function loggerOptions(level: string): LoggerOptions {
  return { level, redact: { paths: REDACT_PATHS, censor: "[redacted]" } };
}

export const logger = pino(loggerOptions(env.LOG_LEVEL));

export function createLogger(module: string) {
  return logger.child({ module });
}
