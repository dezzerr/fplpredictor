"use client";

import { useState, useMemo } from "react";
import { MobileHeader } from "./MobileHeader";
import { MobilePitch } from "./MobilePitch";
import { MobileBench } from "./MobileBench";
import { MobilePlayerProfile } from "./MobilePlayerProfile";
import { MobileTransferPage } from "./MobileTransferPage";
import { MobileAddPlayerPage } from "./MobileAddPlayerPage";
import { MobileImportPage } from "./MobileImportPage";
import { MobileOptimisePage } from "./MobileOptimisePage";
import { MobileComparePage } from "./MobileComparePage";
import { useSquadStore } from "@/store/squad";
import { formatDeadline } from "@/lib/date";
import { ChevronLeft, ChevronRight, Undo2, Download, TrendingUp, GitCompare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Player, Position } from "@/lib/data";

interface MobileSquadViewProps {
  currentGw: number;
  gwOffset: number;
  deadline: Date;
  onGwChange?: (offset: number) => void;
}

export function MobileSquadView({ currentGw, gwOffset, deadline, onGwChange }: MobileSquadViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerProfileOpen, setPlayerProfileOpen] = useState(false);
  const [localGwOffset, setLocalGwOffset] = useState(gwOffset);
  const [transferMode, setTransferMode] = useState(false);
  const [outgoingPlayer, setOutgoingPlayer] = useState<Player | null>(null);
  const [addPlayerMode, setAddPlayerMode] = useState(false);
  const [addPlayerPosition, setAddPlayerPosition] = useState<Position | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [optimiseMode, setOptimiseMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  
  const autoSelectBestXI = useSquadStore((s) => s.autoSelectBestXI);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);
  const totalExpForWeek = useSquadStore((s) => s.totalExpForWeek);
  const canUndo = useSquadStore((s) => s.canUndo);
  const undo = useSquadStore((s) => s.undo);
  const squad = useSquadStore((s) => s.squad);
  const lastImport = useSquadStore((s) => s.lastImport);
  const refresh = useSquadStore((s) => s.refresh);
  const loading = useSquadStore((s) => s.loading);

  // Find player by ID from squad
  const findPlayerById = (id: string): Player | null => {
    const allPlayers = [
      ...squad.starters.GK,
      ...squad.starters.DEF,
      ...squad.starters.MID,
      ...squad.starters.FWD,
      ...squad.bench,
    ];
    return allPlayers.find(p => p.id === id) ?? null;
  };

  const handlePlayerClick = (id: string) => {
    setSelectedPlayerId(id);
    setPlayerProfileOpen(true);
  };
  
  // Get selected player for profile
  const selectedPlayer = selectedPlayerId ? findPlayerById(selectedPlayerId) : null;


  const handleGwChange = (delta: number) => {
    const newOffset = Math.max(0, Math.min(9, localGwOffset + delta));
    setLocalGwOffset(newOffset);
    onGwChange?.(newOffset);
  };

  const handleAddPlayer = (position: Position) => {
    setAddPlayerPosition(position);
    setAddPlayerMode(true);
  };

  const deadlineStr = formatDeadline(deadline, "").replace(/Gameweek \d+/, "").trim();
  const predictedPts = totalExpForWeek(localGwOffset);

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <MobileHeader
        title="Pick Team"
        gameweek={currentGw + localGwOffset}
        deadline={deadlineStr}
        showBack={false}
      />

      {/* Action Bar - below header */}
      <div className="bg-white border-b border-slate-200 px-3 py-2">
        <div className="flex items-center justify-between max-w-md mx-auto gap-1.5">
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
            disabled={localGwOffset === 0}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          
          {/* Auto Select Button */}
          <button
            onClick={() => {
              autoSelectBestXI(localGwOffset);
              selectPlayer(null);
              toast.success("Best XI selected");
            }}
            className="py-2 px-3 rounded-full font-semibold text-xs bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] shadow-sm"
          >
            Auto
          </button>

          {/* Import Button */}
          <button
            onClick={() => setImportMode(true)}
            className="p-2 rounded-full bg-indigo-100 hover:bg-indigo-200"
          >
            <Download className="w-4 h-4 text-indigo-600" />
          </button>

          {/* Optimise Button */}
          <button
            onClick={() => setOptimiseMode(true)}
            className="p-2 rounded-full bg-purple-100 hover:bg-purple-200"
          >
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </button>

          {/* Compare Button */}
          <button
            onClick={() => setCompareMode(true)}
            className="p-2 rounded-full bg-cyan-100 hover:bg-cyan-200"
          >
            <GitCompare className="w-4 h-4 text-cyan-600" />
          </button>
          
          {/* GW Navigation Right */}
          <button
            onClick={() => handleGwChange(1)}
            disabled={localGwOffset >= 9}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3">
        {/* Pitch */}
        <MobilePitch 
          onPlayerClick={handlePlayerClick}
          onAddPlayer={handleAddPlayer}
          weekOffset={localGwOffset}
        />
        
        {/* Bench */}
        <MobileBench 
          onPlayerClick={handlePlayerClick}
          weekOffset={localGwOffset}
        />
      </div>

      {/* Player Profile Sheet */}
      <MobilePlayerProfile 
        playerId={selectedPlayerId}
        player={selectedPlayer}
        open={playerProfileOpen} 
        onOpenChange={setPlayerProfileOpen}
        weekOffset={localGwOffset}
        onSelectReplacement={(player) => {
          setOutgoingPlayer(player);
          setPlayerProfileOpen(false);
          setTransferMode(true);
        }}
      />

      {/* Transfer Page */}
      {transferMode && outgoingPlayer && (
        <MobileTransferPage
          outgoingPlayer={outgoingPlayer}
          weekOffset={localGwOffset}
          onBack={() => {
            setTransferMode(false);
            setOutgoingPlayer(null);
          }}
          onSelectPlayer={() => {
            setTransferMode(false);
            setOutgoingPlayer(null);
          }}
        />
      )}

      {/* Add Player Page */}
      {addPlayerMode && (
        <MobileAddPlayerPage
          initialPosition={addPlayerPosition || undefined}
          weekOffset={localGwOffset}
          onBack={() => {
            setAddPlayerMode(false);
            setAddPlayerPosition(null);
          }}
          onSelectPlayer={() => {
            setAddPlayerMode(false);
            setAddPlayerPosition(null);
          }}
        />
      )}

      {/* Import Page */}
      {importMode && (
        <MobileImportPage
          onBack={() => setImportMode(false)}
          onSuccess={() => setImportMode(false)}
        />
      )}

      {/* Optimise Page */}
      {optimiseMode && (
        <MobileOptimisePage
          onBack={() => setOptimiseMode(false)}
          weekOffset={localGwOffset}
        />
      )}

      {/* Compare Page */}
      {compareMode && (
        <MobileComparePage
          onBack={() => setCompareMode(false)}
          weekOffset={localGwOffset}
        />
      )}
    </div>
  );
}
