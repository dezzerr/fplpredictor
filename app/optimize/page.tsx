"use client";

import { useState, useMemo } from "react";
import { HeaderKpis } from "@/components/HeaderKpis";
import { AutoTeamOptimizer } from "@/components/AutoTeamOptimizer";
import { TeamOfTheWeek } from "@/components/TeamOfTheWeek";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp } from "lucide-react";
import { useSquadStore } from "@/store/squad";
import { pickXIForWeek } from "@/lib/optimizer";

export default function OptimizePage() {
  const [gwOffset, setGwOffset] = useState<number>(0);
  const squad = useSquadStore((s) => s.squad);
  
  // Calculate predicted points for the selected gameweek
  const weekPredPts = useMemo(() => {
    const optimized = pickXIForWeek(squad, gwOffset);
    return optimized.points;
  }, [squad, gwOffset]);

  return (
    <div className="min-h-dvh">
      <ErrorBoundary compact name="HeaderKpis">
        <HeaderKpis onGwChange={setGwOffset} weekPredPts={weekPredPts} />
      </ErrorBoundary>
      <main className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Optimize Your Squad</h1>
          <p className="text-muted-foreground">Optimize your squad and discover market leaders</p>
        </div>
        
        <Tabs defaultValue="my-squad" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="my-squad" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">My Squad</span>
              <span className="sm:hidden">Squad</span>
            </TabsTrigger>
            <TabsTrigger value="market-leaders" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Market Leaders</span>
              <span className="sm:hidden">Leaders</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-squad" className="mt-6">
            <ErrorBoundary compact name="AutoTeamOptimizer">
              <AutoTeamOptimizer gwOffset={gwOffset} />
            </ErrorBoundary>
          </TabsContent>
          
          <TabsContent value="market-leaders" className="mt-6">
            <ErrorBoundary compact name="TeamOfTheWeek">
              <TeamOfTheWeek gwOffset={gwOffset} />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
