import { vi } from "vitest";

// jsdom has no window.matchMedia. This fake lets a test choose the system theme
// and simulate the operating system switching between light and dark.
export function mockMatchMedia(initiallyDark = false) {
  let matches = initiallyDark;
  const listeners = new Set<() => void>();

  const query = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };

  vi.stubGlobal("matchMedia", () => query);

  return {
    setSystemDark(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}
