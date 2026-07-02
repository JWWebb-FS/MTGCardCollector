import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Collection from "@/pages/collection";
import AddCard from "@/pages/add-card";
import CardDetail from "@/pages/card-detail";
import HouseRules from "@/pages/house-rules";
import Decks from "@/pages/decks";
import DeckDetail from "@/pages/deck-detail";
import Wishlist from "@/pages/wishlist";
import Sets from "@/pages/sets";
import Account from "@/pages/account";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/collection" component={Collection} />
        <Route path="/add-card" component={AddCard} />
        <Route path="/card/:id" component={CardDetail} />
        <Route path="/house-rules" component={HouseRules} />
        <Route path="/decks" component={Decks} />
        <Route path="/decks/:id" component={DeckDetail} />
        <Route path="/wishlist" component={Wishlist} />
        <Route path="/sets" component={Sets} />
        <Route path="/account" component={Account} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
