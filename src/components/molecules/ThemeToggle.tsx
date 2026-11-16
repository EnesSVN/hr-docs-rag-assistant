"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl, type SegmentOption } from "@/components/molecules/SegmentedControl";
import { useHydrated } from "@/hooks/useHydrated";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

const options: readonly SegmentOption<ThemeMode>[] = [
  { value: "system", label: "System", icon: <Monitor className="size-3.5" aria-hidden="true" /> },
  { value: "light", label: "Light", icon: <Sun className="size-3.5" aria-hidden="true" /> },
  { value: "dark", label: "Dark", icon: <Moon className="size-3.5" aria-hidden="true" /> },
];

// System / light / dark. The choice is remembered in this browser.
export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  // The server cannot know the saved choice and draws "System". Until the browser has read it,
  // keep the switch invisible, so the selection does not slide from System to the real choice.
  const hydrated = useHydrated();

  return (
    <div className={cn("transition-opacity duration-200", hydrated ? "opacity-100" : "opacity-0")}>
      <SegmentedControl aria-label="Theme" iconOnly value={mode} onValueChange={setMode} options={options} />
    </div>
  );
}
