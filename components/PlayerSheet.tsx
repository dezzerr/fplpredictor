"use client";

import { useMemo } from "react";
import { Player, players as allPlayers } from "@/lib/data";
import { useSquadStore } from "@/store/squad";
import { PlayerDetailModal } from "@/components/PlayerDetailModal";

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

  return (
    <PlayerDetailModal
      player={player}
      open={open}
      onOpenChange={onOpenChange}
      weekOffset={weekOffset}
      onSelectReplacement={onSelectReplacement}
      onSubstitute={onSubstitute}
      side="right"
    />
  );
}
