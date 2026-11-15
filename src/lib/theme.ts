export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

// "system" follows the operating system; the other two are fixed.
export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): "light" | "dark" {
  if (mode === "system") return systemPrefersDark ? "dark" : "light";
  return mode;
}

// Runs inside <head> before the first paint, so a dark-mode user never sees a white flash.
// It must stay self-contained (no imports) because it is sent to the browser as plain text.
// Same rule as resolveTheme(); a test runs this script to keep the two in sync.
export const themeInitScript = `(function(){try{var m=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=m==="dark"||(m!=="light"&&window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
