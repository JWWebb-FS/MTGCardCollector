import { cn } from "@/lib/utils";

export const FUNCTION_SEARCH_SUGGESTIONS = [
  "Counterspell",
  "Toxic",
  "Ramp",
  "Draw",
  "Removal",
  "Board wipe",
  "Graveyard hate",
  "Tokens",
] as const;

interface FunctionSearchSuggestionsProps {
  onSelect: (value: string) => void;
  className?: string;
}

export function FunctionSearchSuggestions({
  onSelect,
  className,
}: FunctionSearchSuggestionsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Search by function
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {FUNCTION_SEARCH_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="shrink-0 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
