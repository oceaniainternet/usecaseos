import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type MarketplaceUseCaseWithRating, type Client, levelLabels } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Store, 
  Star, 
  Copy, 
  Clock, 
  DollarSign, 
  Users,
  ShieldCheck,
  AlertTriangle,
  Filter
} from "lucide-react";

function StarRating({ 
  rating, 
  userRating, 
  onRate, 
  interactive = false,
  size = "sm",
  useCaseId
}: { 
  rating: number; 
  userRating?: number;
  onRate?: (rating: number) => void;
  interactive?: boolean;
  size?: "sm" | "lg";
  useCaseId?: string;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || (interactive ? (userRating || 0) : rating);
  const starSize = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  const testIdPrefix = useCaseId ? `star-${useCaseId}` : "star";
  
  return (
    <div 
      className="flex items-center gap-0.5"
      onMouseLeave={() => interactive && setHoverRating(0)}
      data-testid={useCaseId ? `star-rating-${useCaseId}` : undefined}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onClick={() => interactive && onRate?.(star)}
          data-testid={`${testIdPrefix}-${star}`}
        >
          <Star
            className={`${starSize} ${
              star <= displayRating
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function MarketplaceCard({ 
  useCase, 
  onClone, 
  onRate 
}: { 
  useCase: MarketplaceUseCaseWithRating;
  onClone: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}) {
  const riskColors: Record<string, string> = {
    None: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    Low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    High: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  const levelColors: Record<number, string> = {
    1: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    2: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    3: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  };

  return (
    <Card className="hover-elevate" data-testid={`card-marketplace-${useCase.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium line-clamp-2" data-testid={`text-title-${useCase.id}`}>
              {useCase.title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {useCase.description}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <StarRating rating={useCase.averageRating} userRating={useCase.userRating} useCaseId={`display-${useCase.id}`} />
              <span className="text-xs text-muted-foreground" data-testid={`text-rating-count-${useCase.id}`}>({useCase.ratingCount})</span>
            </div>
            {useCase.cloneCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-clone-count-${useCase.id}`}>
                <Users className="h-3 w-3" />
                {useCase.cloneCount} uses
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={levelColors[useCase.level]}>
            L{useCase.level}
          </Badge>
          <Badge variant="outline" className={riskColors[useCase.riskRating]}>
            {useCase.riskRating}
          </Badge>
          <Badge variant="outline">
            {useCase.industryVertical}
          </Badge>
          {useCase.piiFlag && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <ShieldCheck className="h-3 w-3 mr-1" />
              PII
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{useCase.roiTimeSavedMinutesPerWeek || 0}m/wk saved</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>${useCase.roiDollarsPerMonth || 0}/mo</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rate:</span>
            <StarRating 
              rating={useCase.averageRating} 
              userRating={useCase.userRating}
              onRate={(rating) => onRate(useCase.id, rating)} 
              interactive={true}
              size="sm"
              useCaseId={useCase.id}
            />
          </div>
          <Button 
            size="sm" 
            onClick={() => onClone(useCase.id)}
            data-testid={`button-clone-${useCase.id}`}
          >
            <Copy className="h-4 w-4 mr-1" />
            Add to My Cases
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const { toast } = useToast();
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: marketplaceCases = [], isLoading } = useQuery<MarketplaceUseCaseWithRating[]>({
    queryKey: ["/api/marketplace", industryFilter, scopeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace?industry=${industryFilter}&scope=${scopeFilter}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch marketplace");
      }
      return res.json();
    },
  });

  const { data: industries = [] } = useQuery<string[]>({
    queryKey: ["/api/marketplace/industries"],
  });

  const { data: scopes = [] } = useQuery<string[]>({
    queryKey: ["/api/marketplace/scopes"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const cloneMutation = useMutation({
    mutationFn: async ({ useCaseId, clientId }: { useCaseId: string; clientId: string }) => {
      const response = await apiRequest("POST", `/api/marketplace/${useCaseId}/clone`, { clientId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Use case added",
        description: "The use case has been added to your dashboard and is ready to customize.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/use-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      setCloneDialogOpen(false);
      setSelectedUseCaseId(null);
      setSelectedClientId(null);
    },
    onError: () => {
      toast({
        title: "Failed to add use case",
        description: "There was an error cloning this use case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async ({ useCaseId, rating }: { useCaseId: string; rating: number }) => {
      const response = await apiRequest("POST", `/api/marketplace/${useCaseId}/rate`, { rating });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      toast({
        title: "Rating saved",
        description: "Thank you for rating this use case!",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save rating",
        variant: "destructive",
      });
    },
  });

  const handleClone = (useCaseId: string) => {
    if (clients.length === 0) {
      toast({
        title: "No clients available",
        description: "Please create a client first in the Admin Panel.",
        variant: "destructive",
      });
      return;
    }
    
    if (clients.length === 1) {
      cloneMutation.mutate({ useCaseId, clientId: clients[0].id });
    } else {
      setSelectedUseCaseId(useCaseId);
      setCloneDialogOpen(true);
    }
  };

  const handleConfirmClone = () => {
    if (selectedUseCaseId && selectedClientId) {
      cloneMutation.mutate({ useCaseId: selectedUseCaseId, clientId: selectedClientId });
    }
  };

  const handleRate = (useCaseId: string, rating: number) => {
    rateMutation.mutate({ useCaseId, rating });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2" data-testid="text-marketplace-title">
          <Store className="h-6 w-6" />
          Marketplace
        </h1>
        <p className="text-muted-foreground">
          Discover proven use case templates and add them to your dashboard
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Industry:</span>
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-48" data-testid="select-industry-filter">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Scope:</span>
        </div>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-48" data-testid="select-scope-filter">
            <SelectValue placeholder="All Scopes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            {scopes.map((scope) => (
              <SelectItem key={scope} value={scope}>
                {scope}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {marketplaceCases.length} use case{marketplaceCases.length !== 1 ? "s" : ""} available
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : marketplaceCases.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Store className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-medium">No use cases available</h3>
              <p className="text-muted-foreground">
                {industryFilter !== "all" 
                  ? "Try selecting a different industry filter."
                  : "Check back later for new use case templates."}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-marketplace-cards">
          {marketplaceCases.map((useCase) => (
            <MarketplaceCard 
              key={useCase.id} 
              useCase={useCase} 
              onClone={handleClone}
              onRate={handleRate}
            />
          ))}
        </div>
      )}

      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Client</DialogTitle>
            <DialogDescription>
              Choose which client account to add this use case to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedClientId || ""} onValueChange={setSelectedClientId}>
              <SelectTrigger data-testid="select-clone-client">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.industryVertical})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmClone} 
              disabled={!selectedClientId || cloneMutation.isPending}
              data-testid="button-confirm-clone"
            >
              {cloneMutation.isPending ? "Adding..." : "Add to My Cases"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
