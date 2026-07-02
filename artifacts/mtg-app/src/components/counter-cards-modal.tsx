import { useGetCounterCards } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Shield, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CounterCardsModalProps {
  scryfallId: string | null;
  cardName: string;
  onClose: () => void;
}

const MANA_SYMBOLS: Record<string, string> = {
  W: "⚪", U: "🔵", B: "⚫", R: "🔴", G: "🟢",
};

function ManaCost({ cost }: { cost: string | null }) {
  if (!cost) return null;
  const symbols = cost.replace(/\{([^}]+)\}/g, (_, s) => {
    if (MANA_SYMBOLS[s]) return MANA_SYMBOLS[s];
    return `{${s}}`;
  });
  return <span className="font-mono text-xs text-muted-foreground">{symbols}</span>;
}

export function CounterCardsModal({ scryfallId, cardName, onClose }: CounterCardsModalProps) {
  const { data: categories, isLoading, isError } = useGetCounterCards(scryfallId ?? "", {
    query: {
      enabled: !!scryfallId,
      queryKey: ["counter-cards", scryfallId],
      staleTime: 1000 * 60 * 10,
    },
  });

  return (
    <Dialog open={!!scryfallId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-card-border text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Cards that counter <span className="text-primary">{cardName}</span>
          </DialogTitle>
          <DialogDescription>
            Answers sorted by strategy — most played versions shown first.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing card and searching for answers…</p>
          </div>
        )}

        {isError && (
          <div className="py-12 text-center text-muted-foreground">
            Failed to load counter cards. Please try again.
          </div>
        )}

        {!isLoading && !isError && categories && categories.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No specific counter strategies found for this card.
          </div>
        )}

        {!isLoading && categories && categories.length > 0 && (
          <div className="space-y-8 pt-2">
            {categories.map((cat) => (
              <div key={cat.label}>
                <div className="mb-3">
                  <h3 className="font-serif font-semibold text-base text-primary">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {cat.cards.map((card) => (
                    <a
                      key={card.id}
                      href={`https://scryfall.com/card/${card.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-xl overflow-hidden border border-card-border bg-background hover:border-primary transition-all duration-150"
                    >
                      <div className="aspect-[5/7] w-full bg-muted relative">
                        {card.imageUri ? (
                          <img
                            src={card.imageUri}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                            {card.name}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">{card.name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{card.typeLine}</p>
                          <ManaCost cost={card.manaCost ?? null} />
                        </div>
                        {card.priceUsd && (
                          <p className={cn("text-[10px] font-mono mt-0.5", parseFloat(card.priceUsd) > 10 ? "text-amber-500" : "text-emerald-500")}>
                            ${card.priceUsd}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pb-2">
              Click any card to view it on Scryfall
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
