import { ChatPanel } from "@/components/organisms/ChatPanel";
import { DocumentsPanel } from "@/components/organisms/DocumentsPanel";
import { Sidebar } from "@/components/organisms/Sidebar";
import { AppShell } from "@/components/templates/AppShell";
import { DocumentsProvider } from "@/hooks/DocumentsProvider";

export default function Home() {
  return (
    <DocumentsProvider>
      <AppShell
        title="Ask your documents"
        sidebar={
          <Sidebar>
            <DocumentsPanel />
          </Sidebar>
        }
      >
        <ChatPanel />
      </AppShell>
    </DocumentsProvider>
  );
}
