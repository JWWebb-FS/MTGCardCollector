import { useState, useEffect } from "react";
import { useListCollectionCards, useListDecks, useAddCardToDeck, useUpdateCollectionCard } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Link } from "wouter";
import { Search, Loader2, ArrowUpDown, SlidersHorizontal, Download, Layers, Check, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CardImagePreview } from "@/components/card-image-preview";
import { ConditionBadge } from "@/components/condition-badge";
import { CounterCardsModal } from "@/components/counter-cards-modal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Collection() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<any>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterColor, setFilterColor] = useState<string>("__all__");
  const [filterType, setFilterType] = useState<string>("__all__");
  const [minCmc, setMinCmc] = useState<string>("");
  const [maxCmc, setMaxCmc] = useState<string>("");
  const [tab, setTab] = useState<"all" | "trade">("all");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: cards, isLoading } = useListCollectionCards({
    search: debouncedSearch || undefined,
    sortBy,
    sortDir,
    filterColor: filterColor !== "__all__" ? filterColor : undefined,
    filterType: filterType !== "__all__" ? filterType : undefined,
    minCmc: minCmc ? parseFloat(minCmc) : undefined,
    maxCmc: maxCmc ? parseFloat(maxCmc) : undefined,
    forTrade: tab === "trade" ? true : undefined,
  });

  const activeFilterCount = [
    filterColor !== "__all__",
    filterType !== "__all__",
    !!minCmc,
    !!maxCmc,
  ].filter(Boolean).length;

  const handleExportCsv = () => {
    if (!cards?.length) return;
    const headers = ["Name", "Set Code", "Set Name", "Collector #", "Condition", "Foil", "Quantity", "CMC", "Type Line", "Storage Location", "For Trade", "Price USD", "Foil Price", "Notes"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = cards.map(c => [
      c.name, c.setCode, c.setName, c.collectorNumber,
      c.condition, c.foil ? "Yes" : "No", c.quantity,
      c.cmc ?? "", c.typeLine, c.storageLocation ?? "",
      c.forTrade ? "Yes" : "No", c.priceUsd ?? "", c.priceFoil ?? "", c.notes ?? "",
    ].map(escape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "grimoire-collection.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">Collection</h1>
          <p className="text-muted-foreground">Browse and manage your card library.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!cards?.length} className="w-full shrink-0 sm:mt-1 sm:w-auto">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 bg-card border border-card-border sm:inline-grid sm:w-auto">
          <TabsTrigger value="all" className="px-3">All Cards</TabsTrigger>
          <TabsTrigger value="trade" className="px-3">Trade List</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by card name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-card-border focus-visible:ring-primary"
          />
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 sm:flex">
          <Select value={filterColor} onValueChange={setFilterColor}>
            <SelectTrigger className="w-full sm:w-[130px] bg-card border-card-border">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Colors</SelectItem>
              <SelectItem value="W">White</SelectItem>
              <SelectItem value="U">Blue</SelectItem>
              <SelectItem value="B">Black</SelectItem>
              <SelectItem value="R">Red</SelectItem>
              <SelectItem value="G">Green</SelectItem>
              <SelectItem value="C">Colorless</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[130px] bg-card border-card-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="cmc">Mana Value</SelectItem>
              <SelectItem value="set">Set</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            className="bg-card border-card-border shrink-0"
          >
            <ArrowUpDown className={`h-4 w-4 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="bg-card border-card-border shrink-0 relative">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-card border-card-border text-foreground" align="end">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Advanced Filters</h4>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Card Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="bg-card border-card-border">
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Any Type</SelectItem>
                      <SelectItem value="Creature">Creature</SelectItem>
                      <SelectItem value="Instant">Instant</SelectItem>
                      <SelectItem value="Sorcery">Sorcery</SelectItem>
                      <SelectItem value="Enchantment">Enchantment</SelectItem>
                      <SelectItem value="Artifact">Artifact</SelectItem>
                      <SelectItem value="Planeswalker">Planeswalker</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Mana Value (CMC)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min="0" placeholder="Min" value={minCmc} onChange={(e) => setMinCmc(e.target.value)} className="bg-card border-card-border h-8 text-sm" />
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input type="number" min="0" placeholder="Max" value={maxCmc} onChange={(e) => setMaxCmc(e.target.value)} className="bg-card border-card-border h-8 text-sm" />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setFilterType("__all__"); setMinCmc(""); setMaxCmc(""); }}>
                    Clear Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {tab === "trade" && (
        <p className="text-sm text-muted-foreground">
          Cards you've marked as available to trade. Toggle on any card's detail page.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !cards?.length ? (
        <div className="py-20 text-center border border-dashed border-border rounded-xl bg-card">
          <p className="text-muted-foreground">
            {tab === "trade" ? "No cards marked for trade yet." : "No cards found matching your criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map(card => (
            <CollectionCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({ card }: { card: any }) {
  const [counterOpen, setCounterOpen] = useState(false);
  return (
    <div className="relative group">
      <Link href={`/card/${card.id}`}>
        <Card className="bg-card border-card-border overflow-hidden transition-all duration-200 hover:border-primary hover:shadow-md cursor-pointer">
          <div className="flex gap-3 p-3">
            <CardImagePreview imageUri={card.imageUri} name={card.name}>
              <div className="w-[72px] h-[100px] bg-muted rounded shrink-0 overflow-hidden relative cursor-pointer">
                {card.imageUri ? (
                  <img src={card.imageUri} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                ) : null}
                {card.foil && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent mix-blend-overlay" />
                )}
              </div>
            </CardImagePreview>

            <div className="flex-1 min-w-0 py-0.5 flex flex-col">
              <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors" title={card.name}>
                {card.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate leading-tight">{card.typeLine}</p>

              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-muted/50 font-mono">
                  {card.setCode.toUpperCase()}
                </Badge>
                <ConditionBadge condition={card.condition} />
                {card.foil && <span className="text-[10px] font-bold text-amber-500">FOIL</span>}
                {card.forTrade && <span className="text-[10px] font-bold text-blue-400">TRADE</span>}
              </div>

              <div className="mt-auto pt-1.5 flex items-center justify-between">
                <span className="text-sm font-mono text-emerald-500">
                  {formatPrice(card.foil ? card.priceFoil : card.priceUsd)}
                </span>
                <QuantityControl card={card} />
              </div>
            </div>
          </div>
        </Card>
      </Link>

      <div className="absolute bottom-2 right-2 flex gap-1" onClick={e => e.preventDefault()}>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-lg sm:h-7 sm:w-7 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
          onClick={e => { e.stopPropagation(); e.preventDefault(); setCounterOpen(true); }}
          title="Find counters"
        >
          <Shield className="h-3.5 w-3.5" />
        </Button>
        <AddToDeckButton card={card} />
      </div>
      <CounterCardsModal
        scryfallId={counterOpen ? card.scryfallId : null}
        cardName={card.name}
        onClose={() => setCounterOpen(false)}
      />
    </div>
  );
}

function QuantityControl({ card }: { card: any }) {
  const updateMutation = useUpdateCollectionCard();
  const queryClient = useQueryClient();

  const change = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    const newQty = Math.max(1, card.quantity + delta);
    if (newQty === card.quantity) return;
    updateMutation.mutate(
      { id: card.id, data: { quantity: newQty } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/collection"] }) }
    );
  };

  return (
    <div className="flex items-center gap-1" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
      <button
        className="h-5 w-5 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs leading-none"
        onClick={e => change(e, -1)}
        disabled={card.quantity <= 1 || updateMutation.isPending}
      >−</button>
      <span className="text-xs font-mono w-4 text-center text-muted-foreground">{card.quantity}</span>
      <button
        className="h-5 w-5 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs leading-none"
        onClick={e => change(e, 1)}
        disabled={updateMutation.isPending}
      >+</button>
    </div>
  );
}

function AddToDeckButton({ card }: { card: any }) {
  const { data: decks } = useListDecks();
  const addMutation = useAddCardToDeck();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addedDeckIds, setAddedDeckIds] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);

  const handleAdd = (e: React.MouseEvent, deck: any) => {
    e.stopPropagation();
    e.preventDefault();
    addMutation.mutate({
      id: deck.id,
      data: { scryfallId: card.scryfallId, name: card.name, quantity: 1, isCommander: false, isSideboard: false }
    }, {
      onSuccess: () => {
        setAddedDeckIds(prev => new Set([...prev, deck.id]));
        toast({ title: `Added to ${deck.name}` });
        queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 shadow-lg sm:h-7 sm:w-7 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
          onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
          title="Add to deck"
        >
          <Layers className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 bg-card border-card-border text-foreground p-2"
        align="end"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs text-muted-foreground font-medium px-2 py-1 uppercase tracking-wider">Add to deck</p>
        {!decks?.length ? (
          <p className="text-xs text-muted-foreground px-2 py-2">No decks yet.</p>
        ) : (
          <div className="space-y-0.5 mt-1">
            {decks.map((deck: any) => (
              <button
                key={deck.id}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted/60 transition-colors text-left"
                onClick={(e) => handleAdd(e, deck)}
                disabled={addMutation.isPending}
              >
                <span className="truncate">{deck.name}</span>
                {addedDeckIds.has(deck.id)
                  ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  : <span className="text-[10px] text-muted-foreground shrink-0">{deck.format}</span>
                }
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
