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
      <div className="relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6 shadow-sm">
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
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
              <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-200/50 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Target className="h-3 w-3" />
                  <span>Horizon</span>
                </div>
                <div className="text-lg font-bold text-purple-700">1-10 GWs</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-indigo-200/50 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Sparkles className="h-3 w-3" />
                  <span>AI Powered</span>
                </div>
                <div className="text-lg font-bold text-indigo-700">Smart Recs</div>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50/80 border border-blue-200/50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <strong>Pro Tip:</strong> Use AI Recommendations for quick insights, then fine-tune with Manual Planning. 
              Consider hits vs. free transfers, chip timing, and fixture difficulty over your chosen horizon.
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-300/20 to-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-300/20 to-purple-300/20 rounded-full blur-3xl" />
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 p-1 bg-gray-100 rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveView("recommendations")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200
              ${activeView === "recommendations"
                ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
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
                ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
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
      <Card className="border-purple-200/50 bg-gradient-to-br from-purple-50/30 to-indigo-50/30">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <LineChart className="h-4 w-4 text-purple-600" />
            <h3 className="font-semibold text-sm">Planning Strategy Guide</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-medium text-purple-700">Short-term (1-3 GWs)</div>
              <p className="text-muted-foreground">
                Focus on immediate fixtures. Take hits only if gain exceeds 4-8 points. 
                Use AI recs for quick decisions.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-indigo-700">Medium-term (4-8 GWs)</div>
              <p className="text-muted-foreground">
                Plan around fixture swings. Build team value. Consider chip usage timing. 
                Combine AI + manual planning.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-blue-700">Long-term (8+ GWs)</div>
              <p className="text-muted-foreground">
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
