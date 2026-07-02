import { useState, useEffect } from "react";
import { useListHouseRules, useCreateHouseRule, useUpdateHouseRule, useDeleteHouseRule, useGetHouseRule } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Edit2, Trash2, Scale, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HouseRules() {
  const [category, setCategory] = useState<string>("all");
  const { data: rules, isLoading } = useListHouseRules({
    category: category !== "all" ? category : undefined
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">House Rules</h1>
          <p className="text-muted-foreground">Manage custom play rules, bans, and format variations.</p>
        </div>
        <RuleDialog mode="create" />
      </div>

      <div className="flex gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] bg-card border-card-border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Banlist">Banlist</SelectItem>
            <SelectItem value="Mulligan">Mulligan Rules</SelectItem>
            <SelectItem value="Commander">Commander specific</SelectItem>
            <SelectItem value="Gameplay">General Gameplay</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !rules?.length ? (
        <div className="py-20 text-center border border-dashed border-border rounded-xl bg-card">
          <Scale className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No rules defined</h3>
          <p className="text-muted-foreground mb-4">Create your first house rule to track local meta variations.</p>
          <RuleDialog mode="create" trigger={<Button>Create Rule</Button>} />
        </div>
      ) : (
        <div className="space-y-6">
          {rules.map((rule) => (
            <Card key={rule.id} className={`bg-card border-card-border overflow-hidden ${!rule.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        {rule.category}
                      </span>
                      {!rule.isActive && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl font-serif">{rule.title}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <RuleDialog mode="edit" rule={rule} trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                    } />
                    <DeleteRuleDialog id={rule.id} title={rule.title} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-6">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-primary mb-3">
                      <BookOpen className="h-4 w-4" /> House Rule
                    </h4>
                    <p className="text-sm whitespace-pre-wrap text-foreground/90">{rule.description}</p>
                  </div>
                  <div className="p-6 bg-muted/10">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                      <Scale className="h-4 w-4" /> Official Rule 
                      {rule.officialRuleSource && <span className="text-xs font-normal opacity-70">({rule.officialRuleSource})</span>}
                    </h4>
                    {rule.officialRule ? (
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground/80">{rule.officialRule}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground/50">No official rule comparison provided.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RuleDialog({ mode, rule, trigger }: { mode: "create" | "edit", rule?: any, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Gameplay");
  const [description, setDescription] = useState("");
  const [officialRule, setOfficialRule] = useState("");
  const [officialRuleSource, setOfficialRuleSource] = useState("");

  const { data: fullRule } = useGetHouseRule(rule?.id || 0, {
    query: { enabled: open && mode === "edit" && !!rule?.id, queryKey: ["/api/house-rules", rule?.id] }
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && fullRule) {
        setTitle(fullRule.title);
        setCategory(fullRule.category);
        setDescription(fullRule.description);
        setOfficialRule(fullRule.officialRule || "");
        setOfficialRuleSource(fullRule.officialRuleSource || "");
      } else if (mode === "create") {
        reset();
      }
    }
  }, [open, fullRule, mode]);
  
  const createMutation = useCreateHouseRule();
  const updateMutation = useUpdateHouseRule();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!title || !description || !category) return;

    const data = {
      title,
      category,
      description,
      officialRule: officialRule || undefined,
      officialRuleSource: officialRuleSource || undefined,
      isActive: true
    };

    if (mode === "create") {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/house-rules"] });
          toast({ title: "Rule created" });
          setOpen(false);
          reset();
        }
      });
    } else {
      updateMutation.mutate({ id: rule.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/house-rules"] });
          toast({ title: "Rule updated" });
          setOpen(false);
        }
      });
    }
  };

  const reset = () => {
    if (mode === "create") {
      setTitle("");
      setCategory("Gameplay");
      setDescription("");
      setOfficialRule("");
      setOfficialRuleSource("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button><Plus className="h-4 w-4 mr-2" /> New Rule</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-card-border text-foreground">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create House Rule" : "Edit House Rule"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Free Mulligan" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Banlist">Banlist</SelectItem>
                  <SelectItem value="Mulligan">Mulligan Rules</SelectItem>
                  <SelectItem value="Commander">Commander specific</SelectItem>
                  <SelectItem value="Gameplay">General Gameplay</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>House Rule Description</Label>
            <Textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Describe how the rule works in your group..."
              className="h-24 resize-none"
            />
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-border">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Scale className="h-4 w-4" /> Official Rule Comparison (Optional)
            </Label>
            <div className="space-y-4">
              <Input 
                value={officialRuleSource} 
                onChange={e => setOfficialRuleSource(e.target.value)} 
                placeholder="Source (e.g. CR 103.4, Commander RC)" 
                className="bg-muted/50"
              />
              <Textarea 
                value={officialRule} 
                onChange={e => setOfficialRule(e.target.value)} 
                placeholder="Paste the official rule text here to show the contrast..."
                className="h-24 resize-none bg-muted/50"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !title || !description}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Rule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRuleDialog({ id, title }: { id: number, title: string }) {
  const deleteMutation = useDeleteHouseRule();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/house-rules"] });
        toast({ title: "Rule deleted" });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-card-border text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Rule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{title}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
