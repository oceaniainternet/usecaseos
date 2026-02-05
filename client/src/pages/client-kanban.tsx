import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Clock, DollarSign, MessageSquare, AlertTriangle, Shield, CheckCircle, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseCase } from "@shared/schema";

const KANBAN_COLUMNS = [
  { id: "Proposed", title: "Proposed", color: "bg-slate-500" },
  { id: "Approved", title: "Approved", color: "bg-blue-500" },
  { id: "Building", title: "Building", color: "bg-amber-500" },
  { id: "Live", title: "Live", color: "bg-emerald-500" },
  { id: "Optimising", title: "Optimising", color: "bg-purple-500" },
  { id: "Paused", title: "Paused", color: "bg-gray-400" },
];

function getLevelBadge(level: number | null) {
  if (!level) return null;
  const labels: Record<number, { label: string; color: string }> = {
    1: { label: "Level 1", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    2: { label: "Level 2", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    3: { label: "Level 3", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  };
  const config = labels[level];
  return config ? (
    <Badge className={cn("text-xs", config.color)}>{config.label}</Badge>
  ) : null;
}

function getRiskBadge(risk: string | null) {
  if (!risk || risk === "None") return null;
  const colors: Record<string, string> = {
    Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    High: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <Badge className={cn("text-xs", colors[risk] || "")}>
      <AlertTriangle className="h-3 w-3 mr-1" />
      {risk}
    </Badge>
  );
}

function getApprovalIcon(status: string | null) {
  switch (status) {
    case "Approved":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "NeedsDiscussion":
      return <HelpCircle className="h-4 w-4 text-amber-500" />;
    case "NotNow":
      return <XCircle className="h-4 w-4 text-gray-400" />;
    default:
      return null;
  }
}

function calculateScore(useCase: UseCase): number {
  let score = 0;
  const monthly = useCase.roiDollarsPerMonth || 0;
  if (monthly >= 1000) score += 30;
  else if (monthly >= 500) score += 22;
  else if (monthly >= 100) score += 12;
  
  const level = useCase.level || 3;
  if (level === 1) score += 20;
  else if (level === 2) score += 12;
  else score += 5;
  
  const risk = useCase.riskRating || "High";
  if (risk === "None") score += 15;
  else if (risk === "Low") score += 12;
  else if (risk === "Medium") score += 6;
  else score += 2;
  
  const timeSaved = useCase.roiTimeSavedMinutesPerWeek || 0;
  if (timeSaved >= 120) score += 15;
  else if (timeSaved >= 60) score += 12;
  else if (timeSaved >= 30) score += 8;
  
  const goalsCount = useCase.goals?.length || 0;
  if (goalsCount >= 4) score += 20;
  else if (goalsCount >= 3) score += 15;
  else if (goalsCount >= 2) score += 10;
  else if (goalsCount >= 1) score += 5;
  
  return Math.min(100, score);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500 text-white";
  if (score >= 60) return "bg-emerald-500 text-white";
  if (score >= 40) return "bg-amber-500 text-white";
  if (score >= 20) return "bg-orange-500 text-white";
  return "bg-red-500 text-white";
}

interface KanbanCardProps {
  useCase: UseCase;
  index: number;
}

function KanbanCard({ useCase, index }: KanbanCardProps) {
  const score = calculateScore(useCase);
  
  return (
    <Draggable draggableId={useCase.id} index={index}>
      {(provided, snapshot) => (
        <Link href={`/client-portal/use-case/${useCase.id}`}>
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "mb-2 cursor-pointer transition-shadow",
              snapshot.isDragging && "shadow-lg"
            )}
          >
            <Card 
              className={cn(
                "hover-elevate relative",
                snapshot.isDragging && "ring-2 ring-primary"
              )}
              data-testid={`kanban-card-${useCase.id}`}
            >
              <div 
                className={cn(
                  "absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md",
                  getScoreColor(score)
                )}
                title={`Score: ${score}/100`}
              >
                {score}
              </div>
              <CardHeader className="p-3 pb-1 pr-10">
                <CardTitle className="text-sm font-medium line-clamp-2">
                  {useCase.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="flex flex-wrap gap-1 mb-2">
                  {getLevelBadge(useCase.level)}
                  {getRiskBadge(useCase.riskRating)}
                  {useCase.piiFlag && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      PII
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{useCase.roiTimeSavedMinutesPerWeek || 0}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>${useCase.roiDollarsPerMonth || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getApprovalIcon(useCase.clientApprovalStatus)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Link>
      )}
    </Draggable>
  );
}

interface KanbanColumnProps {
  column: typeof KANBAN_COLUMNS[0];
  useCases: UseCase[];
}

function KanbanColumn({ column, useCases }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("w-3 h-3 rounded-full", column.color)} />
        <h3 className="font-semibold text-sm">{column.title}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          {useCases.length}
        </Badge>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "min-h-[400px] p-2 rounded-lg transition-colors",
              snapshot.isDraggingOver 
                ? "bg-primary/10 border-2 border-dashed border-primary" 
                : "bg-muted/50 border-2 border-transparent"
            )}
            data-testid={`kanban-column-${column.id}`}
          >
            {useCases.map((useCase, index) => (
              <KanbanCard key={useCase.id} useCase={useCase} index={index} />
            ))}
            {provided.placeholder}
            {useCases.length === 0 && !snapshot.isDraggingOver && (
              <div className="text-center text-muted-foreground text-sm py-8">
                No use cases
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function ClientKanban() {
  const { toast } = useToast();
  
  const { data: useCases, isLoading } = useQuery<UseCase[]>({
    queryKey: ["/api/client-portal/use-cases"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/client-portal/use-cases/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/use-cases"] });
      toast({
        title: "Status updated",
        description: "Use case moved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/use-cases"] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    if (destination.droppableId !== source.droppableId) {
      updateStatusMutation.mutate({
        id: draggableId,
        status: destination.droppableId,
      });
    }
  };

  const useCasesByStatus = KANBAN_COLUMNS.reduce((acc, column) => {
    acc[column.id] = useCases?.filter(uc => uc.status === column.id) || [];
    return acc;
  }, {} as Record<string, UseCase[]>);

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex gap-4 overflow-x-auto">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-72">
              <Skeleton className="h-6 w-24 mb-3" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Kanban Board
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drag use cases between columns to update their status
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              useCases={useCasesByStatus[column.id]}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
