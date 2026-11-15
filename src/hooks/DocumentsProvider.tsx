"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useDocuments } from "@/hooks/useDocuments";

type DocumentsValue = ReturnType<typeof useDocuments>;

const DocumentsContext = createContext<DocumentsValue | null>(null);

// Loads the documents once and shares them, so the sidebar (list, upload, delete) and the
// chat (does anything exist to ask about?) always see the same list.
export function DocumentsProvider({ children }: { children: ReactNode }) {
  const { state, refresh, retry, remove } = useDocuments();
  const value = useMemo(() => ({ state, refresh, retry, remove }), [state, refresh, retry, remove]);

  return <DocumentsContext value={value}>{children}</DocumentsContext>;
}

export function useDocumentsContext(): DocumentsValue {
  const value = useContext(DocumentsContext);
  if (!value) throw new Error("useDocumentsContext must be used inside <DocumentsProvider>");
  return value;
}
