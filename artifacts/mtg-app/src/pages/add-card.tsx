import { useState, useEffect } from "react";
import { useSearchScryfallCards, useGetCardPrints, useAddCardToCollection, useListScryfallSets, useGetScryfallCard, useImportCollectionCsv, useListCollectionCards } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, Plus, Check, Filter, Minus, AlertTriangle, Shield } from "lucide-react";
import { CounterCardsModal } from "@/components/counter-cards-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AddCard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">Add Card</h1>
        <p className="text-muted-foreground">Search the multiverse and add physical cards to your vault.</p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="import">Bulk Import</TabsTrigger>
        </TabsList>
        <TabsContent value="search">
          <SearchTab />
        </TabsContent>
        <TabsContent value="import">
          <ImportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchTab() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedScryfallId, setSelectedScryfallId] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<string>("__all__");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [counterCard, setCounterCard] = useState<{ id: string; name: string } | null>(null);

  const { data: sets } = useListScryfallSets({ query: { staleTime: Infinity, queryKey: ["/api/scryfall/sets"] } });
  const { data: collectionCards } = useListCollectionCards();

  const collectionScryfallIds = new Set(collectionCards?.map(c => c.scryfallId) || []);
  const collectionCounts = collectionCards?.reduce((acc, card) => {
    acc[card.scryfallId] = (acc[card.scryfallId] || 0) + card.quantity;
    return acc;
  }, {} as Record<string, number>) || {};

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 600);
    return () => clearTimeout(handler);
  }, [query]);

  const searchQuery = selectedSet !== "__all__" && debouncedQuery 
    ? `${debouncedQuery} set:${selectedSet}` 
    : debouncedQuery;

  const { data: searchResults, isLoading: isSearching } = useSearchScryfallCards(
    { q: searchQuery, page: 1 },
    { query: { enabled: debouncedQuery.length > 2, queryKey: ["search", searchQuery] } }
  );

  const handleUpdateQuantity = (id: string, change: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + change)
    }));
  };

  const handleOpenDialog = (id: string) => {
    setSelectedScryfallId(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 max-w-3xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by card name (e.g. Black Lotus, Lightning Bolt)..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 text-lg bg-card border-card-border focus-visible:ring-primary shadow-sm"
          />
        </div>
        <div className="w-full sm:w-64 shrink-0">
          <Select value={selectedSet} onValueChange={setSelectedSet}>
            <SelectTrigger className="h-12 bg-card border-card-border">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Sets</SelectItem>
              {sets?.map(set => (
                <SelectItem key={set.code} value={set.code}>
                  {set.name} ({set.code.toUpperCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isSearching && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {debouncedQuery.length > 2 && !isSearching && searchResults?.data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
          {searchResults.data.map(card => {
            const inCollection = collectionScryfallIds.has(card.id);
            const qty = quantities[card.id] || 1;
            
            return (
              <Card 
                key={card.id} 
                className="bg-card border-card-border overflow-hidden group cursor-pointer hover:border-primary transition-all relative"
                onClick={() => handleOpenDialog(card.id)}
              >
                <div className="aspect-[5/7] w-full bg-muted relative">
                  {card.imageUris?.normal ? (
                    <img src={card.imageUris.normal} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                  )}
                  {inCollection && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-sm">In Collection</Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <div className="flex items-center gap-2 bg-background/80 backdrop-blur rounded-lg p-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleUpdateQuantity(card.id, -1, e)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center font-mono">{qty}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleUpdateQuantity(card.id, 1, e)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="secondary" size="sm" className="pointer-events-none">
                      <Plus className="h-4 w-4 mr-2" /> Add {qty > 1 ? `${qty} Prints` : 'Print'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-background/80 backdrop-blur border-primary/50 text-primary hover:bg-primary/10"
                      onClick={e => { e.stopPropagation(); setCounterCard({ id: card.id, name: card.name }); }}
                    >
                      <Shield className="h-3.5 w-3.5 mr-1.5" /> Find Counters
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-1">{card.name}</h3>
                  <p className="text-xs text-muted-foreground">{card.setName}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {debouncedQuery.length > 2 && !isSearching && searchResults?.data?.length === 0 && (
        <div className="py-20 text-center border border-dashed border-border rounded-xl bg-card">
          <p className="text-muted-foreground">No cards found matching "{debouncedQuery}".</p>
        </div>
      )}

      <AddCardDialog 
        scryfallId={selectedSet === "all" ? selectedScryfallId : selectedScryfallId} 
        onClose={() => {
          setSelectedScryfallId(null);
        }} 
        initialQuantity={selectedScryfallId ? (quantities[selectedScryfallId] || 1) : 1}
        ownedCount={selectedScryfallId ? collectionCounts[selectedScryfallId] : 0}
      />

      <CounterCardsModal
        scryfallId={counterCard?.id ?? null}
        cardName={counterCard?.name ?? ""}
        onClose={() => setCounterCard(null)}
      />
    </div>
  );
}

function AddCardDialog({ scryfallId, onClose, initialQuantity = 1, ownedCount = 0 }: { scryfallId: string | null, onClose: () => void, initialQuantity?: number, ownedCount?: number }) {
  const { data: prints, isLoading: isPrintsLoading } = useGetCardPrints(scryfallId || "", {
    query: { enabled: !!scryfallId, queryKey: ["prints", scryfallId] }
  });
  
  const { data: cardDetails } = useGetScryfallCard(scryfallId || "", {
    query: { enabled: !!scryfallId, queryKey: ["scryfallCard", scryfallId] }
  });
  
  const [selectedPrintId, setSelectedPrintId] = useState<string>("");
  const [condition, setCondition] = useState<any>("NM");
  const [foil, setFoil] = useState(false);
  const [quantity, setQuantity] = useState(initialQuantity.toString());
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const addMutation = useAddCardToCollection();

  // Reset form when opened
  useEffect(() => {
    if (scryfallId) {
      if (prints && prints.length > 0 && !selectedPrintId) {
        setSelectedPrintId(prints[0].id);
      }
      setQuantity(initialQuantity.toString());
      setSuccess(false);
    }
  }, [prints, scryfallId, initialQuantity]);

  const selectedPrint = prints?.find(p => p.id === (selectedPrintId || prints?.[0]?.id));

  const handleAdd = () => {
    if (!selectedPrint) return;
    
    addMutation.mutate({
      data: {
        scryfallId: selectedPrint.id,
        condition,
        foil,
        quantity: parseInt(quantity) || 1,
        notes: notes || undefined
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Card Added",
          description: `Added ${quantity}x ${selectedPrint.name} to collection.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/collection"] });
        queryClient.invalidateQueries({ queryKey: ["/api/collection/stats"] });
        setSuccess(true);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to add card to collection.",
          variant: "destructive"
        });
      }
    });
  };

  const handleAddAnother = () => {
    setSuccess(false);
    setQuantity("1");
  };

  return (
    <Dialog open={!!scryfallId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-card border-card-border text-foreground">
        {isPrintsLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : selectedPrint ? (
          <div className="flex flex-col md:flex-row h-full max-h-[80vh]">
            <div className="w-full md:w-1/2 bg-muted p-6 flex flex-col items-center justify-center shrink-0">
              <div className="aspect-[5/7] w-full max-w-[240px] rounded-xl overflow-hidden shadow-xl relative">
                {selectedPrint.imageUris?.normal ? (
                  <img src={selectedPrint.imageUris.normal} alt={selectedPrint.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-card flex items-center justify-center border border-border">No Image</div>
                )}
                {foil && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent mix-blend-overlay pointer-events-none" />
                )}
              </div>
            </div>
            
            <div className="w-full md:w-1/2 p-6 overflow-y-auto flex flex-col gap-6">
              {success ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-2">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-serif font-bold">Successfully Added</h3>
                  <p className="text-muted-foreground text-sm">Added {quantity}x {selectedPrint.name} to your vault.</p>
                  
                  <div className="flex flex-col gap-2 w-full mt-6">
                    <Button onClick={handleAddAnother} variant="outline" className="w-full">
                      Add Another Copy
                    </Button>
                    <Button onClick={onClose} className="w-full">
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <DialogTitle className="text-xl font-serif">{selectedPrint.name}</DialogTitle>
                    <DialogDescription>{selectedPrint.typeLine}</DialogDescription>
                    {cardDetails?.oracleText && (
                      <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap border-l-2 border-primary pl-2 italic">
                        {cardDetails.oracleText}
                      </p>
                    )}
                  </div>

                  {ownedCount > 0 && (
                    <Alert className="bg-amber-500/10 text-amber-500 border-amber-500/20 py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        You already own {ownedCount} copies. Adding more will create a separate entry.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <Label>Printing / Set</Label>
                      <Select value={selectedPrintId || prints?.[0]?.id} onValueChange={setSelectedPrintId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select printing" />
                        </SelectTrigger>
                        <SelectContent>
                          {prints?.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex justify-between items-center w-full min-w-[200px] pr-2">
                                <span>{p.setName} ({p.setCode.toUpperCase()})</span>
                                <span className="text-xs text-muted-foreground ml-2">#{p.collectorNumber}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <Select value={condition} onValueChange={setCondition}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NM">Near Mint</SelectItem>
                            <SelectItem value="LP">Lightly Played</SelectItem>
                            <SelectItem value="MP">Moderately Played</SelectItem>
                            <SelectItem value="HP">Heavily Played</SelectItem>
                            <SelectItem value="DMG">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={quantity} 
                          onChange={(e) => setQuantity(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 py-2">
                      <Switch id="foil" checked={foil} onCheckedChange={setFoil} />
                      <Label htmlFor="foil" className="flex items-center gap-2 cursor-pointer">
                        Foil Version
                        {foil && selectedPrint.prices?.usd_foil && (
                          <span className="text-emerald-500 font-mono text-xs">{formatPrice(selectedPrint.prices.usd_foil)}</span>
                        )}
                        {!foil && selectedPrint.prices?.usd && (
                          <span className="text-emerald-500 font-mono text-xs">{formatPrice(selectedPrint.prices.usd)}</span>
                        )}
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea 
                        placeholder="e.g. Signed by artist, prerelease stamp..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="resize-none h-20"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end gap-2 mt-auto">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={addMutation.isPending} className="min-w-[120px]">
                      {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Vault"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ImportTab() {
  const [csvContent, setCsvContent] = useState("");
  const [format, setFormat] = useState<"generic" | "moxfield" | "archidekt">("generic");
  const [result, setResult] = useState<any>(null);
  
  const importMutation = useImportCollectionCsv();
  const queryClient = useQueryClient();

  const handleImport = () => {
    if (!csvContent.trim()) return;
    importMutation.mutate({
      data: { csvContent, format }
    }, {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/collection"] });
        queryClient.invalidateQueries({ queryKey: ["/api/collection/stats"] });
      }
    });
  };

  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>CSV Format</Label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">Generic (Quantity, Name, Set)</SelectItem>
                <SelectItem value="moxfield">Moxfield</SelectItem>
                <SelectItem value="archidekt">Archidekt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Paste CSV Content</Label>
            <div className="text-xs text-muted-foreground mb-2">
              {format === 'generic' && "Expected columns: Quantity, Name, SetCode (optional)"}
              {format === 'moxfield' && "Paste the exact Moxfield collection export CSV"}
              {format === 'archidekt' && "Paste the exact Archidekt collection export CSV"}
            </div>
            <Textarea 
              value={csvContent} 
              onChange={e => setCsvContent(e.target.value)} 
              placeholder="1, Black Lotus, LEA&#10;4, Lightning Bolt" 
              className="font-mono h-64 whitespace-pre"
            />
          </div>

          <Button onClick={handleImport} disabled={importMutation.isPending || !csvContent.trim()}>
            {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Import Cards
          </Button>
        </div>

        {result && (
          <div className="mt-8 p-4 bg-muted/50 rounded-xl border border-border">
            <h3 className="font-semibold mb-4 text-lg">Import Results</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-card p-4 rounded-lg border border-border text-center">
                <div className="text-2xl font-bold text-emerald-500">{result.imported}</div>
                <div className="text-xs text-muted-foreground uppercase">Imported</div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-border text-center">
                <div className="text-2xl font-bold text-amber-500">{result.skipped}</div>
                <div className="text-xs text-muted-foreground uppercase">Skipped</div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-border text-center">
                <div className="text-2xl font-bold text-destructive">{result.errors?.length || 0}</div>
                <div className="text-xs text-muted-foreground uppercase">Errors</div>
              </div>
            </div>
            
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-destructive">Error Log</Label>
                <div className="bg-background/50 p-3 rounded border border-destructive/20 text-xs font-mono text-destructive/80 max-h-32 overflow-y-auto">
                  {result.errors.map((err: string, i: number) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}