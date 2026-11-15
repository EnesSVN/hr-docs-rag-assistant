"use client";

import { useState, type FormEvent } from "react";
import { FileField } from "@/components/molecules/FileField";
import { LoadingButton } from "@/components/molecules/LoadingButton";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { useUpload } from "@/hooks/useUpload";

// Pick a document and send it. Built from molecules; the logic lives in useUpload.
export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const { state, upload, reset } = useUpload();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    // event.currentTarget is null after the first await, so keep the form now.
    const form = event.currentTarget;
    const stored = await upload(file);
    if (stored) {
      setFile(null);
      form.reset();
    }
  }

  const uploading = state.kind === "uploading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FileField
        label="Document (.txt or .md)"
        accept=".txt,.md,text/plain,text/markdown"
        disabled={uploading}
        onFileChange={(chosen) => {
          setFile(chosen);
          reset();
        }}
      />

      <LoadingButton type="submit" className="self-start" disabled={!file} loading={uploading} loadingText="Uploading...">
        Upload
      </LoadingButton>

      <div aria-live="polite" className="min-h-6">
        {uploading && (
          <StatusMessage variant="info">
            Reading the document and creating search data. The first upload can take a while because the model has
            to load.
          </StatusMessage>
        )}
        {state.kind === "success" && (
          <StatusMessage variant="success">
            Uploaded {state.filename}: stored as {state.chunkCount} {state.chunkCount === 1 ? "part" : "parts"}.
          </StatusMessage>
        )}
        {state.kind === "error" && <StatusMessage variant="error">{state.message}</StatusMessage>}
      </div>
    </form>
  );
}
