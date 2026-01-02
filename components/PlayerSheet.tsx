"use client";

import { useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Player, Position, players as allPlayers } from "@/lib/data";
import { useSquadStore } from "@/store/squad";
import { weeklyExp } from "@/lib/optimizer";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";

// FDR color mapping
function getFdrColor(diff: number): string {
  switch (diff) {
    case 1: return "bg-emerald-500";
    case 2: return "bg-lime-500";
    case 3: return "bg-amber-400";
    case 4: return "bg-orange-500";
    case 5: return "bg-red-500";
    default: return "bg-slate-400";
  }
}

function getFdrTextColor(diff: number): string {
  switch (diff) {
    case 1: return "text-white";
    case 2: return "text-slate-900";
    case 3: return "text-slate-900";
    case 4: return "text-white";
    case 5: return "text-white";
    default: return "text-white";
  }
}

// Team code to full name mapping
const TEAM_NAMES: Record<string, string> = {
  ARS: "Arsenal", AVL: "Aston Villa", BOU: "Bournemouth", BRE: "Brentford",
  BHA: "Brighton", CHE: "Chelsea", CRY: "Crystal Palace", EVE: "Everton",
  FUL: "Fulham", IPS: "Ipswich", LEI: "Leicester", LIV: "Liverpool",
  MCI: "Man City", MUN: "Man Utd", NEW: "Newcastle", NFO: "Nott'm Forest",
  SOU: "Southampton", TOT: "Spurs", WHU: "West Ham", WOL: "Wolves",
  LEE: "Leeds", LUT: "Luton", BUR: "Burnley", SHU: "Sheffield Utd"
};

// Get position label
const positionLabel = (pos: Position) => {
  switch (pos) {
    case "GK": return "Goalkeeper";
    case "DEF": return "Defender";
    case "MID": return "Midfielder";
    case "FWD": return "Forward";
  }
};

interface PlayerSheetProps {
  playerId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weekOffset?: number;
  onSelectReplacement?: (player: Player) => void;
  onSubstitute?: (player: Player) => void;
}

export function PlayerSheet({ playerId, open, onOpenChange, weekOffset = 0, onSelectReplacement, onSubstitute }: PlayerSheetProps) {
  const squad = useSquadStore((s) => s.squad);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);
  const makeVice = useSquadStore((s) => s.makeVice);
  const removePlayer = useSquadStore((s) => s.removePlayer);

  const player: Player | null = useMemo(() => {
    if (!playerId) return null;
    const all = [
      ...squad.starters.GK,
      ...squad.starters.DEF,
      ...squad.starters.MID,
      ...squad.starters.FWD,
      ...squad.bench,
    ];
    return all.find(p => p.id === playerId) ?? allPlayers.find(p => p.id === playerId) ?? null;
  }, [playerId, squad]);

  const isCaptain = squad.captainId === player?.id;
  const isVice = squad.viceId === player?.id;

  // Calculate stats
  const predictedPts = player ? weeklyExp(player, weekOffset) : 0;
  const ptsPerMatch = player?.form ? player.form.toFixed(1) : "0.0";
  const selectedBy = player?.ownership ? `${player.ownership.toFixed(1)}%` : "0%";
  const totalPlayers = 350;

  if (!player) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[420px] p-0 overflow-y-auto">
          <SheetTitle className="sr-only">No Player Selected</SheetTitle>
          <div className="p-6 text-center text-muted-foreground">No player selected.</div>
        </SheetContent>
      </Sheet>
    );
  }

  const handleRemove = () => {
    removePlayer(player.id);
    onOpenChange(false);
    toast.success(`Removed ${player.name}`);
  };

  const handleSubstitute = () => {
    if (onSubstitute && player) {
      onSubstitute(player);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] p-0 overflow-y-auto">
        <SheetTitle className="sr-only">{player.name} - Player Details</SheetTitle>
        
        {/* Header with gradient background */}
        <div className="relative h-48 bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 overflow-hidden">
          {/* Player image placeholder */}
          <div className="absolute left-4 bottom-4 w-28 h-36 bg-white/20 rounded-lg flex items-center justify-center">
            {player.photo ? (
              <img src={player.photo} alt={player.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="text-5xl">👤</div>
            )}
          </div>
          
          {/* Player info */}
          <div className="absolute right-4 top-10 text-white text-right">
            <div className="text-sm font-medium opacity-90">{positionLabel(player.position)}</div>
            <div className="text-xl font-light">{player.name.split(' ')[0]}</div>
            <div className="text-2xl font-bold">{player.name.split(' ').slice(1).join(' ') || player.name}</div>
            <div className="text-base mt-1 opacity-90">{TEAM_NAMES[player.team] || player.team}</div>
          </div>

          {/* Captain/Vice badges */}
          {(isCaptain || isVice) && (
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${isCaptain ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-300 text-slate-700'}`}>
                {isCaptain ? 'Captain' : 'Vice'}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex gap-2 px-4 py-3 border-b">
          <button 
            onClick={() => { makeCaptain(player.id); toast.success(`${player.name} is captain`); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border border-slate-300 text-sm font-medium hover:bg-slate-50"
          >
            Make Captain
          </button>
          <button 
            onClick={() => { makeVice(player.id); toast.success(`${player.name} is vice-captain`); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border border-slate-300 text-sm font-medium hover:bg-slate-50"
          >
            Make Vice
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-px bg-slate-200 mx-4 mt-4 rounded-lg overflow-hidden">
          <div className="bg-white p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Price</div>
            <div className="text-lg font-bold text-purple-700">£{player.price.toFixed(1)}m</div>
          </div>
          <div className="bg-white p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Pts/Match</div>
            <div className="text-lg font-bold text-purple-700">{ptsPerMatch}</div>
          </div>
          <div className="bg-white p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Form</div>
            <div className="text-lg font-bold text-purple-700">{player.form?.toFixed(1) || "0.0"}</div>
          </div>
          <div className="bg-white p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Selected</div>
            <div className="text-lg font-bold text-purple-700">{selectedBy}</div>
          </div>
        </div>

        <div className="px-4 mt-2 text-center text-xs text-slate-500">
          Ranking for {positionLabel(player.position)}s
        </div>

        {/* Fixtures section */}
        <div className="px-4 mt-4">
          <h3 className="text-sm font-semibold mb-3">Upcoming Fixtures</h3>
          <div className="flex gap-2">
            {player.nextFixtures.slice(0, 5).map((fixture, i) => (
              <div key={i} className="flex-1 text-center">
                <div className="text-[10px] text-slate-500">GW{20 + weekOffset + i}</div>
                <div className="w-10 h-10 mx-auto rounded bg-slate-100 flex items-center justify-center">
                  <span className="text-sm">{fixture.H ? "🏠" : "✈️"}</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  {fixture.opp}
                </div>
                <div className={`mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${getFdrColor(fixture.diff)} ${getFdrTextColor(fixture.diff)}`}>
                  {fixture.diff}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Predicted points */}
        <div className="px-4 mt-4 py-3 bg-slate-50 mx-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Predicted Points (GW{20 + weekOffset})</span>
            <span className="text-lg font-bold text-emerald-600">{predictedPts.toFixed(1)} pts</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 mt-4 space-y-3 pb-6">
          <div className="flex gap-3">
            <button
              onClick={handleRemove}
              className="flex-1 py-3 rounded-full border-2 border-red-500 text-red-500 font-semibold text-sm hover:bg-red-50"
            >
              Remove
            </button>
            <button
              onClick={() => {
                if (onSelectReplacement) {
                  onSelectReplacement(player);
                  onOpenChange(false);
                }
              }}
              className="flex-1 py-3 rounded-full bg-purple-700 text-white font-semibold text-sm hover:bg-purple-800"
            >
              Select Replacement
            </button>
          </div>
          <button
            onClick={handleSubstitute}
            className="w-full py-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-sm hover:from-blue-600 hover:to-cyan-600 flex items-center justify-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Substitute
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
