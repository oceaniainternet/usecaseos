import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { type UseCase, type Client, levelLabels } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  Shield, 
  AlertTriangle,
  User,
  Database,
  Users,
  Wrench,
  CheckCircle2,
  Info,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ValueWheel } from "@/components/ValueWheel";

const statusColors: Record<string, string> = {
  Proposed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Building: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  Live: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Optimising: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  Paused: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const riskColors: Record<string, string> = {
  None: "text-green-600 dark:text-green-400",
  Low: "text-yellow-600 dark:text-yellow-400",
  Medium: "text-orange-600 dark:text-orange-400",
  High: "text-red-600 dark:text-red-400",
};

const dataFlowLabels: Record<string, string> = {
  LocalOnly: "Local Only",
  VendorTools: "Vendor Tools",
  CloudLLM: "Cloud LLM",
};

const humanInLoopLabels: Record<string, string> = {
  Required: "Required",
  Optional: "Optional",
  None: "Not Required",
};

export default function ClientUseCaseDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: useCases, isLoading } = useQuery<UseCase[]>({
    queryKey: ["/api/client-portal/use-cases"],
  });

  const useCase = useCases?.find(uc => uc.id === id);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/client-portal/clients"],
  });

  const client = clients?.find(c => c.id === useCase?.clientId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!useCase) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-xl font-medium mb-2">Use case not found</h2>
        <p className="text-muted-foreground mb-4">The use case you're looking for doesn't exist or you don't have access.</p>
        <Button asChild>
          <Link href="/client-portal">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const baselineTimePerWeek = (useCase.baselineMinutesPerRun || 0) * (useCase.frequencyPerWeek || 0);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/client-portal">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            {client && (
              <Badge variant="outline" className="text-xs">
                {client.name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {useCase.industryVertical}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-usecase-title">{useCase.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={cn(statusColors[useCase.status || "Proposed"], "border-0")}>
              {useCase.status}
            </Badge>
            <Badge className="bg-primary/10 text-primary border-0">
              Level {useCase.level}: {levelLabels[useCase.level as 1 | 2 | 3] || "Unknown"}
            </Badge>
            {useCase.riskRating && useCase.riskRating !== "None" && (
              <Badge className={cn(riskColors[useCase.riskRating], "bg-transparent border")}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {useCase.riskRating} Risk
              </Badge>
            )}
            {useCase.piiFlag && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                <Shield className="h-3 w-3 mr-1" />
                Contains PII
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-usecase-detail">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="story" data-testid="tab-story">Story Mode</TabsTrigger>
          <TabsTrigger value="risk" data-testid="tab-risk">Risk & Trust</TabsTrigger>
          <TabsTrigger value="roi" data-testid="tab-roi">ROI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{useCase.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Level</p>
                    <p className="font-medium">Level {useCase.level}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={cn(statusColors[useCase.status || "Proposed"], "border-0")}>
                      {useCase.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{useCase.industryVertical}</p>
                  </div>
                </div>

                {useCase.goals && (useCase.goals as string[]).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Goals</p>
                    <div className="flex flex-wrap gap-1">
                      {(useCase.goals as string[]).map((goal, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {useCase.tools && (useCase.tools as string[]).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tools Used</p>
                    <div className="flex flex-wrap gap-1">
                      {(useCase.tools as string[]).map((tool, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <Wrench className="h-3 w-3 mr-1" />
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <ValueWheel useCase={useCase} />
          </div>
        </TabsContent>

        <TabsContent value="story" className="space-y-6">
          {useCase.personaStory && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Persona Story
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {useCase.personaStory.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {useCase.storyToday || "No current workflow description available."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Future Automated Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                {useCase.storyFuture ? (
                  <div className="space-y-2">
                    {useCase.storyFuture.split('\n').filter(line => line.trim()).map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground text-sm">{step.replace(/^\d+\.\s*/, '')}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No future workflow description available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Rating</p>
                    <p className={cn("font-medium", riskColors[useCase.riskRating || "None"])}>
                      {useCase.riskRating || "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contains PII</p>
                    <p className="font-medium">{useCase.piiFlag ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Flow</p>
                    <p className="font-medium">{dataFlowLabels[useCase.dataFlow || "LocalOnly"]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Human in Loop</p>
                    <p className="font-medium">{humanInLoopLabels[useCase.humanInLoop || "None"]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Controls & Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent>
                {useCase.controls && (useCase.controls as string[]).length > 0 ? (
                  <ul className="space-y-2">
                    {(useCase.controls as string[]).map((control, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{control}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No controls defined.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Baseline Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{useCase.baselineMinutesPerRun || 0} min</div>
                <p className="text-xs text-muted-foreground">per run</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{useCase.frequencyPerWeek || 0}x</div>
                <p className="text-xs text-muted-foreground">per week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Time Saved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {useCase.roiTimeSavedMinutesPerWeek || 0} min
                </div>
                <p className="text-xs text-muted-foreground">per week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Monthly Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${useCase.roiDollarsPerMonth || 0}
                </div>
                <p className="text-xs text-muted-foreground">estimated</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                ROI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Weekly Time Investment (Before)</p>
                  <p className="text-xl font-bold">{baselineTimePerWeek} minutes</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Weekly Time Saved (After)</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {useCase.roiTimeSavedMinutesPerWeek || 0} minutes
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Annual Projected Savings</p>
                <p className="text-3xl font-bold text-primary">
                  ${((useCase.roiDollarsPerMonth || 0) * 12).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
