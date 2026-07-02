import { useState } from "react";
import { useListDecks, useCreateDeck, useDeleteDeck, useImportDecklist } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Layers, FileText, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function Decks() {
  const { data: decks, isLoading } = useListDecks();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">Decks</h1>
          <p className="text-muted-foreground">Build and manage your MTG decks.</p>
        </div>
        <CreateDeckDialog />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !decks?.length ? (
        <div className="py-20 text-center border border-dashed border-border rounded-xl bg-card">
          <Layers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No decks yet</h3>
          <p className="text-muted-foreground mb-4">Create your first deck to start brewing.</p>
          <CreateDeckDialog trigger={<Button>Create Deck</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeckCard({ deck }: { deck: any }) {
  const deleteMutation = useDeleteDeck();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    deleteMutation.mutate({ id: deck.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
        toast({ title: "Deck deleted" });
      }
    });
  };

  return (
    <Link href={`/decks/${deck.id}`}>
      <Card className="bg-card border-card-border overflow-hidden hover:border-primary transition-colors cursor-pointer group h-full flex flex-col">
        <CardHeader className="pb-3 border-b border-border bg-muted/20 relative">
          <div className="flex justify-between items-start">
            <div>
              <Badge variant="outline" className="mb-2 bg-primary/10 text-primary border-primary/20">{deck.format}</Badge>
              <CardTitle className="text-xl font-serif group-hover:text-primary transition-colors">{deck.name}</CardTitle>
              <CardDescription className="line-clamp-1 mt-1">{deck.description || "No description"}</CardDescription>
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()} className="bg-card border-card-border text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{deck.name}"?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDelete(e as any); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col justify-end">
          <div className="flex justify-between items-end">
            <div className="flex gap-1">
              {deck.colorIdentity?.map((c: string) => (
                <span key={c} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black border border-black/20" style={{ backgroundColor: `var(--color-mana-${c.toLowerCase()})` }}>
                  {c}
                </span>
              ))}
              {(!deck.colorIdentity || deck.colorIdentity.length === 0) && (
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground border border-border">C</span>
              )}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {deck.cardCount || 0} cards
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CreateDeckDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "import">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("Standard");
  const [colors, setColors] = useState<string[]>([]);

  const createMutation = useCreateDeck();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    if (!name) return;
    createMutation.mutate({
      data: { name, description, format, colorIdentity: colors }
    }, {
      onSuccess: (deck) => {
        queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
        toast({ title: "Deck created" });
        setOpen(false);
        setName(""); setDescription(""); setColors([]); setFormat("Standard");
      }
    });
  };

  const toggleColor = (c: string) => {
    setColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="h-4 w-4 mr-2" /> New Deck</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-card-border text-foreground">
        <DialogHeader>
          <DialogTitle>New Deck</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${mode === 'create' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMode("create")}
          >
            Create New
          </button>
          <button
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${mode === 'import' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMode("import")}
          >
            <FileText className="h-3.5 w-3.5" /> Import Decklist
          </button>
        </div>

        {mode === "create" ? (
          <>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Deck Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mono Red Aggro" />
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Standard", "Modern", "Legacy", "Vintage", "Commander", "Pioneer", "Pauper", "Casual"].map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color Identity</Label>
                <div className="flex gap-4">
                  {['W', 'U', 'B', 'R', 'G'].map(c => (
                    <div key={c} className="flex items-center space-x-2">
                      <Checkbox id={`color-${c}`} checked={colors.includes(c)} onCheckedChange={() => toggleColor(c)} />
                      <label htmlFor={`color-${c}`} className="text-sm font-medium">{c}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Deck strategy..." className="resize-none h-20" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !name}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create
              </Button>
            </div>
          </>
        ) : (
          <ImportDecklistForm onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportDecklistForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"setup" | "importing" | "done">("setup");
  const [name, setName] = useState("");
  const [format, setFormat] = useState("Standard");
  const [decklist, setDecklist] = useState("");
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [createdDeckId, setCreatedDeckId] = useState<number | null>(null);

  const createMutation = useCreateDeck();
  const importMutation = useImportDecklist();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleImport = async () => {
    if (!name || !decklist.trim()) return;

    setStep("importing");

    createMutation.mutate({ data: { name, format, colorIdentity: [] } }, {
      onSuccess: (deck) => {
        setCreatedDeckId(deck.id);
        importMutation.mutate({
          id: deck.id,
          data: { decklist, section: "mainboard" }
        }, {
          onSuccess: (res) => {
            setResult({ imported: res.imported, failed: res.failed, errors: res.errors });
            setStep("done");
            queryClient.invalidateQueries({ queryKey: ["/api/decks"] });
          },
          onError: () => {
            toast({ title: "Import failed", variant: "destructive" });
            setStep("setup");
          }
        });
      },
      onError: () => {
        toast({ title: "Failed to create deck", variant: "destructive" });
        setStep("setup");
      }
    });
  };

  if (step === "importing") {
    return (
      <div className="py-12 flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Importing cards from Scryfall...</p>
        <p className="text-xs text-muted-foreground">This may take a moment for large lists.</p>
      </div>
    );
  }

  if (step === "done" && result) {
    return (
      <div className="py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <div className="text-2xl font-bold font-serif text-emerald-500">{result.imported}</div>
              <div className="text-xs text-muted-foreground">cards imported</div>
            </div>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <div className="text-2xl font-bold font-serif text-destructive">{result.failed}</div>
              <div className="text-xs text-muted-foreground">failed</div>
            </div>
          </div>
        </div>
        {result.errors.length > 0 && (
          <div className="max-h-32 overflow-y-auto bg-muted/50 rounded-lg p-3 space-y-1">
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive">{e}</p>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {createdDeckId && (
            <Link href={`/decks/${createdDeckId}`}>
              <Button onClick={onClose}>Open Deck</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Deck Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Legacy Burn" />
      </div>
      <div className="space-y-2">
        <Label>Format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Standard", "Modern", "Legacy", "Vintage", "Commander", "Pioneer", "Pauper", "Casual"].map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Decklist</Label>
        <p className="text-xs text-muted-foreground">One card per line: "4 Lightning Bolt" or "4x Lightning Bolt"</p>
        <Textarea
          value={decklist}
          onChange={e => setDecklist(e.target.value)}
          placeholder={"4 Lightning Bolt\n4x Monastery Swiftspear\n2 Light Up the Stage\n..."}
          className="resize-none h-40 font-mono text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleImport} disabled={!name || !decklist.trim()}>
          Import
        </Button>
      </div>
    </div>
  );
}
