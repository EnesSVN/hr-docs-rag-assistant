import { FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

// The app logo: an icon tile and the name.
export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-soft"
      >
        <FileSearch className="size-4" />
      </div>
      <span className="text-[15px] font-semibold tracking-tight">HR Assistant</span>
    </div>
  );
}
