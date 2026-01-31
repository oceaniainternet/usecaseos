import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { type UseCase, type Client } from "@shared/schema";
import { UseCaseCard } from "@/components/use-case-card";
import { DashboardFiltersBar, type DashboardFilters } from "@/components/dashboard-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Clock, 
  DollarSign,
  FileX
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = !!(user && !user.isClientUser);
  
  const [filters, setFilters] = useState<DashboardFilters>({
    level: "All",
    status: "All",
    riskRating: "All",
    piiOnly: false,
    clientId: "All",
  });

  const { data: useCases = [], isLoading } = useQuery<UseCase[]>({
    queryKey: ["/api/use-cases"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAdmin,
  });

  // Apply filters
  const filteredUseCases = useCases.filter((uc) => {
    if (filters.clientId !== "All" && uc.clientId !== filters.clientId) return false;
    if (filters.level !== "All" && uc.level !== parseInt(filters.level)) return false;
    if (filters.status !== "All" && uc.status !== filters.status) return false;
    if (filters.riskRating !== "All" && uc.riskRating !== filters.riskRating) return false;
    if (filters.piiOnly && !uc.piiFlag) return false;
    return true;
  });

  // Sort by priority order
  const sortedUseCases = [...filteredUseCases].sort((a, b) => a.priorityOrder - b.priorityOrder);

  // Calculate stats
  const totalTimeSaved = useCases.reduce((sum, uc) => sum + (uc.roiTimeSavedMinutesPerWeek || 0), 0);
  const totalROI = useCases.reduce((sum, uc) => sum + (uc.roiDollarsPerMonth || 0), 0);
  const liveCount = useCases.filter((uc) => uc.status === "Live").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and track your use case story cards
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Use Cases"
          value={useCases.length.toString()}
          icon={<LayoutDashboard className="h-4 w-4" />}
          loading={isLoading}
        />
        <StatsCard
          title="Live"
          value={liveCount.toString()}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-green-600 dark:text-green-400"
        />
        <StatsCard
          title="Time Saved"
          value={`${Math.round(totalTimeSaved / 60)} hrs/wk`}
          icon={<Clock className="h-4 w-4" />}
          loading={isLoading}
        />
        <StatsCard
          title="Monthly ROI"
          value={`$${totalROI.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-green-600 dark:text-green-400"
        />
      </div>

      {/* Filters */}
      <DashboardFiltersBar 
        filters={filters} 
        onFiltersChange={setFilters} 
        clients={clients}
        showClientFilter={isAdmin}
      />

      {/* Use Cases Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedUseCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileX className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-2" data-testid="text-empty-state">No use cases found</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {useCases.length === 0
                ? "Get started by creating your first use case story card."
                : "Try adjusting your filters to see more results."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedUseCases.map((useCase, index) => (
            <UseCaseCard
              key={useCase.id}
              useCase={useCase}
              rank={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  loading,
  valueClassName,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16 mt-1" />
        ) : (
          <p className={`text-2xl font-semibold mt-1 ${valueClassName || ""}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
