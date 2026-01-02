"use client";

import { MobilePlayerTile } from "./MobilePlayerTile";
import { useSquadStore } from "@/store/squad";
import { toast } from "sonner";

interface MobileBenchProps {
  onPlayerClick: (id: string) => void;
  weekOffset?: number;
}

export function MobileBench({ onPlayerClick, weekOffset = 0 }: MobileBenchProps) {
  const squad = useSquadStore((s) => s.squad);
  const selectedPlayerId = useSquadStore((s) => s.selectedPlayerId);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);
  const swapPlayers = useSquadStore((s) => s.swapPlayers);

  const handlePlayerClick = (playerId: string) => {
    // Always open player profile - swap mode is handled separately
    selectPlayer(null); // Clear any previous selection
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
    <div className="bg-slate-100 rounded-b-xl mt-2">
      {/* Position labels row - FPL style */}
      <div className="flex justify-center gap-4 px-3 pt-4 pb-2">
        {[0, 1, 2, 3].map((idx) => {
          const player = squad.bench[idx];
          return (
            <div key={idx} className="w-[72px] text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {getPositionLabel(idx, player)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bench players row */}
      <div className="flex justify-center gap-4 px-3 pb-5">
        {[0, 1, 2, 3].map((idx) => {
          const player = squad.bench[idx];
          return (
            <div key={idx} className="w-[72px]">
              {player ? (
                <MobilePlayerTile
                  player={player}
                  isCaptain={squad.captainId === player.id}
                  isVice={squad.viceId === player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  weekOffset={weekOffset}
                  isSelected={selectedPlayerId === player.id}
                  variant="bench"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-200/50">
                    <span className="text-slate-400 text-2xl">+</span>
                  </div>
                  <div className="w-full mt-1.5 rounded overflow-hidden min-w-[60px]">
                    <div className="bg-slate-300 px-1.5 py-1 text-center">
                      <div className="text-[11px] font-medium text-slate-500">Empty</div>
                    </div>
                    <div className="bg-slate-400 px-1.5 py-0.5 text-center">
                      <div className="text-[10px] text-slate-200">-</div>
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
