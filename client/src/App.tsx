import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ClientSidebar } from "@/components/client-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import UseCaseDetailPage from "@/pages/use-case-detail";
import AdminPage from "@/pages/admin";
import AuthPage from "@/pages/auth-page";
import MarketplacePage from "@/pages/marketplace";
import ClientLoginPage from "@/pages/client-login";
import AcceptInvitePage from "@/pages/accept-invite";
import ClientPortalPage from "@/pages/client-portal";
import ClientUseCaseDetailPage from "@/pages/client-use-case-detail";
import ClientAccountPage from "@/pages/client-account";
import ClientMarketplacePage from "@/pages/client-marketplace";
import AccountPage from "@/pages/account";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-3 border-b bg-background/80 backdrop-blur-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ClientAuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <ClientSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-3 border-b bg-background/80 backdrop-blur-sm">
            <SidebarTrigger data-testid="button-client-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedRoutes() {
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/marketplace" component={MarketplacePage} />
        <Route path="/use-cases/:id" component={UseCaseDetailPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/account" component={AccountPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function ClientAuthenticatedRoutes() {
  return (
    <ClientAuthenticatedLayout>
      <Switch>
        <Route path="/client-portal" component={ClientPortalPage} />
        <Route path="/client-portal/use-case/:id" component={ClientUseCaseDetailPage} />
        <Route path="/client-marketplace" component={ClientMarketplacePage} />
        <Route path="/client-account" component={ClientAccountPage} />
        <Route component={() => <Redirect to="/client-portal" />} />
      </Switch>
    </ClientAuthenticatedLayout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/client-login" component={ClientLoginPage} />
        <Route path="/accept-invite" component={AcceptInvitePage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  // Client users should only access client portal routes
  if (user.isClientUser) {
    return (
      <ClientAuthenticatedLayout>
        <Switch>
          <Route path="/client-portal" component={ClientPortalPage} />
          <Route path="/client-portal/use-case/:id" component={ClientUseCaseDetailPage} />
          <Route path="/client-marketplace" component={ClientMarketplacePage} />
          <Route path="/client-account" component={ClientAccountPage} />
          <Route component={() => <Redirect to="/client-portal" />} />
        </Switch>
      </ClientAuthenticatedLayout>
    );
  }

  // Admin/consultant users can access both admin and client routes
  return (
    <Switch>
      <Route path="/client-portal" component={() => <ClientAuthenticatedRoutes />} />
      <Route path="/client-portal/:rest*" component={() => <ClientAuthenticatedRoutes />} />
      <Route path="/client-marketplace" component={() => <ClientAuthenticatedRoutes />} />
      <Route path="/client-account" component={() => <ClientAuthenticatedRoutes />} />
      <Route component={() => <AuthenticatedRoutes />} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="usecaseos-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
