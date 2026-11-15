"use client";

import { FolderOpen } from "lucide-react";
import { DocumentItem } from "@/components/molecules/DocumentItem";
import { EmptyState } from "@/components/molecules/EmptyState";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocumentsState, RemoveResult } from "@/hooks/useDocuments";

interface DocumentListProps {
  state: DocumentsState;
  onDelete: (id: string) => Promise<RemoveResult>;
  onRetry: () => void;
}

// The documents, or what to show while loading, on an error, or when there are none.
export function DocumentList({ state, onDelete, onRetry }: DocumentListProps) {
  if (state.status === "loading") {
    return (
      <div role="status" aria-busy="true" aria-label="Loading documents" className="flex flex-col gap-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-11 rounded-xl" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-2">
        <StatusMessage variant="error">{state.message}</StatusMessage>
        <Button variant="secondary" size="sm" onClick={onRetry} className="self-start">
          Try again
        </Button>
      </div>
    );
  }

  if (state.documents.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<FolderOpen />}
        title="No documents yet"
        description="Add a file above, then ask questions about it."
      />
    );
  }

  return (
    <ul aria-label="Documents" className="flex flex-col gap-0.5">
      {state.documents.map((document) => (
        <DocumentItem key={document.id} document={document} onDelete={onDelete} />
      ))}
    </ul>
  );
}
