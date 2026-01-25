import { useState } from "react";
import { Clock, DollarSign, Shield, Scale, Users, TrendingUp } from "lucide-react";
import type { UseCase } from "@shared/schema";

interface ValueNode {
  id: string;
  label: string;
  icon: typeof Clock;
  color: string;
  getValue: (useCase: UseCase) => string;
  getDetail: (useCase: UseCase) => string;
  angle: number;
}

const valueNodes: ValueNode[] = [
  {
    id: "time",
    label: "Time Savings",
    icon: Clock,
    color: "text-blue-500",
    angle: 0,
    getValue: (uc) => {
      const mins = uc.roiTimeSavedMinutesPerWeek || 0;
      if (mins >= 60) return `${Math.round(mins / 60)}h/week`;
      return `${mins}m/week`;
    },
    getDetail: (uc) => {
      const baseline = uc.baselineMinutesPerRun || 0;
      const freq = uc.frequencyPerWeek || 0;
      const saved = uc.roiTimeSavedMinutesPerWeek || 0;
      return `Baseline: ${baseline} mins/run x ${freq}/week. Automation saves ${saved} minutes weekly, freeing staff for higher-value work.`;
    },
  },
  {
    id: "cost",
    label: "Cost Reduction",
    icon: DollarSign,
    color: "text-green-500",
    angle: 60,
    getValue: (uc) => {
      const dollars = uc.roiDollarsPerMonth || 0;
      if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k/mo`;
      return `$${dollars}/mo`;
    },
    getDetail: (uc) => {
      const dollars = uc.roiDollarsPerMonth || 0;
      const yearly = dollars * 12;
      return `Monthly savings of $${dollars.toLocaleString()} translates to $${yearly.toLocaleString()} annually. Direct impact on operational costs.`;
    },
  },
  {
    id: "consistency",
    label: "Consistency",
    icon: TrendingUp,
    color: "text-purple-500",
    angle: 120,
    getValue: (uc) => {
      const level = uc.level;
      if (level === 3) return "AI-Driven";
      if (level === 2) return "Automated";
      return "Assisted";
    },
    getDetail: (uc) => {
      const level = uc.level;
      const levelDesc = level === 3 
        ? "AI-embedded automation ensures consistent decision-making within defined guardrails."
        : level === 2 
        ? "No-code automation delivers reliable, repeatable outcomes every time."
        : "Tool-assisted workflows reduce human error while maintaining oversight.";
      return levelDesc;
    },
  },
  {
    id: "risk",
    label: "Risk Mitigation",
    icon: Shield,
    color: "text-orange-500",
    angle: 180,
    getValue: (uc) => {
      const controls = (uc.controls as string[]) || [];
      return `${controls.length} Controls`;
    },
    getDetail: (uc) => {
      const controls = (uc.controls as string[]) || [];
      const risk = uc.riskRating;
      const humanLoop = uc.humanInLoop;
      return `Risk level: ${risk}. Human oversight: ${humanLoop}. ${controls.length > 0 ? `Active controls: ${controls.slice(0, 2).join(", ")}${controls.length > 2 ? "..." : ""}` : "No specific controls defined."}`;
    },
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: Scale,
    color: "text-cyan-500",
    angle: 240,
    getValue: (uc) => {
      const pii = uc.piiFlag;
      const dataFlow = uc.dataFlow;
      if (pii && dataFlow === "LocalOnly") return "PII-Safe";
      if (pii) return "PII-Aware";
      return "Standard";
    },
    getDetail: (uc) => {
      const pii = uc.piiFlag;
      const dataFlow = uc.dataFlow;
      let detail = pii ? "Handles personal data (PII). " : "No personal data involved. ";
      detail += `Data flow: ${dataFlow === "LocalOnly" ? "Local systems only" : dataFlow === "VendorTools" ? "Vendor tools integrated" : "Cloud LLM processing"}.`;
      return detail;
    },
  },
  {
    id: "scale",
    label: "Scalability",
    icon: Users,
    color: "text-pink-500",
    angle: 300,
    getValue: (uc) => {
      const freq = uc.frequencyPerWeek || 0;
      if (freq >= 20) return "High Volume";
      if (freq >= 5) return "Regular";
      return "Periodic";
    },
    getDetail: (uc) => {
      const freq = uc.frequencyPerWeek || 0;
      return `Runs ${freq}x per week. ${freq >= 20 ? "High-frequency task ideal for automation ROI." : freq >= 5 ? "Regular cadence provides steady value accumulation." : "Lower frequency but consistent value delivery."}`;
    },
  },
];

interface ValueWheelProps {
  useCase: UseCase;
}

export function ValueWheel({ useCase }: ValueWheelProps) {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const activeOrHovered = hoveredNode || activeNode;
  const activeNodeData = valueNodes.find((n) => n.id === activeOrHovered);

  const radius = 100;
  const centerX = 140;
  const centerY = 140;

  return (
    <div className="relative" data-testid="value-wheel-container">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="relative w-[280px] h-[280px] flex-shrink-0">
          <svg viewBox="0 0 280 280" className="w-full h-full">
            <circle
              cx={centerX}
              cy={centerY}
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/30"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r="35"
              fill="currentColor"
              className="text-primary/10"
            />
            <text
              x={centerX}
              y={centerY - 5}
              textAnchor="middle"
              className="fill-primary text-xs font-semibold"
            >
              VALUE
            </text>
            <text
              x={centerX}
              y={centerY + 10}
              textAnchor="middle"
              className="fill-primary text-xs font-semibold"
            >
              WHEEL
            </text>

            {valueNodes.map((node) => {
              const angleRad = (node.angle - 90) * (Math.PI / 180);
              const x = centerX + radius * Math.cos(angleRad);
              const y = centerY + radius * Math.sin(angleRad);
              const isActive = activeOrHovered === node.id;

              return (
                <g key={node.id}>
                  <line
                    x1={centerX + 45 * Math.cos(angleRad)}
                    y1={centerY + 45 * Math.sin(angleRad)}
                    x2={x - 20 * Math.cos(angleRad)}
                    y2={y - 20 * Math.sin(angleRad)}
                    stroke="currentColor"
                    strokeWidth={isActive ? 2 : 1}
                    className={isActive ? "text-primary" : "text-muted-foreground/30"}
                  />
                  <circle
                    cx={centerX + 45 * Math.cos(angleRad)}
                    cy={centerY + 45 * Math.sin(angleRad)}
                    r="4"
                    fill="currentColor"
                    className={isActive ? "text-primary" : "text-muted-foreground/50"}
                  />
                </g>
              );
            })}
          </svg>

          {valueNodes.map((node) => {
            const angleRad = (node.angle - 90) * (Math.PI / 180);
            const x = centerX + radius * Math.cos(angleRad);
            const y = centerY + radius * Math.sin(angleRad);
            const isActive = activeOrHovered === node.id;
            const Icon = node.icon;

            return (
              <button
                key={node.id}
                className={`absolute w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "border-primary bg-primary/10 scale-110 shadow-lg"
                    : "border-muted-foreground/30 bg-background hover:border-primary/50 hover:scale-105"
                }`}
                style={{
                  left: x - 24,
                  top: y - 24,
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                data-testid={`value-node-${node.id}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? node.color : "text-muted-foreground"}`} />
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          {activeOrHovered ? (
            <div 
              className="p-4 rounded-lg border bg-card transition-all duration-200"
              data-testid="value-detail-panel"
            >
              <div className="flex items-center gap-3 mb-3">
                {activeNodeData && (
                  <>
                    <div className={`p-2 rounded-lg bg-muted`}>
                      <activeNodeData.icon className={`w-5 h-5 ${activeNodeData.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold">{activeNodeData.label}</h4>
                      <p className={`text-lg font-bold ${activeNodeData.color}`}>
                        {activeNodeData.getValue(useCase)}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {activeNodeData && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeNodeData.getDetail(useCase)}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground">
                Hover over or click a value node to see how this use case drives business outcomes
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {valueNodes.map((node) => {
              const Icon = node.icon;
              const isActive = activeOrHovered === node.id;
              return (
                <button
                  key={node.id}
                  className={`flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                  data-testid={`value-label-${node.id}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? node.color : ""}`} />
                  <span className="truncate">{node.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
