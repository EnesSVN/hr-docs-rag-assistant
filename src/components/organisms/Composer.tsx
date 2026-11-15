"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onSend: (text: string) => void | Promise<unknown>;
  // True while an answer is on its way: the user cannot send another question yet.
  pending?: boolean;
  // When set, the box is locked and shows this text (for example "Add a document first").
  disabledReason?: string;
  maxLength?: number;
}

const MAX_HEIGHT = 160;

// The question box. Enter sends, Shift+Enter starts a new line, the box grows with the text.
export function Composer({ onSend, pending = false, disabledReason, maxLength = 1000 }: ComposerProps) {
  const [value, setValue] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const locked = Boolean(disabledReason);
  const canSend = value.trim() !== "" && !pending && !locked;

  // Grow with the text, up to a limit.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  function submit() {
    if (!canSend) return;
    const text = value.trim();
    setValue("");
    void onSend(text);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: the user is still choosing characters (for example with a Japanese keyboard).
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  const nearLimit = value.length >= maxLength * 0.8;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex items-end gap-2 rounded-3xl border border-input bg-card p-1.5 pl-4 shadow-soft transition-shadow duration-200 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
          locked && "opacity-60",
        )}
      >
        <Textarea
          ref={textarea}
          rows={1}
          value={value}
          maxLength={maxLength}
          disabled={locked}
          aria-label="Your question"
          placeholder={disabledReason ?? "Ask about your documents…"}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-[15px] shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send"
          aria-busy={pending}
          disabled={!canSend}
          className="size-8 shrink-0 rounded-full"
        >
          <ArrowUp aria-hidden="true" />
        </Button>
      </div>
      <div className="flex justify-between px-3 text-xs text-muted-foreground">
        <span>Enter to send, Shift+Enter for a new line</span>
        {nearLimit && (
          <span role="status" className={cn(value.length >= maxLength && "text-destructive")}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </form>
  );
}
