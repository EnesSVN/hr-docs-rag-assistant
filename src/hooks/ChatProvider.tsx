"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useChat } from "@/hooks/useChat";

type ChatValue = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatValue | null>(null);

// Keeps the conversation in one place, so the chat area and the "New chat" button in the
// top bar (which are far apart in the page) always see the same messages.
export function ChatProvider({ children }: { children: ReactNode }) {
  const { messages, pending, send, retry, clear } = useChat();
  const value = useMemo(() => ({ messages, pending, send, retry, clear }), [messages, pending, send, retry, clear]);

  return <ChatContext value={value}>{children}</ChatContext>;
}

export function useChatContext(): ChatValue {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChatContext must be used inside <ChatProvider>");
  return value;
}
