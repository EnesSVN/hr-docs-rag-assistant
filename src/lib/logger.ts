import pino from "pino";
import { env } from "./env";

export const logger = pino({ level: env.LOG_LEVEL });

export function createLogger(module: string) {
  return logger.child({ module });
}
