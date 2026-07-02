import { useState, useEffect } from "react";
import { useListWishlistItems, useAddWishlistItem, useUpdateWishlistItem, useDeleteWishlistItem, useRefreshWishlistPrices, useSearchScryfallCards } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, RefreshCw, Search, TrendingDown } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function Wishlist() {
  const { data: items, isLoading } = useListWishlistItems();
  const refreshPricesMutation = useRefreshWishlistPrices();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefreshPrices = () => {
    refreshPricesMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
        toast({ title: "Prices Refreshed" });
      }
    });
  };

  const totalValue = items?.reduce((acc: number, item: any) => {
    const price = parseFloat(item.priceUsd ?? "0") || 0;
    return acc + price * item.quantity;
  }, 0) || 0;

  const alertCount = items?.filter((item: any) => {
    if (!item.maxPrice || !item.priceUsd) return false;
    return parseFloat(item.priceUsd) <= parseFloat(item.maxPrice);
  }).length || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">Wishlist</h1>
          <p className="text-muted-foreground">
            Track cards you want to acquire. Total Value:{" "}
            <span className="text-emerald-500 font-mono font-bold">{formatPrice(totalValue)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshPrices} disabled={refreshPricesMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshPricesMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Prices
          </Button>
          <AddWishlistItemDialog />
        </div>
      </div>

      {alertCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <TrendingDown className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">
            {alertCount} {alertCount === 1 ? "card is" : "cards are"} at or below your target price.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !items?.length ? (
        <div className="py-20 text-center border border-dashed border-border rounded-xl bg-card">
          <p className="text-muted-foreground mb-4">Your wishlist is empty.</p>
          <AddWishlistItemDialog trigger={<Button>Add Cards</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistCard({ item }: { item: any }) {
  const [maxPrice, setMaxPrice] = useState(item.maxPrice?.toString() || "");
  const [isEditing, setIsEditing] = useState(false);
  const updateMutation = useUpdateWishlistItem();
  const deleteMutation = useDeleteWishlistItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const currentPrice = parseFloat(item.priceUsd ?? "0") || 0;
  const targetPrice = parseFloat(item.maxPrice ?? "0") || 0;
  const isAtOrBelowTarget = item.maxPrice && item.priceUsd && currentPrice <= targetPrice;

  const handleUpdate = () => {
    updateMutation.mutate({
      id: item.id,
      data: { maxPrice: parseFloat(maxPrice) || undefined }
    }, {
      onSuccess: () => {
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      }
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: item.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
        toast({ title: "Removed from wishlist" });
      }
    });
  };

  return (
    <Card className={`bg-card overflow-hidden relative group transition-all ${isAtOrBelowTarget ? 'border-emerald-500/50 shadow-emerald-500/10 shadow-md' : 'border-card-border'}`}>
      {isAtOrBelowTarget && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/50 via-emerald-400 to-emerald-500/50" />
      )}
      <div className="flex gap-4 p-3">
        <div className="w-20 h-[112px] bg-muted rounded shrink-0 overflow-hidden">
          {item.imageUri ? (
            <img src={item.imageUri} alt={item.name} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0 py-1 flex flex-col">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-semibold text-sm line-clamp-1">{item.name}</h3>
            {isAtOrBelowTarget && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1 py-0 h-4 shrink-0">
                Target
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{item.setName}</p>

          <div className="mt-auto flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Market:</span>
              <span className={`font-mono ${isAtOrBelowTarget ? 'text-emerald-400 font-bold' : 'text-emerald-500'}`}>
                {formatPrice(item.priceUsd)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Target:</span>
              {isEditing ? (
                <div className="flex gap-1 items-center max-w-[100px]">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    onBlur={handleUpdate}
                    onKeyDown={e => e.key === "Enter" && handleUpdate()}
                    className="h-6 w-16 px-1 py-0 text-xs text-right"
                    autoFocus
                  />
                </div>
              ) : (
                <span
                  className="font-mono cursor-pointer hover:text-primary transition-colors border-b border-dashed border-transparent hover:border-primary"
                  onClick={() => setIsEditing(true)}
                >
                  {item.maxPrice ? formatPrice(item.maxPrice) : "Set target"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        className="absolute top-2 right-2 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </Card>
  );
}

function AddWishlistItemDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 600);
    return () => clearTimeout(handler);
  }, [query]);

  const { data: searchResults, isLoading: isSearching } = useSearchScryfallCards(
    { q: debouncedQuery, page: 1 },
    { query: { enabled: debouncedQuery.length > 2, queryKey: ["search", debouncedQuery] } }
  );

  const addMutation = useAddWishlistItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAdd = (scryfallId: string, name: string) => {
    addMutation.mutate({
      data: { scryfallId, quantity: 1, foil: false }
    }, {
      onSuccess: () => {
        toast({ title: `Added ${name} to wishlist` });
        queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="h-4 w-4 mr-2" /> Add Cards</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-card-border text-foreground h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Cards</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : searchResults?.data ? (
            <div className="space-y-2">
              {searchResults.data.map(card => (
                <div key={card.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                      {card.imageUris?.small ? <img src={card.imageUris.small} alt={card.name} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{card.name}</h4>
                      <p className="text-xs text-muted-foreground">{card.setName}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAdd(card.id, card.name)}
                    disabled={addMutation.isPending}
                    className="shrink-0"
                  >
                    {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Add
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
