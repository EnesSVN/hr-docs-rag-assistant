import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  // Optional here so tests and the health check run without a key;
  // code that calls the model checks that they are set.
  NVIDIA_API_KEY: z.string().min(1).optional(),
  NVIDIA_MODEL: z.string().min(1).optional(),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const errorMessage = z.prettifyError(result.error);
  throw new Error(`Invalid environment variables: ${errorMessage}`);
}
export const env = result.data;
