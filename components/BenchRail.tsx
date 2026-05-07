"use client";

import { PlayerTile } from "@/components/PlayerTile";
import { useSquadStore } from "@/store/squad";

export function BenchRail({ onPlayerClick, weekOffset }: { onPlayerClick: (id: string) => void; weekOffset?: number }) {
  const squad = useSquadStore((s) => s.squad);
  const selectedPlayerId = useSquadStore((s) => s.selectedPlayerId);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);

  const handlePlayerClick = (playerId: string) => {
    selectPlayer(null);
    onPlayerClick(playerId);
  };

  // Get position labels for bench slots
  const getPositionLabel = (index: number, player: any) => {
    if (index === 0) return "GKP";
    if (player) {
      return player.position === "GK" ? "GKP" : player.position;
    }
    return ["GKP", "DEF", "MID", "FWD"][index] || "DEF";
  };

  return (
    <div className="bg-slate-100 rounded-xl">
      {/* Position labels row - FPL style */}
      <div className="flex justify-center gap-2 sm:gap-4 px-3 pt-3 sm:pt-4 pb-1 sm:pb-2">
        {[0, 1, 2, 3].map((idx) => {
          const player = squad.bench[idx];
          return (
            <div key={idx} className="w-[72px] sm:w-[100px] text-center">
              <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide">
                {getPositionLabel(idx, player)}
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
                <PlayerTile
                  player={player}
                  isCaptain={squad.captainId === player.id}
                  isVice={squad.viceId === player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  weekOffset={weekOffset}
                  isSelected={selectedPlayerId === player.id}
                />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-200/50">
                    <span className="text-slate-400 text-2xl sm:text-3xl">+</span>
                  </div>
                  <div className="w-full mt-2 rounded overflow-hidden min-w-[70px] sm:min-w-[90px]">
                    <div className="bg-slate-300 px-2 py-1 sm:py-1.5 text-center">
                      <div className="text-[11px] sm:text-sm font-medium text-slate-500">Empty</div>
                    </div>
                    <div className="bg-slate-400 px-2 py-0.5 sm:py-1 text-center">
                      <div className="text-[10px] sm:text-xs text-slate-200">-</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
