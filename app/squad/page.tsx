"use client";

import { useEffect, useMemo, useState } from "react";
import { HeaderKpis } from "@/components/HeaderKpis";
import { PitchCard } from "@/components/PitchCard";
import { useSquadStore, type SquadState } from "@/store/squad";
import type { Player, Position } from "@/lib/data";
import { ChevronLeft, ChevronRight, Undo2, Download, TrendingUp, GitCompare, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BenchRail } from "@/components/BenchRail";
import { PlayerSheet } from "@/components/PlayerSheet";
import { PlayerFinder } from "@/components/PlayerFinder";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { weeklyExp } from "@/lib/optimizer";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { MobileSquadView, MobileImportPage, MobileTransferPage } from "@/components/mobile";
import { useSavedTeamId } from "@/hooks/useSavedTeamId";
import { ManagerSidebar } from "@/components/ManagerSidebar";
import { getMockDeadline, formatDeadline } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

// KPIs Header component - matches mobile design
function KpisHeader({ weekOffset = 0 }: { weekOffset?: number }) {
  const teamRatingForWeek = useSquadStore((s) => s.teamRatingForWeek);
  const gwRatingForWeek = useSquadStore((s) => s.gwRatingForWeek);
  const totalExpForWeek = useSquadStore((s) => s.totalExpForWeek);
  const squad = useSquadStore((s) => s.squad);

  const teamRating = teamRatingForWeek(weekOffset);
  const gwRating = gwRatingForWeek(weekOffset);
  const predictedPts = totalExpForWeek(weekOffset);
  const bank = squad.bank;

  const getRatingColor = (rating: number) => {
    if (rating >= 85) return "text-emerald-400";
    if (rating >= 70) return "text-lime-400";
    if (rating >= 55) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 backdrop-blur-sm rounded-lg mx-2">
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">Team</span>
        <span className={`text-sm font-bold ${getRatingColor(teamRating)}`} suppressHydrationWarning>
          {teamRating.toFixed(0)}%
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">GW</span>
        <span className={`text-sm font-bold ${getRatingColor(gwRating)}`} suppressHydrationWarning>
          {gwRating.toFixed(0)}%
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">Pts</span>
        <span className="text-sm font-bold text-white" suppressHydrationWarning>
          {predictedPts.toFixed(1)}
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">Bank</span>
        <span className="text-sm font-bold text-white" suppressHydrationWarning>
          £{bank.toFixed(1)}m
        </span>
      </div>
    </div>
  );
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [currentGw, setCurrentGw] = useState<number>(8);
  const [deadline, setDeadline] = useState<Date>(getMockDeadline());
  const [isMobile, setIsMobile] = useState(false);
  const starters = useSquadStore((s) => s.squad.starters);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [finderOpen, setFinderOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [outgoingPlayer, setOutgoingPlayer] = useState<Player | null>(null);
  const [gwOffset, setGwOffset] = useState<number>(0);
  const squad = useSquadStore((s) => s.squad);
  const autoSelectBestXI = useSquadStore((s) => s.autoSelectBestXI);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);
  const canUndo = useSquadStore((s) => s.canUndo);
  const undo = useSquadStore((s) => s.undo);
  const lastImport = useSquadStore((s) => s.lastImport);
  const refresh = useSquadStore((s) => s.refresh);
  const loading = useSquadStore((s) => s.loading);
  
  // Auto-load saved team ID
  const { savedTeamId, loading: loadingTeamId, autoLoadSquad } = useSavedTeamId();

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Auto-load squad from saved team ID on mount
  useEffect(() => {
    if (!loadingTeamId && savedTeamId && !lastImport) {
      autoLoadSquad().then((success) => {
        if (success) {
          toast.success("Squad loaded from your saved team!");
        }
      });
    }
  }, [loadingTeamId, savedTeamId, lastImport, autoLoadSquad]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch('/api/deadline');
        if (!res.ok) return;
        const data = await res.json();
        const gw =
          typeof data.eventId === "number"
            ? data.eventId
            : parseInt(String(data.eventId), 10);

        if (active && !Number.isNaN(gw)) {
          setCurrentGw(gw);
        }
        if (active && data.deadline) {
          setDeadline(new Date(data.deadline));
        }
      } catch (e) {
        console.error("Failed to fetch current gameweek:", e);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleGwChange = (delta: number) => {
    const newOffset = Math.max(0, Math.min(9, gwOffset + delta));
    setGwOffset(newOffset);
  };

  // Mobile view
  if (mounted && isMobile) {
    return (
      <MobileSquadView
        currentGw={currentGw}
        gwOffset={gwOffset}
        deadline={deadline}
        onGwChange={setGwOffset}
      />
    );
  }

  // Desktop view - with left sidebar
  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <ErrorBoundary compact name="HeaderKpis">
        <HeaderKpis onGwChange={setGwOffset} />
      </ErrorBoundary>

      {/* Main Layout with Sidebar */}
      <div className="flex gap-4 px-4 py-4">
        {/* Left Sidebar - Manager Stats (fixed to far left) */}
        <aside className="hidden lg:block flex-shrink-0 sticky top-20 self-start">
          <ManagerSidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-xl mx-auto">
          {/* Action Bar - aligned with pitch */}
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 mb-2">
            <div className="flex items-center justify-center gap-1.5">
              {/* Live Team Button */}
              <button
                onClick={async () => {
                  if (!lastImport) {
                    toast.error("Import a team first");
                    return;
                  }
                  const result = await refresh();
                  if (result.ok) {
                    toast.success("Live team restored!");
                  } else {
                    toast.error(result.error || "Failed to restore");
                  }
                }}
                disabled={!lastImport || loading}
                className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Restore live team from FPL"
              >
                <RefreshCw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Undo Button */}
              <button
                onClick={() => {
                  if (canUndo()) {
                    undo();
                    toast.success("Change undone");
                  }
                }}
                disabled={!canUndo()}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-4 h-4 text-slate-600" />
              </button>
              
              {/* GW Navigation Left */}
              <button
                onClick={() => handleGwChange(-1)}
                disabled={gwOffset === 0}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              
              {/* Auto Select Button */}
              <button
                onClick={() => {
                  autoSelectBestXI(gwOffset);
                  selectPlayer(null);
                  toast.success("Best XI selected");
                }}
                className="py-2 px-3 rounded-full font-semibold text-xs bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] shadow-sm"
              >
                Auto
              </button>

              {/* Import Button */}
              <button
                onClick={() => setImportOpen(true)}
                className="p-2 rounded-full bg-indigo-100 hover:bg-indigo-200"
              >
                <Download className="w-4 h-4 text-indigo-600" />
              </button>

              {/* Optimise Button */}
              <Link
                href="/optimize"
                className="p-2 rounded-full bg-purple-100 hover:bg-purple-200"
              >
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </Link>

              {/* Compare Button */}
              <Link
                href="/compare"
                className="p-2 rounded-full bg-cyan-100 hover:bg-cyan-200"
              >
                <GitCompare className="w-4 h-4 text-cyan-600" />
              </Link>
              
              {/* GW Navigation Right */}
              <button
                onClick={() => handleGwChange(1)}
                disabled={gwOffset >= 9}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="px-3">
            {/* KPIs Header on Pitch */}
            <div className="mobile-pitch-bg rounded-t-xl pt-3 pb-2">
              <KpisHeader weekOffset={gwOffset} />
            </div>
            
            {/* Pitch */}
            <ErrorBoundary compact name="PitchCard">
              <PitchCard
                onPlayerClick={(id) => { setSelectedPlayerId(id); setPlayerOpen(true); }}
                weekOffset={gwOffset}
              />
            </ErrorBoundary>

            {/* Bench */}
            <div className="mt-2">
              <ErrorBoundary compact name="BenchRail">
                <BenchRail
                  onPlayerClick={(id) => { setSelectedPlayerId(id); setPlayerOpen(true); }}
                  weekOffset={gwOffset}
                />
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>

      <PlayerSheet 
        playerId={selectedPlayerId} 
        open={playerOpen} 
        onOpenChange={setPlayerOpen} 
        weekOffset={gwOffset}
        onSelectReplacement={(player) => {
          setOutgoingPlayer(player);
          setTransferOpen(true);
        }}
      />
      <OnboardingDialog />
      
      {/* Player Finder Sheet */}
      <Sheet open={finderOpen} onOpenChange={setFinderOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
          <SheetTitle className="sr-only">Find Players</SheetTitle>
          <SheetDescription className="sr-only">Search and add players to your squad</SheetDescription>
          <ErrorBoundary compact name="PlayerFinder">
            <PlayerFinder />
          </ErrorBoundary>
        </SheetContent>
      </Sheet>

      {/* Import Page */}
      {importOpen && (
        <MobileImportPage 
          onBack={() => setImportOpen(false)} 
          onSuccess={() => setImportOpen(false)}
        />
      )}

      {/* Transfer Page */}
      {transferOpen && outgoingPlayer && (
        <MobileTransferPage
          outgoingPlayer={outgoingPlayer}
          weekOffset={gwOffset}
          onBack={() => {
            setTransferOpen(false);
            setOutgoingPlayer(null);
          }}
          onSelectPlayer={() => {
            setTransferOpen(false);
            setOutgoingPlayer(null);
          }}
        />
      )}
    </div>
  );
}

