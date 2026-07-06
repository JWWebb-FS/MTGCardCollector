import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Collection = lazy(() => import("@/pages/collection"));
const AddCard = lazy(() => import("@/pages/add-card"));
const CardDetail = lazy(() => import("@/pages/card-detail"));
const HouseRules = lazy(() => import("@/pages/house-rules"));
const Decks = lazy(() => import("@/pages/decks"));
const DeckDetail = lazy(() => import("@/pages/deck-detail"));
const Wishlist = lazy(() => import("@/pages/wishlist"));
const Sets = lazy(() => import("@/pages/sets"));
const Account = lazy(() => import("@/pages/account"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
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
