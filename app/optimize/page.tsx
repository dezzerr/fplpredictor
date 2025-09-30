"use client";

import { HeaderKpis } from "@/components/HeaderKpis";
import { AutoTeamOptimizer } from "@/components/AutoTeamOptimizer";
import { TeamOfTheWeek } from "@/components/TeamOfTheWeek";

export default function OptimizePage() {
  return (
    <div className="min-h-dvh">
      <HeaderKpis />
      <main className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Optimize</h1>
          <p className="text-muted-foreground">Automatically optimize your squad and discover top performers</p>
        </div>
        
        <div className="grid gap-6 xl:grid-cols-2">
          <AutoTeamOptimizer />
          <TeamOfTheWeek />
        </div>
      </main>
    </div>
  );
}
