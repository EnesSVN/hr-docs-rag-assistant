"use client";

import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { TopBar } from "@/components/organisms/TopBar";

interface AppShellProps {
  sidebar: ReactNode;
  title: string;
  // Buttons for the top bar, next to the theme switch.
  actions?: ReactNode;
  children: ReactNode;
}

// The page frame. Wide screens: sidebar on the left, content on the right.
// Small screens: the sidebar opens as a drawer from the left.
export function AppShell({ sidebar, title, actions, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="grid h-dvh grid-cols-1 md:grid-cols-[17.5rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <aside aria-label="Documents" className="hidden border-r border-sidebar-border bg-sidebar md:block">
        {sidebar}
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[17.5rem] gap-0 bg-sidebar p-0 md:hidden">
          <SheetTitle className="sr-only">Documents</SheetTitle>
          <SheetDescription className="sr-only">Your documents and upload</SheetDescription>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-col">
        <TopBar title={title} actions={actions} onMenuClick={() => setDrawerOpen(true)} />
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
