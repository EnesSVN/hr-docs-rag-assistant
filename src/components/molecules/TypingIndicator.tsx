// Three bouncing dots while the answer is being prepared. Screen readers get the text.
export function TypingIndicator({ label = "Looking through your documents…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-hidden="true" className="flex items-center gap-1">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 rounded-full bg-muted-foreground animate-typing-dot"
            style={{ animationDelay: `${dot * 160}ms` }}
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
