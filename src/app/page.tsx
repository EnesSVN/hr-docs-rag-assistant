import { ChatPanel } from "@/components/organisms/ChatPanel";
import { DocumentsPanel } from "@/components/organisms/DocumentsPanel";
import { NewChatButton } from "@/components/organisms/NewChatButton";
import { Sidebar } from "@/components/organisms/Sidebar";
import { AppShell } from "@/components/templates/AppShell";
import { ChatProvider } from "@/hooks/ChatProvider";
import { DocumentsProvider } from "@/hooks/DocumentsProvider";

export default function Home() {
  return (
    <DocumentsProvider>
      <ChatProvider>
        <AppShell
          title="Ask your documents"
          actions={<NewChatButton />}
          sidebar={
            <Sidebar>
              <DocumentsPanel />
            </Sidebar>
          }
        >
          <ChatPanel />
        </AppShell>
      </ChatProvider>
    </DocumentsProvider>
  );
}
