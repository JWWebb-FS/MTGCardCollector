import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useGetDeck, useListScryfallSets, useSearchScryfallCards, useAddCardToDeck, useUpdateDeckCard, useRemoveDeckCard, useUpdateDeck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CardImagePreview } from "@/components/card-image-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Search, Plus, Filter, Trash2, Minus, Copy, BarChart2, ShieldAlert, ShieldCheck, Gauge } from "lucide-react";
import { PowerLevelTab } from "@/components/power-level-tab";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FunctionSearchSuggestions } from "@/components/function-search-suggestions";

const FORMAT_SIZES: Record<string, number> = {
  Standard: 60, Pioneer: 60, Modern: 60, Legacy: 60, Vintage: 60,
  Commander: 100, Pauper: 60, Casual: 60,
};

const FORMAT_SINGLETON: Record<string, boolean> = {
  Commander: true,
};

export default function DeckDetail() {
  const { id } = useParams();
  const deckId = parseInt(id || "0");

  const { data: deck, isLoading } = useGetDeck(deckId, {
    query: { enabled: !!deckId, queryKey: ["/api/decks", deckId] }
  });

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState("__all__");
  const [activeTab, setActiveTab] = useState<"list" | "curve" | "legality" | "missing" | "power">("list");
  const { data: sets } = useListScryfallSets({ query: { staleTime: Infinity, queryKey: ["/api/scryfall/sets"] } });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 600);
    return () => clearTimeout(handler);
  }, [query]);

  const searchQuery = selectedSet !== "__all__" && debouncedQuery
    ? `${debouncedQuery} set:${selectedSet}`
    : debouncedQuery;

  const { data: searchResults, isLoading: isSearching } = useSearchScryfallCards(
    { q: searchQuery, page: 1 },
    { query: { enabled: debouncedQuery.length > 2, queryKey: ["search", searchQuery] } }
  );

  const addCardMutation = useAddCardToDeck();
  const updateCardMutation = useUpdateDeckCard();
  const removeCardMutation = useRemoveDeckCard();
  const updateDeckMutation = useUpdateDeck();

  const handleAddCard = (scryfallId: string, name: string) => {
    addCardMutation.mutate({
      id: deckId,
      data: { scryfallId, name, quantity: 1, isCommander: false, isSideboard: false }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/decks", deckId] });
        queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
        toast({ title: "Card added" });
      }
    });
  };

  const handleFunctionSearch = (value: string) => {
    setQuery(value);
    setDebouncedQuery(value);
  };

  const handleUpdateQuantity = (cardId: number, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity <= 0) {
      handleRemoveCard(cardId);
      return;
    }
    updateCardMutation.mutate({ id: deckId, cardId, data: { quantity: newQuantity } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/decks", deckId] });
        queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      }
    });
  };

  const handleRemoveCard = (cardId: number) => {
    removeCardMutation.mutate({ id: deckId, cardId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/decks", deckId] });
        queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
      }
    });
  };

  const handleExport = () => {
    if (!deck?.cards) return;
    const mainboard = deck.cards.filter((c: any) => !c.isSideboard && !c.isCommander);
    const sideboard = deck.cards.filter((c: any) => c.isSideboard);
    const commander = deck.cards.filter((c: any) => c.isCommander);

    const lines: string[] = [];
    if (commander.length) {
      lines.push("// Commander");
      commander.forEach((c: any) => lines.push(`${c.quantity} ${c.name}`));
      lines.push("");
    }
    if (mainboard.length) {
      if (commander.length) lines.push("// Mainboard");
      mainboard.forEach((c: any) => lines.push(`${c.quantity} ${c.name}`));
    }
    if (sideboard.length) {
      lines.push("");
      lines.push("// Sideboard");
      sideboard.forEach((c: any) => lines.push(`${c.quantity} ${c.name}`));
    }

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      toast({ title: "Copied to clipboard", description: `${deck.cards.length} card lines exported` });
    });
  };

  // Mana curve data
  const manaCurveData = useMemo(() => {
    if (!deck?.cards) return [];
    const buckets: Record<number, number> = {};
    deck.cards
      .filter((c: any) => !c.isSideboard)
      .forEach((c: any) => {
        const cmc = c.cmc ?? 0;
        const bucket = Math.min(cmc, 7);
        buckets[bucket] = (buckets[bucket] ?? 0) + c.quantity;
      });
    return Array.from({ length: 8 }, (_, i) => ({
      cmc: i < 7 ? String(i) : "7+",
      count: buckets[i] ?? 0,
    }));
  }, [deck?.cards]);

  // Legality analysis
  const legalityAnalysis = useMemo(() => {
    if (!deck) return null;
    const format = deck.format.toLowerCase();
    const mainCards = (deck.cards || []).filter((c: any) => !c.isSideboard);
    const maxCopies = FORMAT_SINGLETON[deck.format] ? 1 : 4;
    const targetSize = FORMAT_SIZES[deck.format] ?? 60;
    const totalCount = mainCards.reduce((s: number, c: any) => s + c.quantity, 0);

    const issues: string[] = [];
    const warnings: string[] = [];

    if (totalCount < targetSize) {
      issues.push(`Deck has ${totalCount} cards, needs ${targetSize} for ${deck.format}.`);
    } else if (totalCount > targetSize && deck.format !== "Commander") {
      warnings.push(`Deck has ${totalCount} cards (standard ${deck.format} is ${targetSize}).`);
    }

    mainCards.forEach((c: any) => {
      if (maxCopies === 1 && c.quantity > 1 && !c.typeLine?.toLowerCase().includes("basic")) {
        issues.push(`${c.name} has ${c.quantity} copies (Commander allows only 1 of each non-basic).`);
      } else if (maxCopies === 4 && c.quantity > 4 && !c.typeLine?.toLowerCase().includes("basic")) {
        issues.push(`${c.name} has ${c.quantity} copies (max 4 allowed).`);
      }
    });

    const missingCount = mainCards.filter((c: any) => !c.inCollection).length;
    if (missingCount > 0) {
      warnings.push(`${missingCount} card${missingCount > 1 ? "s" : ""} not in your collection.`);
    }

    return { issues, warnings, totalCount, targetSize, format, isLegal: issues.length === 0 };
  }, [deck]);

  // Average CMC (non-land, non-sideboard cards only)
  const avgCmc = useMemo(() => {
    if (!deck?.cards) return null;
    const nonLands = deck.cards.filter((c: any) =>
      !c.isSideboard && !c.isCommander && !(c.typeLine ?? "").toLowerCase().includes("land")
    );
    const totalCards = nonLands.reduce((s: number, c: any) => s + c.quantity, 0);
    if (!totalCards) return null;
    const totalCmc = nonLands.reduce((s: number, c: any) => s + (c.cmc ?? 0) * c.quantity, 0);
    return (totalCmc / totalCards).toFixed(2);
  }, [deck?.cards]);

  const groupedCards = useMemo(() => {
    if (!deck?.cards) return {};
    return deck.cards.reduce((acc: Record<string, any[]>, card: any) => {
      let group: string;
      if (card.isCommander) {
        group = "Commander";
      } else if (card.isSideboard) {
        group = "Sideboard";
      } else {
        const type = (card.typeLine ?? "").toLowerCase();
        if (type.includes("creature")) group = "Creatures";
        else if (type.includes("land")) group = "Lands";
        else if (type.includes("instant") || type.includes("sorcery")) group = "Spells";
        else if (type.includes("artifact")) group = "Artifacts";
        else if (type.includes("enchantment")) group = "Enchantments";
        else if (type.includes("planeswalker")) group = "Planeswalkers";
        else group = "Other";
      }
      if (!acc[group]) acc[group] = [];
      acc[group].push(card);
      return acc;
    }, {});
  }, [deck?.cards]);

  const groupOrder = ["Commander", "Creatures", "Spells", "Artifacts", "Enchantments", "Planeswalkers", "Lands", "Other", "Sideboard"];

  if (isLoading) {
    return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!deck) {
    return <div className="p-8 text-center text-muted-foreground">Deck not found</div>;
  }

  const mainCount = (deck.cards || []).filter((c: any) => !c.isSideboard && !c.isCommander).reduce((s: number, c: any) => s + c.quantity, 0);
  const sideCount = (deck.cards || []).filter((c: any) => c.isSideboard).reduce((s: number, c: any) => s + c.quantity, 0);
  const missingCount = (deck.cards || []).filter((c: any) => !c.inCollection).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-start gap-3 min-w-0 sm:items-center">
          <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0 sm:mt-0">
            <Link href="/decks"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-serif font-bold tracking-tight sm:text-3xl">{deck.name}</h1>
              <Select
                value={deck.format}
                onValueChange={(format) => {
                  updateDeckMutation.mutate({ id: deckId, data: { format } }, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ["/api/decks", deckId] });
                      queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
                      toast({ title: "Format updated" });
                    }
                  });
                }}
              >
                <SelectTrigger className="h-7 w-auto gap-1.5 border border-primary/20 bg-primary/10 text-primary text-xs font-semibold px-2.5 rounded-full focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Standard", "Modern", "Legacy", "Vintage", "Commander", "Pioneer", "Pauper", "Casual"].map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {legalityAnalysis && (
                legalityAnalysis.isLegal ? (
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 gap-1">
                    <ShieldCheck className="h-3 w-3" /> Legal
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
                    <ShieldAlert className="h-3 w-3" /> {legalityAnalysis.issues.length} issue{legalityAnalysis.issues.length > 1 ? "s" : ""}
                  </Badge>
                )
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {mainCount} mainboard{sideCount > 0 ? ` · ${sideCount} sideboard` : ""}
              {avgCmc && <span className="ml-2">· avg CMC {avgCmc}</span>}
              {missingCount > 0 && <span className="text-destructive ml-2">· {missingCount} missing</span>}
            </p>
          </div>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!deck.cards?.length} className="w-full sm:w-auto">
            <Copy className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {legalityAnalysis && !legalityAnalysis.isLegal && (
        <div className="flex flex-col gap-1.5 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
          {legalityAnalysis.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{issue}</span>
            </div>
          ))}
          {legalityAnalysis.warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 text-amber-500">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {legalityAnalysis?.isLegal && legalityAnalysis.warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
          {legalityAnalysis.warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 text-amber-500">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Add Cards Panel */}
        <Card className="bg-card border-card-border overflow-hidden flex flex-col h-[460px] sm:h-[560px] lg:h-[700px]">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="font-serif font-semibold text-lg mb-4">Add Cards</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or function..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 bg-card border-card-border"
                />
              </div>
              <Select value={selectedSet} onValueChange={setSelectedSet}>
                <SelectTrigger className="w-full bg-card border-card-border sm:w-[140px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Sets</SelectItem>
                  {sets?.map(set => (
                    <SelectItem key={set.code} value={set.code}>{set.code.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FunctionSearchSuggestions onSelect={handleFunctionSearch} className="mt-3" />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isSearching ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : searchResults?.data ? (
              <div className="space-y-2">
                {searchResults.data.map(card => (
                  <div key={card.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                        {card.imageUris?.small
                          ? <img src={card.imageUris.small} alt={card.name} className="w-full h-full object-cover" />
                          : <span className="flex items-center justify-center h-full text-[8px] text-muted-foreground">No Img</span>
                        }
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium truncate">{card.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{card.typeLine}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAddCard(card.id, card.name)}
                      disabled={addCardMutation.isPending}
                      className="shrink-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : debouncedQuery.length > 2 ? (
              <div className="text-center py-10 text-muted-foreground">No cards found</div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">Type to search for cards to add</div>
            )}
          </div>
        </Card>

        {/* Deck Panel with Tabs */}
        <div className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="bg-card border border-card-border w-full h-auto justify-start gap-1 overflow-x-auto p-1">
              <TabsTrigger value="list" className="shrink-0">Card List</TabsTrigger>
              <TabsTrigger value="curve" className="shrink-0">
                <BarChart2 className="h-3.5 w-3.5 mr-1.5" /> Mana Curve
              </TabsTrigger>
              <TabsTrigger value="legality" className="shrink-0">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Legality
              </TabsTrigger>
              <TabsTrigger value="missing" className="shrink-0 relative">
                Missing
                {missingCount > 0 && (
                  <span className="ml-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {missingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="power" className="shrink-0">
                <Gauge className="h-3.5 w-3.5 mr-1.5" /> Power Level
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "list" && (
            <div className="space-y-4 overflow-y-auto max-h-[560px] pr-1 lg:max-h-[640px]">
              {groupOrder
                .filter(group => groupedCards[group]?.length > 0)
                .map(group => (
                  <Card key={group} className="bg-card border-card-border overflow-hidden">
                    <div className="px-4 py-2 border-b border-border bg-muted/20 flex justify-between items-center">
                      <h3 className="font-semibold text-sm">{group}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {groupedCards[group].reduce((acc: number, c: any) => acc + c.quantity, 0)}
                      </Badge>
                    </div>
                    <div className="divide-y divide-border">
                      {groupedCards[group].map((card: any) => (
                        <div key={card.id} className="flex items-center justify-between gap-2 p-3 hover:bg-muted/10 transition-colors group">
                          <div className="flex min-w-0 items-center gap-2 sm:gap-3 overflow-hidden">
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full sm:h-6 sm:w-6" onClick={() => handleUpdateQuantity(card.id, card.quantity, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-mono w-4 text-center">{card.quantity}</span>
                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full sm:h-6 sm:w-6" onClick={() => handleUpdateQuantity(card.id, card.quantity, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="min-w-0 flex items-center gap-2">
                              <CardImagePreview imageUri={card.imageUri} name={card.name}>
                                <span className="text-sm font-medium truncate cursor-default">{card.name}</span>
                              </CardImagePreview>
                              {card.cmc != null && (
                                <span className="text-[10px] font-mono text-muted-foreground shrink-0">{card.cmc}</span>
                              )}
                              {!card.inCollection && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 bg-destructive/20 text-destructive border-none shrink-0">Missing</Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0 sm:h-6 sm:w-6 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                            onClick={() => handleRemoveCard(card.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              {!deck.cards?.length && (
                <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  No cards in this deck yet. Use the search panel to add cards.
                </div>
              )}
            </div>
          )}

          {activeTab === "curve" && (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-base">Mana Curve</CardTitle>
                <CardDescription>Distribution of converted mana costs (mainboard)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {deck.cards?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={manaCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                      <XAxis
                        dataKey="cmc"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                        label={{ value: "Mana Value", position: "insideBottom", offset: -5, fill: "var(--color-muted-foreground)", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                        contentStyle={{ backgroundColor: "var(--color-popover)", borderColor: "var(--color-border)" }}
                        itemStyle={{ color: "var(--color-foreground)" }}
                        formatter={(v: number) => [v, "Cards"]}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Add cards to see the mana curve
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "legality" && legalityAnalysis && (
            <div className="space-y-4">
              <Card className="bg-card border-card-border">
                <CardContent className="p-4 flex items-center gap-4">
                  {legalityAnalysis.isLegal ? (
                    <ShieldCheck className="h-8 w-8 text-emerald-500 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-8 w-8 text-destructive shrink-0" />
                  )}
                  <div>
                    <div className={`text-lg font-bold ${legalityAnalysis.isLegal ? "text-emerald-500" : "text-destructive"}`}>
                      {legalityAnalysis.isLegal ? "Deck Appears Legal" : "Legality Issues Found"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {legalityAnalysis.totalCount} / {legalityAnalysis.targetSize} cards for {deck.format}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {legalityAnalysis.issues.length > 0 && (
                <Card className="bg-card border-card-border border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-destructive">Issues</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {legalityAnalysis.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {legalityAnalysis.warnings.length > 0 && (
                <Card className="bg-card border-card-border border-amber-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-amber-500">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {legalityAnalysis.warnings.map((warn, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-amber-500">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {missingCount > 0 && (
                <Card className="bg-card border-card-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Missing from Collection</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 divide-y divide-border">
                    {(deck.cards || []).filter((c: any) => !c.inCollection).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="font-medium">{c.name}</span>
                        <Badge variant="destructive" className="bg-destructive/20 text-destructive border-none text-[10px]">
                          x{c.quantity} missing
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === "missing" && (
            <div className="space-y-3">
              {missingCount === 0 ? (
                <div className="py-16 text-center border border-dashed border-border rounded-xl bg-card">
                  <p className="text-emerald-500 font-semibold">You own all cards in this deck.</p>
                  <p className="text-muted-foreground text-sm mt-1">Great collection coverage!</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {missingCount} card{missingCount > 1 ? "s" : ""} not found in your collection. Add them to your wishlist to track acquisition.
                  </p>
                  <Card className="bg-card border-card-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {(deck.cards || [])
                        .filter((c: any) => !c.inCollection)
                        .map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <CardImagePreview imageUri={c.imageUri} name={c.name}>
                                <span className="font-medium text-sm cursor-default truncate">{c.name}</span>
                              </CardImagePreview>
                              {c.typeLine && (
                                <span className="text-xs text-muted-foreground hidden sm:block truncate">{c.typeLine}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {c.cmc != null && (
                                <span className="text-[10px] font-mono text-muted-foreground">{c.cmc} MV</span>
                              )}
                              <Badge variant="destructive" className="bg-destructive/20 text-destructive border-none text-[10px]">
                                ×{c.quantity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {activeTab === "power" && (
            <PowerLevelTab cards={deck.cards || []} format={deck.format} />
          )}
        </div>
      </div>
    </div>
  );
}
