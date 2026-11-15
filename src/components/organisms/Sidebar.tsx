import type { ReactNode } from "react";
import { BrandMark } from "@/components/molecules/BrandMark";

// The left column: the logo on top, the given content below (documents, upload).
export function Sidebar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-3 pt-4">
        <BrandMark />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">{children}</div>
      <p className="border-t border-sidebar-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Demo: use sample documents only. Questions are answered by a hosted AI model.
      </p>
    </div>
  );
}
