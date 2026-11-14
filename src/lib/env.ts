import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const errorMessage = z.prettifyError(result.error);
  throw new Error(`Invalid environment variables: ${errorMessage}`);
}
export const env = result.data;
