"use client";

import { AppNavbar } from "@/components/AppNavbar";
import { GwInfoBar } from "@/components/GwInfoBar";
import { PlayerComparison } from "@/components/PlayerComparison";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LiveGwProvider } from "@/components/LiveGwProvider";

export default function ComparePage() {
  return (
    <LiveGwProvider>
    <div className="min-h-dvh bg-slate-50">
      <ErrorBoundary compact name="AppNavbar">
        <AppNavbar />
        <GwInfoBar />
      </ErrorBoundary>
      <main className="container py-6">
        <ErrorBoundary compact name="PlayerComparison">
          <PlayerComparison />
        </ErrorBoundary>
      </main>
    </div>
    </LiveGwProvider>
  );
}
