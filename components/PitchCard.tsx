"use client";

import { useMemo } from "react";
import { PlayerTile } from "@/components/PlayerTile";
import { useSquadStore } from "@/store/squad";
import { Position } from "@/lib/data";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { STARTERS_MIN } from "@/lib/constants";

// Dynamic formation rendered from current starters; no fixed constant
const STARTERS_MAX: Record<Position, number> = { GK: 1, DEF: 5, MID: 5, FWD: 3 };

// Empty slot component for missing players - matches mobile design
function EmptySlot({ position, onClick }: { position: Position; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center w-full"
    >
      <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full border-2 border-dashed border-white/40 flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
        <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-white/70" />
      </div>
      <div className="w-full mt-2 rounded overflow-hidden min-w-[70px] sm:min-w-[90px]">
        <div className="bg-slate-800/80 px-2 py-1 sm:py-1.5 text-center">
          <div className="text-[11px] sm:text-sm font-bold text-white/70">Add {position}</div>
        </div>
        <div className="bg-slate-600/80 px-2 py-0.5 sm:py-1 text-center">
          <div className="text-[10px] sm:text-xs text-white/50">Tap to add</div>
        </div>
      </div>
    </button>
  );
}

function PitchRow({ 
  position, 
  onPlayerClick,
  onAddPlayer,
  weekOffset,
  showEmptySlot
}: { 
  position: Position; 
  onPlayerClick: (id: string) => void;
  onAddPlayer?: (position: Position) => void;
  weekOffset?: number;
  showEmptySlot?: boolean;
}) {
  const squad = useSquadStore((s) => s.squad);
  const selectedPlayerId = useSquadStore((s) => s.selectedPlayerId);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);
  const swapPlayers = useSquadStore((s) => s.swapPlayers);

  const players = squad.starters[position];
  const minRequired = STARTERS_MIN[position];
  const emptySlots = Math.max(0, minRequired - players.length) + (showEmptySlot ? 1 : 0);

  const handlePlayerClick = (playerId: string) => {
    selectPlayer(null);
    onPlayerClick(playerId);
  };

  return (
    <div className="flex items-start justify-center gap-2 sm:gap-4">
      {players.map((player) => (
        <div key={player.id} className="w-[72px] sm:w-[100px]">
          <PlayerTile
            player={player}
            isCaptain={squad.captainId === player.id}
            isVice={squad.viceId === player.id}
            onClick={() => handlePlayerClick(player.id)}
            weekOffset={weekOffset}
            isSelected={selectedPlayerId === player.id}
          />
        </div>
      ))}
      {/* Show empty slots if players are missing */}
      {Array.from({ length: emptySlots }).map((_, idx) => (
        <div key={`empty-${position}-${idx}`} className="w-[72px] sm:w-[100px]">
          <EmptySlot 
            position={position} 
            onClick={() => onAddPlayer?.(position)}
          />
        </div>
      ))}
    </div>
  );
}

interface PitchCardProps {
  onPlayerClick: (id: string) => void;
  onAddPlayer?: (position: Position) => void;
  weekOffset?: number;
}

export function PitchCard({ onPlayerClick, onAddPlayer, weekOffset }: PitchCardProps) {
  const squad = useSquadStore((s) => s.squad);
  
  // Calculate total starters
  const totalStarters = squad.starters.GK.length + squad.starters.DEF.length + 
                        squad.starters.MID.length + squad.starters.FWD.length;
  const needsMorePlayers = totalStarters < 11;
  
  // Determine which position should show an extra empty slot
  const getExtraSlotPosition = (): Position | null => {
    if (!needsMorePlayers) return null;
    if (squad.starters.FWD.length < 3) return "FWD";
    if (squad.starters.MID.length < 5) return "MID";
    if (squad.starters.DEF.length < 5) return "DEF";
    if (squad.starters.GK.length < 1) return "GK";
    return "MID";
  };
  
  const extraSlotPosition = getExtraSlotPosition();

  return (
    <div className="mobile-pitch-bg relative overflow-hidden rounded-b-xl">
      {/* Pitch rows - compact spacing for viewport fit */}
      <div className="space-y-2 sm:space-y-3 px-2 py-3 sm:py-4 relative z-10">
        <PitchRow position="GK" onPlayerClick={onPlayerClick} onAddPlayer={onAddPlayer} weekOffset={weekOffset} showEmptySlot={extraSlotPosition === "GK"} />
        <PitchRow position="DEF" onPlayerClick={onPlayerClick} onAddPlayer={onAddPlayer} weekOffset={weekOffset} showEmptySlot={extraSlotPosition === "DEF"} />
        <PitchRow position="MID" onPlayerClick={onPlayerClick} onAddPlayer={onAddPlayer} weekOffset={weekOffset} showEmptySlot={extraSlotPosition === "MID"} />
        <PitchRow position="FWD" onPlayerClick={onPlayerClick} onAddPlayer={onAddPlayer} weekOffset={weekOffset} showEmptySlot={extraSlotPosition === "FWD"} />
      </div>

      {/* Center circle - positioned at bottom like mobile */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-28 h-14 border-2 border-white/15 rounded-t-full border-b-0" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/15 rounded-full" />
    </div>
  );
}
