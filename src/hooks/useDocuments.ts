import { useCallback, useEffect, useState } from "react";
import type { DocumentSummary } from "@/lib/documents";

export type DocumentsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; documents: DocumentSummary[] };

export type RemoveResult = { ok: true } | { ok: false; message: string };

const LOAD_ERROR = "Could not load your documents.";

// Throws when the list cannot be loaded.
async function fetchDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch("/api/documents");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as { documents: DocumentSummary[] };
  return data.documents;
}

// If a refresh fails, keep showing the list we already have.
const keepOrFail = (current: DocumentsState): DocumentsState =>
  current.status === "ready" ? current : { status: "error", message: LOAD_ERROR };

// The list of uploaded documents, loaded from the API, with refresh and delete.
export function useDocuments() {
  const [state, setState] = useState<DocumentsState>({ status: "loading" });

  // First load. The flag stops an update after the component is gone (and in React's
  // development double run).
  useEffect(() => {
    let cancelled = false;
    fetchDocuments().then(
      (documents) => {
        if (!cancelled) setState({ status: "ready", documents });
      },
      () => {
        if (!cancelled) setState(keepOrFail);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setState({ status: "ready", documents: await fetchDocuments() });
    } catch {
      setState(keepOrFail);
    }
  }, []);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string): Promise<RemoveResult> => {
    let response: Response;
    try {
      response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    } catch {
      return { ok: false, message: "Could not reach the server. Try again." };
    }

    // 404 means it is already gone, which is what the user wanted.
    if (response.ok || response.status === 404) {
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", documents: current.documents.filter((document) => document.id !== id) }
          : current,
      );
      return { ok: true };
    }
    return { ok: false, message: "Could not delete the document. Try again." };
  }, []);

  return { state, refresh, retry, remove };
}
