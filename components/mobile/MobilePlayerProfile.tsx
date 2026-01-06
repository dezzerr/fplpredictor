"use client";

import { useMemo } from "react";
import { Player } from "@/lib/data";
import { useSquadStore } from "@/store/squad";
import { PlayerDetailModal } from "@/components/PlayerDetailModal";

interface MobilePlayerProfileProps {
  playerId: string | null;
  player?: Player | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectReplacement?: (player: Player) => void;
  onSubstitute?: (player: Player) => void;
  weekOffset?: number;
}

export function MobilePlayerProfile({ 
  playerId, 
  player: passedPlayer,
  open, 
  onOpenChange, 
  onSelectReplacement,
  onSubstitute,
  weekOffset = 0 
}: MobilePlayerProfileProps) {
  const squad = useSquadStore((s) => s.squad);

  // Use passed player if available, otherwise look up from squad
  const player: Player | null = useMemo(() => {
    if (passedPlayer) return passedPlayer;
    
    if (!playerId) return null;
    
    const all = [
      ...squad.starters.GK,
      ...squad.starters.DEF,
      ...squad.starters.MID,
      ...squad.starters.FWD,
      ...squad.bench,
    ];
    return all.find((p: Player) => p.id === playerId || String(p.id) === String(playerId)) ?? null;
  }, [playerId, passedPlayer, squad]);

  return (
    <PlayerDetailModal
      player={player}
      open={open}
      onOpenChange={onOpenChange}
      weekOffset={weekOffset}
      onSelectReplacement={onSelectReplacement}
      onSubstitute={onSubstitute}
      side="bottom"
    />
  );
}
