import { useGetCollectionStats, useRefreshCollectionPrices, useGetCollectionValueHistory, useListCollectionCards } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from "recharts";
import { Link } from "wouter";
import { AlertCircle, TrendingUp, Layers, Sparkles, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const MANA_COLORS: Record<string, string> = {
  W: "#f8f6d8",
  U: "#c1d7e9",
  B: "#bab1ab",
  R: "#e49977",
  G: "#a3c095",
  C: "#cccccc",
  M: "#cfc174"
};

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetCollectionStats();
  const { data: valueHistory } = useGetCollectionValueHistory();
  const { data: recentCards } = useListCollectionCards(
    { sortBy: "addedAt", sortDir: "desc" },
    { query: { queryKey: ["/api/collection", "recent"] } }
  );
  const refreshPricesMutation = useRefreshCollectionPrices();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefreshPrices = () => {
    refreshPricesMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast({ title: `Updated ${data.updated} cards`, description: `Total value: ${formatPrice(data.totalValue)}` });
        queryClient.invalidateQueries({ queryKey: ["/api/collection/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/collection"] });
        queryClient.invalidateQueries({ queryKey: ["/api/collection/value-history"] });
      },
      onError: () => {
        toast({ title: "Failed to refresh prices", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load collection statistics.</AlertDescription>
      </Alert>
    );
  }

  const colorData = Object.entries(stats.colorBreakdown).map(([color, count]) => ({
    name: color === "" ? "Colorless" : color,
    value: count,
    fill: MANA_COLORS[color] || MANA_COLORS.C
  })).sort((a, b) => b.value - a.value);

  const setData = stats.setBreakdown.slice(0, 10);

  const historyData = (valueHistory || []).map((snap: any) => ({
    date: format(new Date(snap.snapshotAt), "MMM d"),
    value: snap.totalValue,
    cards: snap.cardCount,
  }));

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">Vault Overview</h1>
          <p className="text-muted-foreground">High-level statistics of your physical card library.</p>
        </div>
        <Button variant="outline" onClick={handleRefreshPrices} disabled={refreshPricesMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshPricesMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh Prices
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-card-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium">
              <Layers className="h-4 w-4 text-primary" /> Total Cards
            </CardDescription>
            <CardTitle className="text-4xl font-serif">{stats.totalCards}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{stats.uniqueCards} unique prints</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Total Value
            </CardDescription>
            <CardTitle className="text-4xl font-serif text-emerald-500">{formatPrice(stats.totalValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Based on current market prices</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4 text-purple-500" /> Foil Value
            </CardDescription>
            <CardTitle className="text-4xl font-serif text-purple-500">{formatPrice(stats.totalFoilValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Premium treatments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="font-serif">Color Distribution</CardTitle>
            <CardDescription>Breakdown by card color identity</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {colorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={colorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  >
                    {colorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)' }}
                    itemStyle={{ color: 'var(--color-foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="font-serif">Top Sets</CardTitle>
            <CardDescription>Most collected expansions</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {setData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setData} layout="vertical" margin={{ left: 50, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="setCode" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-muted)', opacity: 0.2 }}
                    contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {historyData.length >= 2 && (
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="font-serif">Collection Value History</CardTitle>
            <CardDescription>Total value over time — updated each time you refresh prices</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Value"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {recentCards && recentCards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-serif font-bold tracking-tight">Recently Added</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {recentCards.slice(0, 6).map((card) => (
              <Link key={card.id} href={`/card/${card.id}`} className="group block">
                <Card className="h-full bg-card border-card-border overflow-hidden transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-1">
                  <div className="aspect-[5/7] w-full bg-muted relative">
                    {card.imageUri ? (
                      <img src={card.imageUri} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                    )}
                    {card.foil && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent mix-blend-overlay pointer-events-none" />
                    )}
                  </div>
                  <CardContent className="p-2">
                    <p className="font-semibold text-xs line-clamp-1 group-hover:text-primary transition-colors" title={card.name}>{card.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-mono">{card.setCode}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-serif font-bold tracking-tight">Most Valuable Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.mostValuableCards.map((card) => (
            <Link key={card.id} href={`/card/${card.id}`} className="group block">
              <Card className="h-full bg-card border-card-border overflow-hidden transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-1">
                <div className="aspect-[5/7] w-full bg-muted relative">
                  {card.imageUri ? (
                    <img
                      src={card.imageUri}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                  )}
                  {card.foil && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent mix-blend-overlay pointer-events-none" />
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors" title={card.name}>{card.name}</h3>
                    <span className="font-mono text-sm text-emerald-500 whitespace-nowrap">
                      {formatPrice(card.foil ? card.priceFoil : card.priceUsd)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground uppercase">{card.setCode}</span>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">{card.condition}</span>
                    {card.foil && <span className="text-[10px] font-bold px-1 py-0.5 rounded-sm bg-amber-500/20 text-amber-500">FOIL</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {stats.mostValuableCards.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed border-border">
              No cards in collection yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
