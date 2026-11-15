// Runs before every component test file (the "dom" project only).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Remove the rendered component after each test so tests do not affect each other.
afterEach(() => {
  cleanup();
});
