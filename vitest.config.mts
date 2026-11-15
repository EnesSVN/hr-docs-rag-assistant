import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Same "@/..." import alias as tsconfig.json.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    // Fake values so src/lib/env.ts validation passes in tests.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      LOG_LEVEL: "error",
    },
    projects: [
      {
        // Server code, route handlers and the evaluation helpers: no browser needed.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "eval/**/*.test.ts"],
        },
      },
      {
        // React components and hooks: run in a simulated browser (jsdom).
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
