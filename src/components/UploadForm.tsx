"use client";

import { useState, type FormEvent } from "react";

type State =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success"; filename: string; chunkCount: number }
  | { kind: "error"; message: string };

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    // event.currentTarget is null after the first await, so keep the form now.
    const form = event.currentTarget;
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
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setState({ kind: "error", message: data.error ?? `Upload failed (HTTP ${response.status})` });
      return;
    }

    setState({ kind: "success", filename: file.name, chunkCount: data.chunkCount });
    setFile(null);
    form.reset();
  }

  const uploading = state.kind === "uploading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Document (.txt or .md)
        <input
          type="file"
          name="file"
          accept=".txt,.md,text/plain,text/markdown"
          disabled={uploading}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setState({ kind: "idle" });
          }}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:file:bg-zinc-100 dark:file:text-zinc-900"
        />
      </label>

      <button
        type="submit"
        disabled={!file || uploading}
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      <div aria-live="polite" className="min-h-6 text-sm">
        {uploading && <p>Reading the document and creating search data. The first upload can take a while because the model has to load.</p>}
        {state.kind === "success" && (
          <p className="text-green-700 dark:text-green-400">
            Uploaded {state.filename}: stored as {state.chunkCount} {state.chunkCount === 1 ? "part" : "parts"}.
          </p>
        )}
        {state.kind === "error" && <p className="text-red-700 dark:text-red-400">{state.message}</p>}
      </div>
    </form>
  );
}
