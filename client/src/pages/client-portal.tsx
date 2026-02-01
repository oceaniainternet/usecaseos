import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LayoutGrid, 
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
import { cn } from "@/lib/utils";
import type { UseCase, Client } from "@shared/schema";

type UseCaseWithClient = UseCase & { clientName?: string };

function calculateUseCaseScore(useCase: UseCase): number {
  let score = 0;

  const roi = useCase.roiDollarsPerMonth || 0;
  if (roi >= 1000) score += 30;
  else if (roi >= 500) score += 22;
  else if (roi >= 100) score += 12;
  else if (roi > 0) score += 5;

  if (useCase.level === 1) score += 20;
  else if (useCase.level === 2) score += 12;
  else if (useCase.level === 3) score += 5;

  if (useCase.riskRating === "None") score += 15;
  else if (useCase.riskRating === "Low") score += 12;
  else if (useCase.riskRating === "Medium") score += 6;
  else if (useCase.riskRating === "High") score += 2;

  const timeSaved = useCase.roiTimeSavedMinutesPerWeek || 0;
  if (timeSaved >= 120) score += 15;
  else if (timeSaved >= 60) score += 12;
  else if (timeSaved >= 30) score += 8;
  else if (timeSaved > 0) score += 4;

  const goals = (useCase.goals as string[]) || [];
  const goalCount = goals.length;
  if (goalCount >= 4) score += 20;
  else if (goalCount >= 3) score += 15;
  else if (goalCount >= 2) score += 10;
  else if (goalCount >= 1) score += 5;

  return Math.min(score, 100);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500 text-white";
  if (score >= 60) return "bg-emerald-500 text-white";
  if (score >= 40) return "bg-amber-500 text-white";
  if (score >= 20) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
}

function getScorePulseColor(score: number): string {
  if (score >= 80) return "shadow-green-500/50";
  if (score >= 60) return "shadow-emerald-500/50";
  if (score >= 40) return "shadow-amber-500/50";
  if (score >= 20) return "shadow-orange-500/50";
  return "shadow-red-500/50";
}

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
  const { data: useCases, isLoading: useCasesLoading } = useQuery<UseCaseWithClient[]>({
    queryKey: ["/api/client-portal/use-cases"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/client-portal/clients"],
  });

  const totalTimeSaved = useCases?.reduce((sum, uc) => sum + (uc.roiTimeSavedMinutesPerWeek || 0), 0) || 0;
  const totalMonthlySavings = useCases?.reduce((sum, uc) => sum + (uc.roiDollarsPerMonth || 0), 0) || 0;
  const liveCount = useCases?.filter(uc => uc.status === "Live" || uc.status === "Optimising").length || 0;

  if (useCasesLoading || clientsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-dashboard-title">
          <LayoutGrid className="h-6 w-6" />
          Dashboard
        </h1>
        {clients && clients.length > 0 && (
          <p className="text-muted-foreground flex items-center gap-1 mt-1">
            <Building className="w-4 h-4" />
            {clients.map(c => c.name).join(", ")}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Use Cases</p>
              <p className="text-2xl font-bold" data-testid="text-total-usecases">{useCases?.length || 0}</p>
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
              <p className="text-2xl font-bold" data-testid="text-time-saved">{Math.round(totalTimeSaved / 60)}h {totalTimeSaved % 60}m</p>
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
              <p className="text-2xl font-bold" data-testid="text-monthly-savings">${totalMonthlySavings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">${(totalMonthlySavings * 12).toLocaleString()}/year</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Your Use Cases</h2>
        <p className="text-sm text-muted-foreground">
          Click on a use case to view full details
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
          {useCases?.map((useCase) => {
            const score = calculateUseCaseScore(useCase);
            return (
              <Link key={useCase.id} href={`/client-portal/use-case/${useCase.id}`}>
                <Card 
                  className="hover-elevate cursor-pointer h-full relative"
                  data-testid={`card-usecase-${useCase.id}`}
                >
                  <div 
                    className={cn(
                      "absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg animate-pulse",
                      getScoreColor(score),
                      getScorePulseColor(score)
                    )}
                    data-testid={`score-${useCase.id}`}
                    title={`Score: ${score}/100`}
                  >
                    {score}
                  </div>
                  <CardHeader className="pb-3 pr-12">
                    <CardTitle className="text-base line-clamp-2">{useCase.title}</CardTitle>
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

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{useCase.roiTimeSavedMinutesPerWeek || 0} min/wk</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>${useCase.roiDollarsPerMonth || 0}/mo</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
