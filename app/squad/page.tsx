"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { GwInfoBar } from "@/components/GwInfoBar";
import { PitchCard } from "@/components/PitchCard";
import { useSquadStore, type SquadState } from "@/store/squad";
import type { Player, Position } from "@/lib/data";
import { ChevronLeft, ChevronRight, Undo2, TrendingUp, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BenchRail } from "@/components/BenchRail";
import { PlayerSheet } from "@/components/PlayerSheet";
import { PlayerFinder } from "@/components/PlayerFinder";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { weeklyExp } from "@/lib/optimizer";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { LiveGwProvider, useLiveGwContext } from "@/components/LiveGwProvider";
import { LiveBadge } from "@/components/LiveBadge";
import { LiveScoreTicker } from "@/components/LiveScoreTicker";
import { MobileSquadView, MobileImportPage, MobileTransferPage } from "@/components/mobile";
import { useSavedTeamId } from "@/hooks/useSavedTeamId";
import { ManagerSidebar } from "@/components/ManagerSidebar";
import { InsightPanel } from "@/components/InsightPanel";
import { getMockDeadline, formatDeadline } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// KPIs Header component - matches mobile design
function KpisHeader({ weekOffset = 0 }: { weekOffset?: number }) {
  const teamRatingForWeek = useSquadStore((s) => s.teamRatingForWeek);
  const gwRatingForWeek = useSquadStore((s) => s.gwRatingForWeek);
  const totalExpForWeek = useSquadStore((s) => s.totalExpForWeek);
  const squad = useSquadStore((s) => s.squad);
  const { isLive, managerLivePoints } = useLiveGwContext();

  const teamRating = teamRatingForWeek(weekOffset);
  const gwRating = gwRatingForWeek(weekOffset);
  const predictedPts = totalExpForWeek(weekOffset);
  const bank = squad.bank;

  const showLive = isLive && weekOffset === 0;

  const getRatingColor = (rating: number) => {
    if (rating >= 85) return "text-emerald-400";
    if (rating >= 70) return "text-lime-400";
    if (rating >= 55) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 backdrop-blur-sm">
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
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">
          {showLive ? "Live Pts" : "Pts"}
        </span>
        {showLive && managerLivePoints !== null ? (
          <span className="text-sm font-bold text-emerald-300 flex items-center gap-1" suppressHydrationWarning>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            {managerLivePoints}
          </span>
        ) : (
          <span className="text-sm font-bold text-white" suppressHydrationWarning>
            {predictedPts.toFixed(1)}
          </span>
        )}
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
  const [substituteMode, setSubstituteMode] = useState(false);
  const [substitutePlayer, setSubstitutePlayer] = useState<Player | null>(null);
  const squad = useSquadStore((s) => s.squad);
  const autoSelectBestXI = useSquadStore((s) => s.autoSelectBestXI);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);
  const swapPlayers = useSquadStore((s) => s.swapPlayers);
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

  const handlePlayerClick = (id: string) => {
    // If in substitute mode, perform the swap
    if (substituteMode && substitutePlayer) {
      selectPlayer(substitutePlayer.id);
      const result = swapPlayers(id);
      if (result.ok) {
        toast.success(`Swapped ${substitutePlayer.name}`);
      } else {
        toast.error(result.reason || "Cannot swap these players");
      }
      setSubstituteMode(false);
      setSubstitutePlayer(null);
      selectPlayer(null);
      return;
    }
    
    setSelectedPlayerId(id);
    setPlayerOpen(true);
  };

  const handleSubstitute = (player: Player) => {
    setSubstitutePlayer(player);
    setSubstituteMode(true);
    toast.info(`Select a player to swap with ${player.name}`);
  };

  const cancelSubstitute = () => {
    setSubstituteMode(false);
    setSubstitutePlayer(null);
    selectPlayer(null);
  };

  // Mobile view
  if (mounted && isMobile) {
    return (
      <LiveGwProvider>
        <MobileSquadView
          currentGw={currentGw}
          gwOffset={gwOffset}
          deadline={deadline}
          onGwChange={setGwOffset}
        />
      </LiveGwProvider>
    );
  }

  // Desktop view - with left sidebar
  return (
    <LiveGwProvider>
    <div className="min-h-dvh bg-slate-50">
      {/* Navbar + GW Info */}
      <ErrorBoundary compact name="AppNavbar">
        <AppNavbar
          onImportOpen={() => setImportOpen(true)}
          onSearchOpen={() => setFinderOpen(true)}
        />
        <GwInfoBar currentGw={currentGw} gwOffset={gwOffset} />
      </ErrorBoundary>

      {/* Main Layout with Sidebar */}
      <div className="flex gap-4 px-4 py-4">
        {/* Left Sidebar - Manager Stats (fixed to far left) */}
        <aside className="hidden lg:block flex-shrink-0 sticky top-24 self-start">
          <ManagerSidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-xl mx-auto">
          {/* Action Bar - Compact squad actions */}
          <div className="px-4 py-3 mb-3">
            <div className="flex items-center justify-center gap-2">
              {/* Refresh */}
              <button
                onClick={async () => {
                  if (!lastImport) { toast.error("Import a team first"); return; }
                  const result = await refresh();
                  if (result.ok) toast.success("Live team restored!");
                  else toast.error(result.error || "Failed to restore");
                }}
                disabled={!lastImport || loading}
                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Restore your live FPL team"
              >
                <RefreshCw className={cn("w-5 h-5 text-blue-600", loading && "animate-spin")} />
              </button>

              {/* Undo */}
              <button
                onClick={() => { if (canUndo()) { undo(); toast.success("Change undone"); } }}
                disabled={!canUndo()}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo your last change"
              >
                <Undo2 className="w-5 h-5 text-slate-600" />
              </button>

              {/* GW Prev */}
              <button
                onClick={() => handleGwChange(-1)}
                disabled={gwOffset === 0}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous gameweek"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>

              {/* Auto Select */}
              <button
                onClick={() => { autoSelectBestXI(gwOffset); selectPlayer(null); toast.success("Best XI selected"); }}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] shadow-sm transition-colors flex items-center gap-1.5"
                title="Auto-select best XI for this GW"
              >
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white">Auto XI</span>
              </button>

              {/* GW Next */}
              <button
                onClick={() => handleGwChange(1)}
                disabled={gwOffset >= 9}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next gameweek"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="px-3">
            {/* Live Score Ticker - only visible during live GW */}
            <LiveScoreTicker className="mb-2" />

            {/* KPIs Header on Pitch */}
            <div className="mobile-pitch-bg rounded-t-xl pt-3 pb-2 overflow-hidden">
              <KpisHeader weekOffset={gwOffset} />
            </div>
            
            {/* Pitch */}
            <ErrorBoundary compact name="PitchCard">
              <PitchCard
                onPlayerClick={handlePlayerClick}
                weekOffset={gwOffset}
              />
            </ErrorBoundary>

            {/* Bench */}
            <div className="mt-2">
              <ErrorBoundary compact name="BenchRail">
                <BenchRail
                  onPlayerClick={handlePlayerClick}
                  weekOffset={gwOffset}
                />
              </ErrorBoundary>
            </div>

            {/* Substitute Mode Banner */}
            {substituteMode && substitutePlayer && (
              <div className="mt-4">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl p-3 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Swap {substitutePlayer.name} with...</span>
                  </div>
                  <button
                    onClick={cancelSubstitute}
                    className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium hover:bg-white/30"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - AI Insights */}
        <aside className="hidden xl:block w-[300px] flex-shrink-0 sticky top-24 self-start">
          <InsightPanel
            gameweek={currentGw + gwOffset}
            players={[
              ...squad.starters.GK,
              ...squad.starters.DEF,
              ...squad.starters.MID,
              ...squad.starters.FWD,
              ...squad.bench,
            ].filter(Boolean)}
            bank={squad.bank}
          />
        </aside>
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
        onSubstitute={handleSubstitute}
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
    </LiveGwProvider>
  );
}
