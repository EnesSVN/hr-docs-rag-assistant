"use client";

import { useEffect, useRef } from "react";
import { FilePlus2, MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { StarterPrompts } from "@/components/molecules/StarterPrompts";
import { ChatMessage, messageElementId } from "@/components/organisms/ChatMessage";
import { Composer } from "@/components/organisms/Composer";
import { useChatContext } from "@/hooks/ChatProvider";
import { useDocumentsContext } from "@/hooks/DocumentsProvider";
import { scrollToElement } from "@/lib/scroll";

export const STARTER_QUESTIONS = [
  "Summarize the main points of my documents.",
  "Which dates or deadlines are mentioned?",
  "What do the documents say about leave and absences?",
] as const;

// The conversation area: messages, the question box, and what to show before the first question.
export function ChatPanel() {
  const { state } = useDocumentsContext();
  const { messages, pending, send, retry } = useChatContext();
  const bottom = useRef<HTMLDivElement>(null);

  const documentCount = state.status === "ready" ? state.documents.length : null;
  const noDocuments = documentCount === 0;

  // Keep the newest message in view. A finished answer can be long (its sources), so
  // show where it starts instead of its end; otherwise follow the bottom.
  useEffect(() => {
    const last = messages.at(-1);
    if (last?.role === "assistant" && last.status === "answered") {
      scrollToElement(document.getElementById(messageElementId(last.id)), "start");
    } else {
      scrollToElement(bottom.current, "end");
    }
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="log" aria-label="Conversation" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              {noDocuments ? (
                <EmptyState
                  icon={<FilePlus2 />}
                  title="Add a document to begin"
                  description="Drop a .txt or .md file in the sidebar, then ask a question about it here."
                />
              ) : (
                <EmptyState
                  icon={<MessagesSquare />}
                  title="Ask your documents"
                  description="Answers come only from your documents and show where they were found. Ask in the same language as your documents."
                >
                  {documentCount !== null && <StarterPrompts prompts={STARTER_QUESTIONS} onPick={(question) => void send(question)} />}
                </EmptyState>
              )}
            </div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} onRetry={(id) => void retry(id)} />)
          )}
          <div ref={bottom} />
        </div>
      </div>

      <div className="material border-t border-border px-4 pb-4 pt-3">
        <div className="mx-auto w-full max-w-3xl">
          <Composer
            onSend={send}
            pending={pending}
            disabledReason={noDocuments ? "Add a document first" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
