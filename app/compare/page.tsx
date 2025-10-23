"use client";

import { HeaderKpis } from "@/components/HeaderKpis";
import { PlayerComparison } from "@/components/PlayerComparison";

export default function ComparePage() {
  return (
    <div className="min-h-dvh">
      <HeaderKpis />
      <main className="container py-6">
        <PlayerComparison />
      </main>
    </div>
  );
}
