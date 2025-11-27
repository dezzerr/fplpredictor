"use client";

import { HeaderKpis } from "@/components/HeaderKpis";
import { TeamFixtureMatrix } from "@/components/TeamFixtureMatrix";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Calendar } from "lucide-react";

export default function FixturesPage() {
  return (
    <div className="min-h-dvh">
      <ErrorBoundary compact name="HeaderKpis">
        <HeaderKpis />
      </ErrorBoundary>
      <main className="container py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fixture Analysis</h1>
              <p className="text-sm text-muted-foreground">
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
  );
}
