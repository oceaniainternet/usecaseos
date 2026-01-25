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

export default function UseCaseDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: useCase, isLoading } = useQuery<UseCase>({
    queryKey: ["/api/use-cases", id],
    enabled: !!id,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", useCase?.clientId],
    enabled: !!useCase?.clientId,
  });

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
        <p className="text-muted-foreground mb-4">The use case you're looking for doesn't exist.</p>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const baselineTimePerWeek = (useCase.baselineMinutesPerRun || 0) * (useCase.frequencyPerWeek || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-usecase-detail-title">
              {useCase.title}
            </h1>
            <Badge className={cn("font-normal", statusColors[useCase.status])} data-testid="badge-detail-status">
              {useCase.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{client?.name || "Loading..."}</span>
            <span className="text-border">|</span>
            <span>{useCase.department}</span>
            <span className="text-border">|</span>
            <span>{useCase.industryVertical}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="overview" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            data-testid="tab-overview"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="story" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            data-testid="tab-story"
          >
            Story Mode
          </TabsTrigger>
          <TabsTrigger 
            value="risk" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            data-testid="tab-risk"
          >
            Risk & Trust
          </TabsTrigger>
          <TabsTrigger 
            value="roi" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            data-testid="tab-roi"
          >
            ROI
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Level</p>
                    <p className="font-medium" data-testid="text-detail-level">Level {useCase.level}</p>
                    <p className="text-xs text-muted-foreground">{levelLabels[useCase.level]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{useCase.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{useCase.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{useCase.industryVertical}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                {useCase.tools && (useCase.tools as string[]).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(useCase.tools as string[]).map((tool, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tools specified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Value Wheel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Business Value
              </CardTitle>
              <p className="text-sm text-muted-foreground">See how this use case drives outcomes across key value areas</p>
            </CardHeader>
            <CardContent>
              <ValueWheel useCase={useCase} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Story Mode Tab */}
        <TabsContent value="story" className="space-y-6 mt-6">
          {/* Persona Story - Full Width Featured Card */}
          {useCase.personaStory && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  The Story
                </CardTitle>
                <p className="text-sm text-muted-foreground">A real-world narrative for your {useCase.industryVertical} practice</p>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-persona-story">
                  {useCase.personaStory.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed mb-4 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Today (Current Workflow)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-story-today">
                  {useCase.storyToday || "No current workflow documented."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Future (Automated Workflow)</CardTitle>
              </CardHeader>
              <CardContent>
                {useCase.storyFuture ? (
                  <div className="space-y-2" data-testid="text-story-future">
                    {useCase.storyFuture.split("\n").filter(Boolean).map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                          {i + 1}
                        </span>
                        <p className="text-sm leading-relaxed pt-0.5">{step.replace(/^\d+\.\s*/, "")}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No future workflow documented.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk & Trust Tab */}
        <TabsContent value="risk" className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Rating</p>
                    <p className={cn("font-medium", riskColors[useCase.riskRating])} data-testid="text-detail-risk">
                      {useCase.riskRating}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PII Data</p>
                    <div className="flex items-center gap-1.5">
                      {useCase.piiFlag ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="font-medium text-amber-600 dark:text-amber-400" data-testid="text-detail-pii">Yes - Contains PII</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-600 dark:text-green-400">No PII</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Flow</p>
                    <div className="flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{dataFlowLabels[useCase.dataFlow]}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Human in Loop</p>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{humanInLoopLabels[useCase.humanInLoop]}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Controls & Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent>
                {useCase.controls && (useCase.controls as string[]).length > 0 ? (
                  <ul className="space-y-2" data-testid="list-controls">
                    {(useCase.controls as string[]).map((control, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{control}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No controls specified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Healthcare Disclaimer */}
          {useCase.industryVertical?.toLowerCase().includes("podiatry") || 
           useCase.industryVertical?.toLowerCase().includes("health") ? (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Healthcare Disclaimer:</strong> This use case is for workflow optimization only. 
                  It does not provide medical advice, diagnosis, or treatment. All clinical decisions 
                  require appropriate human oversight and professional medical judgment.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* ROI Tab */}
        <TabsContent value="roi" className="space-y-6 mt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Baseline Time/Week</p>
                    <p className="text-2xl font-semibold" data-testid="text-baseline-time">{baselineTimePerWeek} min</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {useCase.baselineMinutesPerRun || 0} min/run × {useCase.frequencyPerWeek || 0} runs/week
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved/Week</p>
                    <p className="text-2xl font-semibold text-green-600 dark:text-green-400" data-testid="text-time-saved">
                      {useCase.roiTimeSavedMinutesPerWeek || 0} min
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Automated savings per week
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Value/Month</p>
                    <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400" data-testid="text-monthly-value">
                      ${(useCase.roiDollarsPerMonth || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Monthly dollar impact
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
