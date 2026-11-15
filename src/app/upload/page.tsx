import type { Metadata } from "next";
import UploadForm from "../../components/UploadForm";

export const metadata: Metadata = { title: "Upload - HR Assistant" };

export default function UploadPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload a document</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Text (.txt) and Markdown (.md) files only. PDF is not supported yet.
        </p>
      </div>

      <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <strong>Demo notice:</strong> when you ask a question, the matching parts of your documents are sent to a
        hosted AI model (NVIDIA API Catalog). Upload sample or synthetic documents only, never real payroll or
        personal data.
      </p>

      <UploadForm />
    </div>
  );
}
