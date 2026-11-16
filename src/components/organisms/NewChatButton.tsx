"use client";

import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/hooks/ChatProvider";

// Starts a fresh conversation. Nothing to clear, or an answer still on its way: it waits.
export function NewChatButton() {
  const { messages, pending, clear } = useChatContext();

  return (
    <Button variant="ghost" size="sm" aria-label="New chat" onClick={clear} disabled={messages.length === 0 || pending}>
      <SquarePen aria-hidden="true" />
      <span className="hidden sm:inline">New chat</span>
    </Button>
  );
}
