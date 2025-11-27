"use client";

import { HeaderKpis } from "@/components/HeaderKpis";
import { PlayerComparison } from "@/components/PlayerComparison";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function ComparePage() {
  return (
    <div className="min-h-dvh">
      <ErrorBoundary compact name="HeaderKpis">
        <HeaderKpis />
      </ErrorBoundary>
      <main className="container py-6">
        <ErrorBoundary compact name="PlayerComparison">
          <PlayerComparison />
        </ErrorBoundary>
      </main>
    </div>
  );
}
