"use client";

import { useEffect, useState } from "react";
import { SearchX } from "lucide-react";
import { AnswerText } from "@/components/molecules/AnswerText";
import { StatusMessage } from "@/components/molecules/StatusMessage";
import { TypingIndicator } from "@/components/molecules/TypingIndicator";
import { SourceList, sourceCardId } from "@/components/organisms/SourceList";
import { Button } from "@/components/ui/button";
import type { ChatMessage as ChatMessageData } from "@/lib/chat";
import { scrollToElement } from "@/lib/scroll";

interface ChatMessageProps {
  message: ChatMessageData;
  onRetry: (id: string) => void;
}

const ENTER = "animate-in fade-in slide-in-from-bottom-2 duration-300 ease-apple";
const BUBBLE = "rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-soft";

// One entry of the conversation: the user's question, or the assistant's reply in whatever
// state it is in (waiting, failed, nothing found, or answered with sources).
export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  // Which source is open. A new object on every press, so pressing the same badge
  // again flashes the card again.
  const [active, setActive] = useState<{ number: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setActive(null), 1500);
    return () => clearTimeout(timer);
  }, [active]);

  if (message.role === "user") {
    return (
      <div className={`flex justify-end ${ENTER}`}>
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground shadow-soft">
          <span className="sr-only">You: </span>
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <article aria-label="Answer" className={`flex max-w-[92%] flex-col gap-3 ${ENTER}`}>
      {message.status === "pending" && (
        <div className={BUBBLE}>
          <TypingIndicator />
        </div>
      )}

      {message.status === "error" && (
        <div className="flex flex-col items-start gap-2">
          <StatusMessage variant="error">{message.message}</StatusMessage>
          <Button variant="secondary" size="sm" onClick={() => onRetry(message.id)}>
            Try again
          </Button>
        </div>
      )}

      {message.status === "answered" && message.refused && (
        <div className={`${BUBBLE} flex gap-3`}>
          <SearchX aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-medium">I couldn&apos;t find that in your documents.</p>
            <p className="text-sm text-muted-foreground">
              Try asking in other words, or add a document that covers it. Questions work best in the same language as
              the documents.
            </p>
          </div>
        </div>
      )}

      {message.status === "answered" && !message.refused && (
        <>
          <div className={BUBBLE}>
            <AnswerText
              text={message.answer}
              sourceCount={message.sources.length}
              activeSource={active?.number ?? null}
              onCitationClick={(number) => {
                setActive({ number });
                scrollToElement(document.getElementById(sourceCardId(message.id, number)));
              }}
            />
          </div>
          <SourceList
            messageId={message.id}
            sources={message.sources}
            answer={message.answer}
            activeSource={active?.number ?? null}
          />
        </>
      )}
    </article>
  );
}
