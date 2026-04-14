import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Browse from "@/pages/browse";
import MyRequests from "@/pages/my-requests";
import PostRequest from "@/pages/post-request";
import WalletsPage from "@/pages/wallets";
import AddFunds from "@/pages/add-funds";
import Profile from "@/pages/profile";
import RequestDetail from "@/pages/request-detail";
import Notifications from "@/pages/notifications";
import UserProfilePage from "@/pages/user-profile";
import About from "@/pages/about";
import Community from "@/pages/community";
import Tournaments from "@/pages/tournaments";
import TournamentDetail from "@/pages/tournament-detail";
import MyTournaments from "@/pages/my-tournaments";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse text-primary font-bold uppercase tracking-widest">Loading...</div></div>;
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/browse" component={Browse} />
        
        <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
        <Route path="/my-requests"><ProtectedRoute component={MyRequests} /></Route>
        <Route path="/post-request"><ProtectedRoute component={PostRequest} /></Route>
        <Route path="/wallets"><ProtectedRoute component={WalletsPage} /></Route>
        <Route path="/add-funds"><ProtectedRoute component={AddFunds} /></Route>
        <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
        <Route path="/requests/:id" component={RequestDetail} />
        <Route path="/users/:id" component={UserProfilePage} />
        <Route path="/notifications"><ProtectedRoute component={Notifications} /></Route>
        <Route path="/about" component={About} />
        <Route path="/community" component={Community} />
        <Route path="/tournaments" component={Tournaments} />
        <Route path="/my-tournaments" component={MyTournaments} />
        <Route path="/tournaments/:id" component={TournamentDetail} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
    </ThemeProvider>
  );
}

export default App;