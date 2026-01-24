import { type UseCase, levelLabels } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  DollarSign, 
  Shield, 
  AlertTriangle,
  User,
  GripVertical
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function calculateUseCaseScore(useCase: UseCase): number {
  let score = 0;

  // ROI/Savings Score (0-30 points)
  const roi = useCase.roiDollarsPerMonth || 0;
  if (roi >= 1000) score += 30;
  else if (roi >= 500) score += 22;
  else if (roi >= 100) score += 12;
  else if (roi > 0) score += 5;

  // Ease of Implementation (0-20 points) - Lower level = easier
  if (useCase.level === 1) score += 20;
  else if (useCase.level === 2) score += 12;
  else if (useCase.level === 3) score += 5;

  // Risk Score (0-15 points) - Lower risk = higher score
  if (useCase.riskRating === "None") score += 15;
  else if (useCase.riskRating === "Low") score += 12;
  else if (useCase.riskRating === "Medium") score += 6;
  else if (useCase.riskRating === "High") score += 2;

  // Time Savings Score (0-15 points)
  const timeSaved = useCase.roiTimeSavedMinutesPerWeek || 0;
  if (timeSaved >= 120) score += 15;
  else if (timeSaved >= 60) score += 12;
  else if (timeSaved >= 30) score += 8;
  else if (timeSaved > 0) score += 4;

  // Goals Score (0-20 points) - More goals = more comprehensive use case
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

function getScoreRingColor(score: number): string {
  if (score >= 80) return "ring-green-500/30";
  if (score >= 60) return "ring-emerald-500/30";
  if (score >= 40) return "ring-amber-500/30";
  if (score >= 20) return "ring-orange-500/30";
  return "ring-red-500/30";
}

interface UseCaseCardProps {
  useCase: UseCase;
  rank?: number;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const statusColors: Record<string, string> = {
  Proposed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Building: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  Live: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Optimising: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  Paused: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const riskColors: Record<string, string> = {
  None: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Low: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  Medium: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  High: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const levelColors: Record<number, string> = {
  1: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  2: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  3: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

export function UseCaseCard({ useCase, rank, isDragging, dragHandleProps }: UseCaseCardProps) {
  const timeSavedPerWeek = useCase.roiTimeSavedMinutesPerWeek || 0;
  const dollarsPerMonth = useCase.roiDollarsPerMonth || 0;
  const score = calculateUseCaseScore(useCase);

  return (
    <Card 
      className={cn(
        "hover-elevate transition-all cursor-pointer group relative",
        isDragging && "ring-2 ring-primary shadow-lg"
      )}
    >
      <div 
        className={cn(
          "absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ring-4",
          getScoreColor(score),
          getScoreRingColor(score)
        )}
        data-testid={`score-${useCase.id}`}
        title={`Score: ${score}/100 - Based on ROI, ease of implementation, risk level, and time savings`}
      >
        {score}
      </div>
      <Link href={`/use-cases/${useCase.id}`}>
        <CardHeader className="pb-3 flex flex-row items-start gap-3 pr-12">
          {dragHandleProps && (
            <div 
              {...dragHandleProps}
              className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {rank !== undefined && (
                  <span className="text-xs font-medium text-muted-foreground mb-1 block">
                    #{rank}
                  </span>
                )}
                <h3 className="font-medium text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors" data-testid={`text-usecase-title-${useCase.id}`}>
                  {useCase.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {useCase.department}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge 
              variant="secondary" 
              className={cn("text-xs font-normal", levelColors[useCase.level])}
              data-testid={`badge-level-${useCase.id}`}
            >
              L{useCase.level}
            </Badge>
            <Badge 
              variant="secondary" 
              className={cn("text-xs font-normal", statusColors[useCase.status])}
              data-testid={`badge-status-${useCase.id}`}
            >
              {useCase.status}
            </Badge>
            <Badge 
              variant="secondary" 
              className={cn("text-xs font-normal", riskColors[useCase.riskRating])}
              data-testid={`badge-risk-${useCase.id}`}
            >
              {useCase.riskRating === "None" ? "No Risk" : `${useCase.riskRating} Risk`}
            </Badge>
            {useCase.piiFlag && (
              <Badge variant="secondary" className="text-xs font-normal bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" data-testid={`badge-pii-${useCase.id}`}>
                <User className="h-3 w-3 mr-1" />
                PII
              </Badge>
            )}
          </div>

          {/* ROI Summary */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span data-testid={`text-time-saved-${useCase.id}`}>{timeSavedPerWeek} min/wk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              <span data-testid={`text-roi-${useCase.id}`}>${dollarsPerMonth}/mo</span>
            </div>
          </div>

          {/* Tools */}
          {useCase.tools && (useCase.tools as string[]).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(useCase.tools as string[]).slice(0, 3).map((tool, i) => (
                <span 
                  key={i} 
                  className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                >
                  {tool}
                </span>
              ))}
              {(useCase.tools as string[]).length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{(useCase.tools as string[]).length - 3} more
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
