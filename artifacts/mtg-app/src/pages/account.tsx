import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, useListFeedback } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, User, Heart, MessageSquare, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Account() {
  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: ["/api/settings"] }
  });
  const updateMutation = useUpdateSettings();
  const { data: feedback } = useListFeedback({ query: { queryKey: ["/api/feedback"] } });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  useEffect(() => {
    if (settings) {
      setDisplayName(settings.displayName ?? "");
      setAvatarUrl(settings.avatarUrl ?? "");
      setPaypalEmail(settings.paypalEmail ?? "");
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(
      { data: { displayName, avatarUrl: avatarUrl || null, paypalEmail: paypalEmail || null } },
      {
        onSuccess: () => {
          toast({ title: "Settings saved" });
          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        },
        onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const paypalLink = paypalEmail
    ? `https://www.paypal.com/donate/?business=${encodeURIComponent(paypalEmail)}&currency_code=USD`
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight mb-1">Account</h1>
        <p className="text-muted-foreground">Manage your profile and app settings.</p>
      </div>

      {/* Profile */}
      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Profile
          </CardTitle>
          <CardDescription>Your name and avatar shown in the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Avatar URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-background border-border"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support / PayPal */}
      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" /> Support Link
          </CardTitle>
          <CardDescription>
            Enter your PayPal email to generate a donate button in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>PayPal Email</Label>
            <Input
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              className="bg-background border-border"
            />
          </div>
          {paypalLink && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
              <span className="text-muted-foreground">Link preview:</span>
              <a href={paypalLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
                {paypalLink}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto">
        {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Settings
      </Button>

      {/* Feedback inbox */}
      {feedback && feedback.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Feedback Inbox
            </h2>
            <p className="text-sm text-muted-foreground">{feedback.length} submission{feedback.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="space-y-3">
            {feedback.map((item) => (
              <Card key={item.id} className="bg-card border-card-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm flex-1">{item.message}</p>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {item.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`h-3 w-3 ${i <= item.rating! ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(item.submittedAt), "MMM d, yyyy")}
                      </span>
                      {item.page && (
                        <span className="text-[10px] text-muted-foreground font-mono">{item.page}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
