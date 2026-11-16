// Named .test.tsx so it runs in the jsdom ("dom") project, which renderHook needs.
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHydrated } from "./useHydrated";

describe("useHydrated in the browser", () => {
  it("is true once rendered in the browser", () => {
    const { result } = renderHook(() => useHydrated());

    expect(result.current).toBe(true);
  });
});
