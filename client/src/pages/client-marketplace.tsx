import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type MarketplaceUseCaseWithRating, levelLabels } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Store, 
  Star, 
  Clock, 
  DollarSign, 
  Users,
  ShieldCheck,
  Filter,
  Heart
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
          className={`${interactive ? "cursor-pointer" : "cursor-default"}`}
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
  onRate,
  isFavorite,
  onToggleFavorite,
  isTogglingFavorite
}: { 
  useCase: MarketplaceUseCaseWithRating;
  onRate: (id: string, rating: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, currentlyFavorite: boolean) => void;
  isTogglingFavorite: boolean;
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
            <Button
              variant="ghost"
              size="icon"
              className={isFavorite ? "text-red-500" : "text-muted-foreground"}
              onClick={() => onToggleFavorite(useCase.id, isFavorite)}
              disabled={isTogglingFavorite}
              data-testid={`button-favorite-${useCase.id}`}
              title={isFavorite ? "Remove from roadmap" : "Add to roadmap"}
            >
              <Heart className={isFavorite ? "fill-current" : ""} />
            </Button>
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
            L{useCase.level}: {levelLabels[useCase.level as 1 | 2 | 3]}
          </Badge>
          <Badge variant="outline" className={riskColors[useCase.riskRating]}>
            {useCase.riskRating} Risk
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
            <span className="text-xs text-muted-foreground">Your rating:</span>
            <StarRating 
              rating={useCase.averageRating} 
              userRating={useCase.userRating}
              onRate={(rating) => onRate(useCase.id, rating)} 
              interactive={true}
              size="sm"
              useCaseId={useCase.id}
            />
          </div>
          {useCase.userRating && (
            <Badge variant="secondary" className="text-xs">
              You rated: {useCase.userRating}/5
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type ClientFavorite = {
  id: string;
  marketplaceUseCaseId: string;
  userId: string;
  clientId: string;
  createdAt: string;
};

export default function ClientMarketplacePage() {
  const { toast } = useToast();
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

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

  const { data: favorites = [] } = useQuery<ClientFavorite[]>({
    queryKey: ["/api/client-favorites"],
  });

  const favoriteIds = new Set(favorites.map(f => f.marketplaceUseCaseId));

  const rateMutation = useMutation({
    mutationFn: async ({ useCaseId, rating }: { useCaseId: string; rating: number }) => {
      await apiRequest("POST", `/api/marketplace/${useCaseId}/rate`, { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      toast({
        title: "Rating saved",
        description: "Thank you for your feedback!",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save rating",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (useCaseId: string) => {
      await apiRequest("POST", `/api/marketplace/${useCaseId}/favorite`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-favorites"] });
      toast({
        title: "Added to roadmap",
        description: "Your consultant will see this as a potential next use case.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add to roadmap",
        description: "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTogglingFavoriteId(null);
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (useCaseId: string) => {
      await apiRequest("DELETE", `/api/marketplace/${useCaseId}/favorite`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-favorites"] });
      toast({
        title: "Removed from roadmap",
        description: "This use case has been removed from your roadmap.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove from roadmap",
        description: "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTogglingFavoriteId(null);
    },
  });

  const handleRate = (useCaseId: string, rating: number) => {
    rateMutation.mutate({ useCaseId, rating });
  };

  const handleToggleFavorite = (useCaseId: string, currentlyFavorite: boolean) => {
    setTogglingFavoriteId(useCaseId);
    if (currentlyFavorite) {
      removeFavoriteMutation.mutate(useCaseId);
    } else {
      addFavoriteMutation.mutate(useCaseId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-marketplace-title">
            <Store className="h-7 w-7" />
            Marketplace
          </h1>
          <p className="text-muted-foreground">
            Explore use case templates and rate them to help others
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-industry-filter">
              <SelectValue placeholder="Industry" />
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
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-scope-filter">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="1">Level 1</SelectItem>
              <SelectItem value="2">Level 2</SelectItem>
              <SelectItem value="3">Level 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {marketplaceCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground text-center">
              {industryFilter !== "all" || scopeFilter !== "all"
                ? "Try adjusting your filters to see more templates."
                : "Check back later for new use case templates."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {marketplaceCases.map((useCase) => (
            <MarketplaceCard
              key={useCase.id}
              useCase={useCase}
              onRate={handleRate}
              isFavorite={favoriteIds.has(useCase.id)}
              onToggleFavorite={handleToggleFavorite}
              isTogglingFavorite={togglingFavoriteId === useCase.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
