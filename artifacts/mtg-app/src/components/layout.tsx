import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BookOpen, Layers, PlusCircle, Scale, Menu, Wifi, WifiOff, User, MessageSquare, Heart } from "lucide-react";
import { useHealthCheck, useGetSettings } from "@workspace/api-client-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/feedback-modal";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Scale },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/add-card", label: "Add Card", icon: PlusCircle },
  { href: "/decks", label: "Decks", icon: BookOpen },
  { href: "/wishlist", label: "Wishlist", icon: BookOpen },
  { href: "/sets", label: "Sets", icon: BookOpen },
  { href: "/house-rules", label: "House Rules", icon: BookOpen },
  { href: "/account", label: "Account", icon: User },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health, isError } = useHealthCheck({ query: { refetchInterval: 30000, queryKey: ["/api/health"] } });
  const { data: settings } = useGetSettings({ query: { queryKey: ["/api/settings"] } });
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const paypalLink = settings?.paypalEmail
    ? `https://www.paypal.com/donate/?business=${encodeURIComponent(settings.paypalEmail)}&currency_code=USD`
    : null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="border-r border-border bg-sidebar">
          <SidebarHeader className="p-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              {settings?.avatarUrl ? (
                <img src={settings.avatarUrl} alt={settings.displayName} className="h-8 w-8 rounded-full object-cover border border-border" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-base font-serif font-bold text-primary tracking-tight leading-tight">Grimoire</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">{settings?.displayName ?? "Collection Manager"}</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-4">
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href}
                    className={cn(
                      "mx-2 mb-1",
                      location === item.href
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors">
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border space-y-2">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-foreground justify-start px-2 h-8"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Feedback
              </Button>
              {paypalLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 justify-start px-2 h-8"
                  asChild
                >
                  <a href={paypalLink} target="_blank" rel="noopener noreferrer">
                    <Heart className="h-3.5 w-3.5 mr-1.5" /> Support
                  </a>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isError || health?.status !== "ok" ? (
                <><WifiOff className="h-3 w-3 text-destructive" /> <span>Disconnected</span></>
              ) : (
                <><Wifi className="h-3 w-3 text-emerald-500" /> <span>API Connected</span></>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
          <header className="h-14 flex items-center px-4 border-b border-border bg-card/50 backdrop-blur shrink-0 md:hidden">
            <SidebarTrigger />
            <span className="ml-4 font-serif font-bold text-primary">Grimoire</span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto h-full">
              {children}
            </div>
          </main>
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </SidebarProvider>
  );
}
