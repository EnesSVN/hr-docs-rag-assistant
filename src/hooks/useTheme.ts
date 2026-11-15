import { useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_STORAGE_KEY, isThemeMode, resolveTheme, type ThemeMode } from "@/lib/theme";

// The theme lives outside React (localStorage + the <html> class), so we subscribe to it
// with useSyncExternalStore. The server always renders "system"; the browser then corrects
// it right after hydration, which avoids a hydration mismatch.
const listeners = new Set<() => void>();

function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function applyTheme(mode: ThemeMode) {
  const dark = resolveTheme(mode, window.matchMedia(DARK_QUERY).matches) === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked (private window). The theme still changes for this visit.
  }
  applyTheme(mode);
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);

  // In "system" mode, follow the operating system when it switches between light and dark.
  const query = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readMode() === "system") applyTheme("system");
  };
  query.addEventListener("change", onSystemChange);

  // Another tab changed the theme.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme(readMode());
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    query.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, readMode, () => "system" as ThemeMode);
  return { mode, setMode: setThemeMode };
}
