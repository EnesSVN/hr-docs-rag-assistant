// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isThemeMode, resolveTheme, themeInitScript } from "./theme";
import { mockMatchMedia } from "@/test/mock-match-media";

describe("resolveTheme", () => {
  it("follows the system only in system mode", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("ignores the system when the mode is fixed", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("isThemeMode", () => {
  it("accepts only the three known modes", () => {
    expect(["system", "light", "dark"].every(isThemeMode)).toBe(true);
    expect(isThemeMode("blue")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});

// The script runs as plain text in the browser, so it cannot import resolveTheme.
// These tests run the real script and check that it makes the same decision.
describe("themeInitScript", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });
  afterEach(() => vi.unstubAllGlobals());

  const run = () => new Function(themeInitScript)();
  const isDark = () => document.documentElement.classList.contains("dark");

  it.each([
    { stored: null, systemDark: true, expected: true },
    { stored: null, systemDark: false, expected: false },
    { stored: "system", systemDark: true, expected: true },
    { stored: "system", systemDark: false, expected: false },
    { stored: "light", systemDark: true, expected: false },
    { stored: "dark", systemDark: false, expected: true },
  ])("stored=$stored, system dark=$systemDark -> dark=$expected (same as resolveTheme)", ({ stored, systemDark, expected }) => {
    mockMatchMedia(systemDark);
    if (stored) localStorage.setItem("theme", stored);

    run();

    expect(isDark()).toBe(expected);
    const mode = stored === "light" || stored === "dark" ? stored : "system";
    expect(isDark()).toBe(resolveTheme(mode, systemDark) === "dark");
  });

  it("removes a stale dark class when the user chose light", () => {
    mockMatchMedia(true);
    localStorage.setItem("theme", "light");
    document.documentElement.classList.add("dark");

    run();

    expect(isDark()).toBe(false);
  });

  it("does not throw when storage is blocked", () => {
    mockMatchMedia(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => run()).not.toThrow();
    vi.restoreAllMocks();
  });
});
