import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Fake values so src/lib/env.ts validation passes in tests.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      LOG_LEVEL: "error",
    },
  },
});
