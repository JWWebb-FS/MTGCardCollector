import { useParams, useLocation } from "wouter";
import { useGetCollectionCard, useUpdateCollectionCard, useDeleteCollectionCard, useGetScryfallCard, useGetCardPriceHistory } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Trash2, Save, Shield } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CounterCardsModal } from "@/components/counter-cards-modal";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format } from "date-fns";

const FORMATS = ["standard", "pioneer", "modern", "legacy", "vintage", "commander", "pauper"];

export default function CardDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const cardId = parseInt(id || "0");

  const { data: card, isLoading } = useGetCollectionCard(cardId, {
    query: { enabled: !!cardId, queryKey: ["/api/collection", cardId] }
  });

  const { data: scryfallCard } = useGetScryfallCard(card?.scryfallId || "", {
    query: { enabled: !!card?.scryfallId, queryKey: ["scryfallCard", card?.scryfallId] }
  });

  const { data: priceHistory } = useGetCardPriceHistory(cardId, {
    query: { enabled: !!cardId, queryKey: ["/api/collection", cardId, "price-history"] }
  });

  const updateMutation = useUpdateCollectionCard();
  const deleteMutation = useDeleteCollectionCard();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showCounters, setShowCounters] = useState(false);
  const [condition, setCondition] = useState<any>("NM");
  const [foil, setFoil] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [forTrade, setForTrade] = useState(false);

  useEffect(() => {
    if (card) {
      setCondition(card.condition);
      setFoil(card.foil);
      setQuantity(card.quantity.toString());
      setNotes(card.notes || "");
      setStorageLocation(card.storageLocation || "");
      setForTrade(card.forTrade ?? false);
    }
  }, [card, isEditing]);

  const handleSave = () => {
    updateMutation.mutate({
      id: cardId,
      data: {
        condition,
        foil,
        quantity: parseInt(quantity) || 1,
        notes: notes || undefined,
        storageLocation: storageLocation || undefined,
        forTrade,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Card updated" });
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: ["/api/collection", cardId] });
        queryClient.invalidateQueries({ queryKey: ["/api/collection"] });
        queryClient.invalidateQueries({ queryKey: ["/api/collection/stats"] });
      },
      onError: () => {
        toast({ title: "Failed to update", variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: cardId }, {
      onSuccess: () => {
        toast({ title: "Card removed from collection" });
        queryClient.invalidateQueries({ queryKey: ["/api/collection"] });
        queryClient.invalidateQueries({ queryKey: ["/api/collection/stats"] });
        setLocation("/collection");
      },
      onError: () => {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!card) {
    return <div className="p-8 text-center text-muted-foreground">Card not found</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/collection")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">{card.name}</h1>
            <p className="text-muted-foreground">{card.setName} ({card.setCode.toUpperCase()}) #{card.collectorNumber}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCounters(true)} className="shrink-0">
          <Shield className="h-4 w-4 mr-2 text-primary" /> Find Counters
        </Button>
      </div>

      <CounterCardsModal
        scryfallId={showCounters ? (card.scryfallId) : null}
        cardName={card.name}
        onClose={() => setShowCounters(false)}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-4">
          <div className="aspect-[5/7] w-full rounded-2xl overflow-hidden shadow-2xl relative bg-muted">
            {card.imageUri ? (
              <img src={card.imageUri.replace("small", "large").replace("normal", "large")} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center border border-border">No Image</div>
            )}
            {card.foil && (
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent mix-blend-overlay pointer-events-none" />
            )}
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4 flex justify-between items-center">
            <span className="text-muted-foreground">Market Value</span>
            <span className="font-mono text-xl text-emerald-500 font-bold">
              {formatPrice(card.foil ? card.priceFoil : card.priceUsd)}
            </span>
          </div>
        </div>

        <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-6">
          <Card className="bg-card border-card-border">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-serif font-semibold text-primary">Collection Details</h2>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit Details
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Storage Location</Label>
                    <Input
                      placeholder="e.g. Binder 2, Deckbox Blue, Box A"
                      value={storageLocation}
                      onChange={(e) => setStorageLocation(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="foil" checked={foil} onCheckedChange={setFoil} />
                    <Label htmlFor="foil">Foil Treatment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="forTrade" checked={forTrade} onCheckedChange={setForTrade} />
                    <Label htmlFor="forTrade">Available for Trade</Label>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Add personal notes here..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Condition</div>
                    <div className="font-medium">{card.condition}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quantity</div>
                    <div className="font-medium">{card.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Treatment</div>
                    <div className="font-medium">{card.foil ? <span className="text-amber-500 font-bold">Foil</span> : "Regular"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">For Trade</div>
                    <div className="font-medium">{card.forTrade ? <span className="text-blue-400 font-bold">Yes</span> : "No"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Added On</div>
                    <div className="font-medium">{new Date(card.addedAt).toLocaleDateString()}</div>
                  </div>
                  {card.storageLocation && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Location</div>
                      <div className="font-medium truncate">{card.storageLocation}</div>
                    </div>
                  )}
                  {card.notes && (
                    <div className="col-span-full mt-2 bg-muted/50 p-3 rounded-lg border border-border text-sm">
                      <strong className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</strong>
                      {card.notes}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-card-border">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-serif font-semibold text-primary">Oracle Data</h2>
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="font-medium">{card.typeLine}</div>
                  {card.manaCost && (
                    <div className="font-mono bg-muted px-2 py-1 rounded tracking-widest">{card.manaCost}</div>
                  )}
                </div>

                {scryfallCard?.oracleText && (
                  <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap border-l-2 border-primary pl-2 italic">
                    {scryfallCard.oracleText}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {card.colorIdentity.length === 0 ? (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground">Colorless</span>
                  ) : (
                    card.colorIdentity.map(c => (
                      <span key={c} className="text-xs font-medium px-2 py-1 rounded text-black border border-black/20" style={{ backgroundColor: `var(--color-mana-${c.toLowerCase()})` }}>
                        {c === 'W' ? 'White' : c === 'U' ? 'Blue' : c === 'B' ? 'Black' : c === 'R' ? 'Red' : c === 'G' ? 'Green' : c}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {priceHistory && priceHistory.length >= 2 && (
            <Card className="bg-card border-card-border">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-serif font-semibold text-primary">Price History</h2>
                <div className="pt-4 border-t border-border h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={priceHistory.map((s: any) => ({
                        date: format(new Date(s.capturedAt), "MMM d"),
                        price: card?.foil ? s.priceFoil : s.priceUsd,
                      }))}
                      margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                        tickFormatter={(v) => `$${v?.toFixed(2) ?? "—"}`}
                        width={56}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--color-popover)", borderColor: "var(--color-border)" }}
                        itemStyle={{ color: "var(--color-foreground)" }}
                        formatter={(v: number) => v != null ? [`$${v.toFixed(2)}`, "Price"] : ["—", "Price"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-card-border">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-serif font-semibold text-primary">Format Legalities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-4 border-t border-border">
                {FORMATS.map(format => {
                  const status = scryfallCard?.legalities?.[format] || card.legalities?.[format] || "not_legal";
                  let colorClass = "bg-zinc-500/20 text-zinc-500 border-zinc-500/30";
                  if (status === "legal") colorClass = "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
                  if (status === "banned") colorClass = "bg-red-500/20 text-red-500 border-red-500/30";
                  if (status === "restricted") colorClass = "bg-amber-500/20 text-amber-500 border-amber-500/30";

                  return (
                    <div key={format} className={`flex items-center justify-between p-2 rounded border ${colorClass}`}>
                      <span className="text-xs font-medium capitalize">{format}</span>
                      <span className="text-[10px] uppercase font-bold">{status.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" /> Remove from Collection
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-card-border text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove {card.name} from your collection. You cannot undo this action.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remove Card
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
