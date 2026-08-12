"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import TransferRecs from "@/components/TransferRecs";
import PlanEditor from "@/components/PlanEditor";
import { 
  CalendarDays, 
  TrendingUp, 
  Edit3, 
  Sparkles, 
  Target,
  LineChart,
  Zap,
  Info
} from "lucide-react";

export function PlanningDashboard() {
  const [activeView, setActiveView] = useState<"recommendations" | "manual">("recommendations");

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl border border-surface-border bg-surface-1 p-6 shadow-sm">
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-brand-cta rounded-lg shadow-sm">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    Transfer Planning
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Plan your transfers over multiple gameweeks for maximum returns
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-3">
              <div className="bg-surface-2/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-surface-border shadow-sm">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Target className="h-3 w-3" />
                  <span>Horizon</span>
                </div>
                <div className="text-lg font-bold text-violet-300">1-10 GWs</div>
              </div>
              <div className="bg-surface-2/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-surface-border shadow-sm">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Sparkles className="h-3 w-3" />
                  <span>AI Powered</span>
                </div>
                <div className="text-lg font-bold text-cyan-300">Smart Recs</div>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-4 flex items-start gap-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <Info className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <strong>Pro Tip:</strong> Use AI Recommendations for quick insights, then fine-tune with Manual Planning. 
              Consider hits vs. free transfers, chip timing, and fixture difficulty over your chosen horizon.
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 p-1 bg-surface-2 rounded-lg border border-surface-border shadow-sm">
          <button
            onClick={() => setActiveView("recommendations")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
              ${activeView === "recommendations"
                ? "bg-gradient-brand-cta text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-surface-1"
              }
            `}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Recommendations</span>
            {activeView === "recommendations" && (
              <Badge className="ml-1 bg-white/20 text-white border-white/30 text-xs">Active</Badge>
            )}
          </button>
          <button
            onClick={() => setActiveView("manual")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
              ${activeView === "manual"
                ? "bg-gradient-brand-cta text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-surface-1"
              }
            `}
          >
            <Edit3 className="h-4 w-4" />
            <span>Manual Planning</span>
            {activeView === "manual" && (
              <Badge className="ml-1 bg-white/20 text-white border-white/30 text-xs">Active</Badge>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {/* AI Recommendations View */}
        {activeView === "recommendations" && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>AI-powered analysis of optimal transfers based on expected points, hits, and constraints</span>
            </div>
            <TransferRecs />
          </div>
        )}

        {/* Manual Planning View */}
        {activeView === "manual" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Edit3 className="h-4 w-4" />
              <span>Manually plan your transfers week-by-week with full control over chips and strategy</span>
            </div>
            <PlanEditor />
          </div>
        )}
      </div>

      {/* Quick Guide Section */}
      <Card className="border-surface-border bg-surface-1">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <LineChart className="h-4 w-4 text-violet-400" />
            <h3 className="font-semibold text-sm text-white">Planning Strategy Guide</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-medium text-violet-300">Short-term (1-3 GWs)</div>
              <p className="text-slate-400">
                Focus on immediate fixtures. Take hits only if gain exceeds 4-8 points.
                Use AI recs for quick decisions.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-cyan-300">Medium-term (4-8 GWs)</div>
              <p className="text-slate-400">
                Plan around fixture swings. Build team value. Consider chip usage timing.
                Combine AI + manual planning.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-violet-300">Long-term (8+ GWs)</div>
              <p className="text-slate-400">
                Map full season strategy. Plan for DGWs/BGWs. Optimize Wildcard timing.
                Use manual planner for detailed roadmap.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
