"use client";

import type { ReactNode } from "react";
import { PanelLeft } from "lucide-react";
import { IconButton } from "@/components/molecules/IconButton";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";

interface TopBarProps {
  title: string;
  // Opens the sidebar drawer. The button is only shown on small screens.
  onMenuClick: () => void;
  // Page specific buttons, shown before the theme switch (for example "New chat").
  actions?: ReactNode;
}

// The frosted bar above the main area.
export function TopBar({ title, onMenuClick, actions }: TopBarProps) {
  return (
    <header className="material sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:px-5">
      <IconButton
        label="Open sidebar"
        icon={<PanelLeft />}
        onClick={onMenuClick}
        className="md:hidden"
      />
      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
