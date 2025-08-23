"use client";

import { HeaderKpis } from "@/components/HeaderKpis";
import TransferRecs from "@/components/TransferRecs";
import PlanEditor from "@/components/PlanEditor";

export default function OptimizePage() {
  return (
    <div className="min-h-dvh">
      <HeaderKpis />
      <main className="container py-4">
        <div className="mb-3 text-lg font-semibold">Optimize</div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <TransferRecs />
          </div>
          <div className="min-w-0">
            <PlanEditor />
          </div>
        </div>
      </main>
    </div>
  );
}
