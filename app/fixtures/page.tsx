"use client";

import { AppNavbar } from "@/components/AppNavbar";
import { GwInfoBar } from "@/components/GwInfoBar";
import { TeamFixtureMatrix } from "@/components/TeamFixtureMatrix";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LiveGwProvider } from "@/components/LiveGwProvider";
import { Calendar } from "lucide-react";

export default function FixturesPage() {
  return (
    <LiveGwProvider>
    <div className="min-h-dvh bg-slate-50">
      <ErrorBoundary compact name="AppNavbar">
        <AppNavbar />
        <GwInfoBar />
      </ErrorBoundary>
      <main className="container py-4 sm:py-6 px-3 sm:px-4">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Fixture Analysis</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Plan your transfers around fixture difficulty and identify teams with favorable runs
              </p>
            </div>
          </div>
        </div>

        {/* Fixture Matrix */}
        <ErrorBoundary compact name="TeamFixtureMatrix">
          <TeamFixtureMatrix />
        </ErrorBoundary>
      </main>
    </div>
    </LiveGwProvider>
  );
}
