import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutGrid, 
  LogOut, 
  Building, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2,
  Pause,
  Wrench,
  Lightbulb,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UseCase, Client } from "@shared/schema";

type UseCaseWithClient = UseCase & { clientName?: string };

function getLevelBadge(level: number | null) {
  if (!level) return null;
  const colors = {
    1: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    2: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    3: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  };
  const labels = {
    1: "Level 1 - Tool Assisted",
    2: "Level 2 - No-code Automation",
    3: "Level 3 - AI Embedded",
  };
  return (
    <Badge className={`${colors[level as 1 | 2 | 3]} border-0`}>
      {labels[level as 1 | 2 | 3]}
    </Badge>
  );
}

function getStatusBadge(status: string | null) {
  if (!status) return null;
  const configs: Record<string, { icon: any; color: string }> = {
    "Proposed": { icon: Lightbulb, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    "Approved": { icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    "Building": { icon: Wrench, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    "Live": { icon: Sparkles, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    "Optimising": { icon: Sparkles, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
    "Paused": { icon: Pause, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  };
  const config = configs[status] || configs["Proposed"];
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

function getRiskBadge(risk: string | null) {
  if (!risk || risk === "None") return null;
  const colors: Record<string, string> = {
    "Low": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "Medium": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    "High": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <Badge className={`${colors[risk] || colors["Low"]} border-0`}>
      <AlertTriangle className="w-3 h-3 mr-1" />
      {risk} Risk
    </Badge>
  );
}

export default function ClientPortalPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: useCases, isLoading: useCasesLoading } = useQuery<UseCaseWithClient[]>({
    queryKey: ["/api/client-portal/use-cases"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/client-portal/clients"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/client-login");
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const totalTimeSaved = useCases?.reduce((sum, uc) => sum + (uc.roiTimeSavedMinutesPerWeek || 0), 0) || 0;
  const totalMonthlySavings = useCases?.reduce((sum, uc) => sum + (uc.roiDollarsPerMonth || 0), 0) || 0;
  const liveCount = useCases?.filter(uc => uc.status === "Live" || uc.status === "Optimising").length || 0;

  if (useCasesLoading || clientsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Client Portal</h1>
            {clients && clients.length > 0 && (
              <Badge variant="outline" className="hidden sm:flex">
                <Building className="w-3 h-3 mr-1" />
                {clients.map(c => c.name).join(", ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => logoutMutation.mutate()}
              data-testid="button-client-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <LayoutGrid className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Use Cases</p>
                <p className="text-2xl font-bold">{useCases?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{liveCount} Live</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Saved Weekly</p>
                <p className="text-2xl font-bold">{Math.round(totalTimeSaved / 60)}h {totalTimeSaved % 60}m</p>
                <p className="text-xs text-muted-foreground">{totalTimeSaved} minutes</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Savings</p>
                <p className="text-2xl font-bold">${totalMonthlySavings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">${(totalMonthlySavings * 12).toLocaleString()}/year</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Your Use Cases</h2>
          <p className="text-sm text-muted-foreground">
            Track the progress of automation initiatives for your organization
          </p>
        </div>

        {useCases && useCases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Use Cases Yet</h3>
              <p className="text-muted-foreground text-center">
                Your consultant hasn't added any use cases for your organization yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {useCases?.map((useCase) => (
              <Card 
                key={useCase.id} 
                className="hover-elevate cursor-pointer"
                data-testid={`card-usecase-${useCase.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{useCase.title}</CardTitle>
                    {useCase.roiDollarsPerMonth && useCase.roiDollarsPerMonth > 0 && (
                      <Badge variant="secondary" className="shrink-0">
                        ${useCase.roiDollarsPerMonth}/mo
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-1">
                    {useCase.department || useCase.clientName || "General"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {getLevelBadge(useCase.level)}
                    {getStatusBadge(useCase.status)}
                    {getRiskBadge(useCase.riskRating)}
                  </div>
                  
                  {useCase.personaStory && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {useCase.personaStory}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">
                      {useCase.roiTimeSavedMinutesPerWeek 
                        ? `${useCase.roiTimeSavedMinutesPerWeek} min/week saved`
                        : "ROI not calculated"
                      }
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
