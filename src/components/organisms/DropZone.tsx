"use client";

import { useEffect, useState, type DragEvent } from "react";
import { LoaderCircle, UploadCloud } from "lucide-react";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { useUpload } from "@/hooks/useUpload";
import { capitalize, pluralize } from "@/lib/format";
import { validateUpload } from "@/lib/upload";
import { cn } from "@/lib/utils";

// How long the "added" confirmation stays. Errors stay until the user does something else.
export const SUCCESS_MESSAGE_MS = 6000;

interface DropZoneProps {
  // Called after a document was stored (the list can refresh).
  onUploaded?: () => void;
}

// Drop a file here or click to pick one. Works with the keyboard too: the real file input
// is inside the label, hidden from the eye but focusable.
export function DropZone({ onUploaded }: DropZoneProps) {
  const { state, upload, reset } = useUpload();
  const [dragging, setDragging] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const uploading = state.kind === "uploading";

  // A confirmation that stays for ever turns stale (the document may be deleted later).
  const succeeded = state.kind === "success";
  useEffect(() => {
    if (!succeeded) return;
    const timer = setTimeout(reset, SUCCESS_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [succeeded, reset]);

  async function handleFiles(files: File[]) {
    reset();
    setRejection(null);
    if (files.length === 0) return;
    if (files.length > 1) {
      setRejection("Add one file at a time.");
      return;
    }

    // Same rules as the server, so mistakes are caught before anything is sent.
    const problem = validateUpload(files[0]);
    if (problem) {
      setRejection(capitalize(problem.message));
      return;
    }
    if (await upload(files[0])) onUploaded?.();
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!uploading) void handleFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          // Moving over a child element also fires dragleave; only react when really leaving.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-5 text-center text-[13px] transition-all duration-200 ease-apple has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
          dragging
            ? "scale-[1.02] border-primary bg-primary/10 text-foreground"
            : "border-input bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        <input
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          disabled={uploading}
          className="sr-only"
          aria-label="Add a document"
          onChange={(event) => {
            const input = event.currentTarget;
            void handleFiles(Array.from(input.files ?? []));
            // Lets the user pick the same file again later.
            input.value = "";
          }}
        />
        {uploading ? (
          <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-primary" />
        ) : (
          <UploadCloud
            aria-hidden="true"
            className={cn("size-6 transition-transform duration-200 ease-apple", dragging ? "-translate-y-0.5 text-primary" : "text-primary/80")}
          />
        )}
        <span className="font-medium text-foreground">{uploading ? "Reading your document…" : dragging ? "Release to add" : "Add a document"}</span>
        <span className="text-xs">{uploading ? "This can take a moment the first time." : "Drop a .txt or .md file here, or click to browse"}</span>
      </label>

      <div aria-live="polite">
        {rejection && <StatusMessage variant="error">{rejection}</StatusMessage>}
        {state.kind === "success" && (
          <StatusMessage variant="success">
            Added {state.filename} ({pluralize(state.chunkCount, "part")}).
          </StatusMessage>
        )}
        {state.kind === "error" && <StatusMessage variant="error">{capitalize(state.message)}</StatusMessage>}
      </div>
    </div>
  );
}
