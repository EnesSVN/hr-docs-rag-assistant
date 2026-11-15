import type { Metadata } from "next";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { UploadForm } from "@/components/organisms/UploadForm";

export const metadata: Metadata = { title: "Upload - HR Assistant" };

export default function UploadPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload a document</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Text (.txt) and Markdown (.md) files only. PDF is not supported yet.
        </p>
      </div>

      <StatusMessage variant="warning" title="Demo notice">
        When you ask a question, the matching parts of your documents are sent to a hosted AI model (NVIDIA API
        Catalog). Upload sample or synthetic documents only, never real payroll or personal data.
      </StatusMessage>

      <UploadForm />
    </div>
  );
}
