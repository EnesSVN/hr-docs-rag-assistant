"use client";

import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { IconButton } from "@/components/molecules/IconButton";
import type { DocumentSummary } from "@/lib/documents";
import { formatShortDate, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DocumentItemProps {
  document: DocumentSummary;
  onDelete: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
}

// One row in the document list: icon, name, size and date, and a delete button with a confirmation.
export function DocumentItem({ document, onDelete }: DocumentItemProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    const result = await onDelete(document.id);
    // When it worked, this row disappears from the list, so there is nothing more to update.
    if (!result.ok) {
      setError(result.message);
      setDeleting(false);
    }
  }

  return (
    <li
      aria-busy={deleting}
      className={cn(
        "group flex flex-col gap-1 rounded-xl border border-transparent px-2 py-1.5 transition-all duration-200 ease-apple hover:border-border hover:bg-card hover:shadow-soft animate-in fade-in slide-in-from-left-2",
        deleting && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        >
          <FileText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium" title={document.filename}>
            {document.filename}
          </p>
          <p className="text-xs text-muted-foreground">
            {pluralize(document.chunkCount, "part")} · {formatShortDate(document.createdAt)}
          </p>
        </div>
        <ConfirmDialog
          trigger={
            <IconButton
              label={`Delete ${document.filename}`}
              icon={<Trash2 />}
              className="size-7 shrink-0 text-muted-foreground transition-opacity duration-200 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            />
          }
          title={`Delete ${document.filename}?`}
          description="This removes the document and its search data. Answers will no longer use it. This cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={handleConfirm}
        />
      </div>
      {error && (
        <p role="alert" className="pl-[2.625rem] text-xs text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
