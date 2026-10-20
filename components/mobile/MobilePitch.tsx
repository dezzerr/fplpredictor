"use client";

import { MobilePlayerTile } from "./MobilePlayerTile";
import { MobileKpisHeader } from "./MobileKpisHeader";
import { useSquadStore } from "@/store/squad";
import { Position } from "@/lib/data";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { STARTERS_MIN } from "@/lib/constants";

interface MobilePitchProps {
  onPlayerClick: (id: string) => void;
  onAddPlayer?: (position: Position) => void;
  weekOffset?: number;
  showPrices?: boolean;
}

// Empty slot component for missing players
function EmptySlot({ position, onClick }: { position: Position; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center w-full"
    >
      <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
        <Plus className="w-6 h-6 text-white/70" />
      </div>
      <div className="w-full mt-1.5 rounded overflow-hidden min-w-[60px]">
        <div className="bg-slate-800/80 px-1.5 py-0.5 text-center">
          <div className="text-[10px] font-bold text-white/70">Add {position}</div>
        </div>
        <div className="bg-slate-600/80 px-1.5 py-0.5 text-center">
          <div className="text-[9px] text-white/50">Tap to add</div>
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
  showPrices,
  showEmptySlot
}: { 
  position: Position; 
  onPlayerClick: (id: string) => void;
  onAddPlayer?: (position: Position) => void;
  weekOffset?: number;
  showPrices?: boolean;
  showEmptySlot?: boolean;
}) {
  const squad = useSquadStore((s) => s.squad);
  const selectedPlayerId = useSquadStore((s) => s.selectedPlayerId);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);
  const swapPlayers = useSquadStore((s) => s.swapPlayers);

  const players = squad.starters[position];
  const minRequired = STARTERS_MIN[position];
  // Show empty slots if below minimum OR if showEmptySlot is true (total < 11)
  const emptySlots = Math.max(0, minRequired - players.length) + (showEmptySlot ? 1 : 0);

  const handlePlayerClick = (playerId: string) => {
    // Always open player profile - swap mode is handled separately
    selectPlayer(null); // Clear any previous selection
    onPlayerClick(playerId);
  };

  return (
    <div className="flex items-start justify-center gap-3">
      {players.map((player) => (
        <div key={player.id} className="w-[72px]">
          <MobilePlayerTile
            player={player}
            isCaptain={squad.captainId === player.id}
            isVice={squad.viceId === player.id}
            onClick={() => handlePlayerClick(player.id)}
            weekOffset={weekOffset}
            isSelected={selectedPlayerId === player.id}
            showPrice={showPrices}
            variant="starter"
          />
        </div>
      ))}
      {/* Show empty slots if players are missing */}
      {Array.from({ length: emptySlots }).map((_, idx) => (
        <div key={`empty-${position}-${idx}`} className="w-[72px]">
          <EmptySlot 
            position={position} 
            onClick={() => onAddPlayer?.(position)}
          />
        </div>
      ))}
    </div>
  );
}

export function MobilePitch({ onPlayerClick, onAddPlayer, weekOffset = 0, showPrices = false }: MobilePitchProps) {
  const squad = useSquadStore((s) => s.squad);
  
  // Calculate total starters
  const totalStarters = squad.starters.GK.length + squad.starters.DEF.length + 
                        squad.starters.MID.length + squad.starters.FWD.length;
  const needsMorePlayers = totalStarters < 11;
  
  // Determine which position should show an extra empty slot
  // Priority: FWD (if < 3), MID (if < 5), DEF (if < 5), GK (if < 1)
  const getExtraSlotPosition = (): Position | null => {
    if (!needsMorePlayers) return null;
    if (squad.starters.FWD.length < 3) return "FWD";
    if (squad.starters.MID.length < 5) return "MID";
    if (squad.starters.DEF.length < 5) return "DEF";
    if (squad.starters.GK.length < 1) return "GK";
    return "MID"; // Default fallback
  };
  
  const extraSlotPosition = getExtraSlotPosition();

  return (
    <div className="mobile-pitch-bg relative overflow-hidden rounded-xl">
      {/* KPIs Header - replaces goal frame */}
      <div className="pt-3 pb-2">
        <MobileKpisHeader weekOffset={weekOffset} />
      </div>

      {/* Pitch rows - increased spacing */}
      <div className="space-y-3 px-2 pb-4 relative z-10">
        <PitchRow position="GK" onPlayerClick={onPlayerClick} onAddPlayer={onAddPlayer} weekOffset={weekOffset} showPrices={showPrices} showEmptySlot={extraSlotPosition === "GK"} />
        <PitchRow position="DEF" onPlayerClick={onPlayerClick} onAddPlayer={onAddPlayer} weekOffset={weekOffset} showPrices={showPrices} showEmptySlot={extraSlotPosition === "DEF"} />
        <PitchRow position="MID" onPlayerClick={onPlayerClick} onAddPlayer={onAddPlayer} weekOffset={weekOffset} showPrices={showPrices} showEmptySlot={extraSlotPosition === "MID"} />
        <PitchRow position="FWD" onPlayerClick={onPlayerClick} onAddPlayer={onAddPlayer} weekOffset={weekOffset} showPrices={showPrices} showEmptySlot={extraSlotPosition === "FWD"} />
      </div>

      {/* Center circle - positioned at bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-28 h-14 border-2 border-white/15 rounded-t-full border-b-0" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/15 rounded-full" />
    </div>
  );
}
