"use client";

import { DocumentList } from "@/components/organisms/DocumentList";
import { DropZone } from "@/components/organisms/DropZone";
import { Badge } from "@/components/ui/badge";
import { useDocuments } from "@/hooks/useDocuments";

// Everything about documents in the sidebar: add a file, see the list, delete.
export function DocumentsPanel() {
  const { state, refresh, retry, remove } = useDocuments();

  return (
    <div className="flex flex-col gap-4">
      <DropZone onUploaded={refresh} />

      <section aria-labelledby="documents-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-2">
          <h2 id="documents-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Documents
          </h2>
          {state.status === "ready" && state.documents.length > 0 && (
            <Badge variant="secondary" aria-label={`${state.documents.length} documents`}>
              {state.documents.length}
            </Badge>
          )}
        </div>
        <DocumentList state={state} onDelete={remove} onRetry={retry} />
      </section>
    </div>
  );
}
