import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { Sidebar } from "@/components/organisms/Sidebar";
import { DocumentsPanel } from "@/components/organisms/DocumentsPanel";
import { AppShell } from "@/components/templates/AppShell";

export default function Home() {
  return (
    <AppShell
      title="Ask your documents"
      sidebar={
        <Sidebar>
          <DocumentsPanel />
        </Sidebar>
      }
    >
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<MessagesSquare />}
          title="Ask your documents"
          description="Add a document in the sidebar, then ask a question about it. Answers come only from your documents and show where they were found."
        />
      </div>
    </AppShell>
  );
}
