"use client";

import { PlayerTile } from "@/components/PlayerTile";
import { useSquadStore } from "@/store/squad";
import type { Player, Position } from "@/lib/data";

const BENCH_POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

interface BenchRailProps {
  onPlayerClick: (id: string) => void;
  onSubstitute?: (player: Player) => void;
  onAddPlayer?: (position: Position) => void;
  weekOffset?: number;
}

export function BenchRail({ onPlayerClick, onSubstitute, onAddPlayer, weekOffset }: BenchRailProps) {
  const squad = useSquadStore((s) => s.squad);
  const selectedPlayerId = useSquadStore((s) => s.selectedPlayerId);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);

  const handlePlayerClick = (playerId: string) => {
    selectPlayer(null);
    onPlayerClick(playerId);
  };

  return (
    <div className="rounded-xl bg-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Bench</span>
        <span className="text-[11px] font-medium text-slate-400">Open details or swap directly into the XI</span>
      </div>
      {/* Position labels row - FPL style */}
      <div className="flex justify-center gap-2 sm:gap-4 px-3 pt-3 sm:pt-4 pb-1 sm:pb-2">
        {[0, 1, 2, 3].map((idx) => {
          return (
            <div key={idx} className="w-[72px] sm:w-[100px] text-center">
              <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide">
                {BENCH_POSITIONS[idx] === "GK" ? "GKP" : BENCH_POSITIONS[idx]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bench players row */}
      <div className="flex justify-center gap-2 sm:gap-4 px-3 pb-3 sm:pb-4">
        {[0, 1, 2, 3].map((idx) => {
          const player = squad.bench[idx];
          return (
            <div key={idx} className="w-[72px] sm:w-[100px]">
              {player ? (
                <div className="space-y-1.5">
                  <PlayerTile
                    player={player}
                    isCaptain={squad.captainId === player.id}
                    isVice={squad.viceId === player.id}
                    onClick={() => handlePlayerClick(player.id)}
                    weekOffset={weekOffset}
                    isSelected={selectedPlayerId === player.id}
                  />
                  {onSubstitute && (
                    <button
                      type="button"
                      onClick={() => onSubstitute(player)}
                      className="min-h-8 w-full rounded-md bg-blue-50 px-1 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Swap into XI
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddPlayer?.(BENCH_POSITIONS[idx])}
                  disabled={!onAddPlayer}
                  className="group flex w-full flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-default"
                  aria-label={"Add " + (BENCH_POSITIONS[idx] === "GK" ? "goalkeeper" : BENCH_POSITIONS[idx].toLowerCase()) + " to bench"}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-200/50 transition-colors group-hover:border-violet-400 group-hover:bg-violet-50 sm:h-[72px] sm:w-[72px]">
                    <span className="text-2xl text-slate-400 transition-colors group-hover:text-violet-500 sm:text-3xl">+</span>
                  </div>
                  <div className="mt-2 w-full min-w-[70px] overflow-hidden rounded sm:min-w-[90px]">
                    <div className="bg-slate-300 px-2 py-1 text-center transition-colors group-hover:bg-violet-100 sm:py-1.5">
                      <div className="text-[11px] font-medium text-slate-600 sm:text-sm">Add player</div>
                    </div>
                    <div className="bg-slate-400 px-2 py-0.5 sm:py-1 text-center">
                      <div className="text-[10px] sm:text-xs text-slate-200">-</div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
