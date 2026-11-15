"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl, type SegmentOption } from "@/components/molecules/SegmentedControl";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/lib/theme";

const options: readonly SegmentOption<ThemeMode>[] = [
  { value: "system", label: "System", icon: <Monitor className="size-3.5" aria-hidden="true" /> },
  { value: "light", label: "Light", icon: <Sun className="size-3.5" aria-hidden="true" /> },
  { value: "dark", label: "Dark", icon: <Moon className="size-3.5" aria-hidden="true" /> },
];

// System / light / dark. The choice is remembered in this browser.
export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return <SegmentedControl aria-label="Theme" iconOnly value={mode} onValueChange={setMode} options={options} />;
}
