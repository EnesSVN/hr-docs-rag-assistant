import { cn } from "@/lib/utils";

interface StarterPromptsProps {
  prompts: readonly string[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

// Ready-made questions to start with. Pressing one asks it right away.
export function StarterPrompts({ prompts, onPick, disabled = false, className }: StarterPromptsProps) {
  return (
    <ul aria-label="Example questions" className={cn("flex flex-col gap-2", className)}>
      {prompts.map((prompt) => (
        <li key={prompt}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm shadow-soft transition-all duration-200 ease-apple hover:-translate-y-px hover:border-primary/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {prompt}
          </button>
        </li>
      ))}
    </ul>
  );
}
