import { useCallback, useState } from "react";

export type UploadState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success"; filename: string; chunkCount: number }
  | { kind: "error"; message: string };

// The upload logic without any markup: any form (or test) can reuse it.
export function useUpload() {
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  // Resolves to true when the document was stored.
  const upload = useCallback(async (file: File): Promise<boolean> => {
    const body = new FormData();
    body.append("file", file);
    setState({ kind: "uploading" });

    // Only the network call is inside try/catch, so a bug in our own code
    // is not shown to the user as "could not reach the server".
    let response: Response;
    try {
      response = await fetch("/api/documents", { method: "POST", body });
    } catch {
      setState({ kind: "error", message: "Could not reach the server. Check your connection and try again." });
      return false;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setState({ kind: "error", message: data.error ?? `Upload failed (HTTP ${response.status})` });
      return false;
    }

    setState({ kind: "success", filename: file.name, chunkCount: data.chunkCount });
    return true;
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, upload, reset };
}
