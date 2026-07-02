import { useState } from "react";
import { useListScryfallSets, useGetSetCards, useListCollectionCards } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, Layers, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Sets() {
  const [selectedSet, setSelectedSet] = useState<string | null>(null);

  if (selectedSet) {
    return <SetDetail setCode={selectedSet} onBack={() => setSelectedSet(null)} />;
  }

  return <SetsList onSelectSet={setSelectedSet} />;
}

function SetsList({ onSelectSet }: { onSelectSet: (code: string) => void }) {
  const [search, setSearch] = useState("");
  const [setType, setSetType] = useState<string>("expansion");
  
  const { data: sets, isLoading: setsLoading } = useListScryfallSets({ query: { staleTime: Infinity, queryKey: ["/api/scryfall/sets"] } });
  const { data: collection, isLoading: collectionLoading } = useListCollectionCards();

  const isLoading = setsLoading || collectionLoading;

  const collectionBySet = collection?.reduce((acc: any, card: any) => {
    acc[card.setCode] = (acc[card.setCode] || 0) + 1;
    return acc;
  }, {}) || {};

  const filteredSets = sets?.filter(set => {
    if (setType !== "all" && set.setType !== setType) return false;
    if (search && !set.name.toLowerCase().includes(search.toLowerCase()) && !set.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">Set Completion</h1>
        <p className="text-muted-foreground">Track your progress collecting entire sets.</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search sets..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={setType} onValueChange={setSetType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Set Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="core">Core</SelectItem>
            <SelectItem value="expansion">Expansion</SelectItem>
            <SelectItem value="masters">Masters</SelectItem>
            <SelectItem value="commander">Commander</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSets?.map(set => {
            const collected = collectionBySet[set.code] || 0;
            const total = set.cardCount;
            const percentage = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0;
            
            return (
              <Card key={set.code} className="bg-card border-card-border overflow-hidden hover:border-primary transition-colors cursor-pointer group" onClick={() => onSelectSet(set.code)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold font-serif line-clamp-1 group-hover:text-primary transition-colors">{set.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="uppercase font-mono">{set.code}</span>
                        <span>•</span>
                        <span className="capitalize">{set.setType}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{collected} / {total} cards</span>
                      <span>{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-2 bg-muted" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SetDetail({ setCode, onBack }: { setCode: string, onBack: () => void }) {
  const { data: sets } = useListScryfallSets({ query: { staleTime: Infinity, queryKey: ["/api/scryfall/sets-detail", setCode] } });
  const setInfo = sets?.find(s => s.code === setCode);
  
  const { data: setCardsData, isLoading: setCardsLoading } = useGetSetCards(setCode, { page: 1 });
  const { data: collection, isLoading: collectionLoading } = useListCollectionCards();

  const isLoading = setCardsLoading || collectionLoading;
  
  const collectionIds = new Set(collection?.map(c => c.scryfallId) || []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">{setInfo?.name || setCode.toUpperCase()}</h1>
          <p className="text-muted-foreground">Set Details</p>
        </div>
      </div>

      {isLoading ? (
         <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {setCardsData?.data.map(card => {
            const owned = collectionIds.has(card.id);
            return (
              <Card key={card.id} className={`overflow-hidden transition-all duration-200 ${owned ? 'border-emerald-500/50 opacity-100' : 'border-card-border opacity-50 grayscale hover:grayscale-0'}`}>
                <div className="aspect-[5/7] w-full bg-muted relative">
                  {card.imageUris?.normal ? (
                     <img src={card.imageUris.normal} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">No Image</div>
                  )}
                  {owned && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-sm">Owned</Badge>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}