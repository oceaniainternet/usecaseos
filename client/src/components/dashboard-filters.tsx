import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export interface DashboardFilters {
  level: string;
  status: string;
  riskRating: string;
  piiOnly: boolean;
}

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}

const statusOptions = ["All", "Proposed", "Approved", "Building", "Live", "Optimising", "Paused"];
const riskOptions = ["All", "None", "Low", "Medium", "High"];
const levelOptions = ["All", "1", "2", "3"];

export function DashboardFiltersBar({ filters, onFiltersChange }: DashboardFiltersProps) {
  const activeFilterCount = [
    filters.level !== "All" ? 1 : 0,
    filters.status !== "All" ? 1 : 0,
    filters.riskRating !== "All" ? 1 : 0,
    filters.piiOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    onFiltersChange({
      level: "All",
      status: "All",
      riskRating: "All",
      piiOnly: false,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Label htmlFor="level-filter" className="text-sm font-medium whitespace-nowrap">Level</Label>
        <Select
          value={filters.level}
          onValueChange={(value) => onFiltersChange({ ...filters, level: value })}
        >
          <SelectTrigger id="level-filter" className="w-24" data-testid="select-level-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levelOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === "All" ? "All" : `Level ${opt}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">Status</Label>
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger id="status-filter" className="w-32" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="risk-filter" className="text-sm font-medium whitespace-nowrap">Risk</Label>
        <Select
          value={filters.riskRating}
          onValueChange={(value) => onFiltersChange({ ...filters, riskRating: value })}
        >
          <SelectTrigger id="risk-filter" className="w-28" data-testid="select-risk-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {riskOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="pii-filter"
          checked={filters.piiOnly}
          onCheckedChange={(checked) => onFiltersChange({ ...filters, piiOnly: checked })}
          data-testid="switch-pii-filter"
        />
        <Label htmlFor="pii-filter" className="text-sm font-medium cursor-pointer">PII Only</Label>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto" data-testid="button-clear-filters">
          <X className="h-4 w-4 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
