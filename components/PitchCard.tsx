"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { PlayerTile } from "@/components/PlayerTile";
import { useSquadStore } from "@/store/squad";
import { Position } from "@/lib/data";
import { toast } from "sonner";

// Dynamic formation rendered from current starters; no fixed constant
const STARTERS_MAX: Record<Position, number> = { GK: 1, DEF: 5, MID: 5, FWD: 3 };

function Row({ position, onPlayerClick, weekOffset }: { position: Position; onPlayerClick: (id: string) => void; weekOffset?: number }) {
  const squad = useSquadStore((s) => s.squad);
  const selectedPlayerId = useSquadStore((s) => s.selectedPlayerId);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);
  const swapPlayers = useSquadStore((s) => s.swapPlayers);
  const removePlayer = useSquadStore((s) => s.removePlayer);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);
  const makeVice = useSquadStore((s) => s.makeVice);

  const count = squad.starters[position].length;
  const total = squad.starters.GK.length + squad.starters.DEF.length + squad.starters.MID.length + squad.starters.FWD.length;
  const canGrowRow = total < 11 && count < STARTERS_MAX[position];
  const slots = useMemo(() => Array.from({ length: Math.max(1, count + (canGrowRow ? 1 : 0)) }), [count, canGrowRow]);

  const handlePlayerClick = (playerId: string) => {
    if (selectedPlayerId) {
      const res = swapPlayers(playerId);
      if (!res.ok && res.reason) {
        toast.error(res.reason);
      } else if (res.ok && selectedPlayerId !== playerId) {
        toast.success("Players swapped!");
      }
    } else {
      selectPlayer(playerId);
      toast.info("Player selected. Click another to swap.");
    }
  };

  return (
    <div className="flex flex-wrap items-start justify-center gap-1 sm:gap-3">
      {slots.map((_, idx) => {
        const p = squad.starters[position][idx];
        return (
          <div key={idx} className="w-[56px] sm:w-[100px]">
            {p ? (
              <PlayerTile
                player={p}
                isCaptain={squad.captainId === p.id}
                isVice={squad.viceId === p.id}
                onClick={() => handlePlayerClick(p.id)}
                className="h-[72px] sm:h-[120px]"
                weekOffset={weekOffset}
                isSelected={selectedPlayerId === p.id}
                showActions={true}
                onRemove={() => { removePlayer(p.id); toast.success(`Removed ${p.name}`); }}
                onMakeCaptain={() => { makeCaptain(p.id); toast.success(`${p.name} is captain`); }}
                onMakeVice={() => { makeVice(p.id); toast.success(`${p.name} is vice-captain`); }}
              />
            ) : (
              <EmptySlot position={position} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptySlot({ position }: { position: Position }) {
  const label = position === 'GK' ? 'Goalkeeper' : position === 'DEF' ? 'Defender' : position === 'MID' ? 'Midfielder' : 'Forward';
  return (
    <div
      className="flex h-[72px] sm:h-[120px] items-center justify-center rounded-lg sm:rounded-xl border-2 border-dashed border-white/30 text-[9px] sm:text-xs text-white/60"
      aria-label={`Empty ${label} slot`}
    >
      +
    </div>
  );
}

export function PitchCard({ onPlayerClick, weekOffset }: { onPlayerClick: (id: string) => void; weekOffset?: number }) {
  const squad = useSquadStore((s) => s.squad);
  const formationText = `${squad.starters.DEF.length}-${squad.starters.MID.length}-${squad.starters.FWD.length} Formation`;
  return (
    <Card className="pitch-bg relative overflow-hidden p-2 sm:p-4">
      <div className="mb-1 sm:mb-3 text-center text-xs sm:text-sm text-white/80 font-medium">{formationText}</div>
      <div className="space-y-1 sm:space-y-4">
        <Row position="GK" onPlayerClick={onPlayerClick} weekOffset={weekOffset} />
        <Row position="DEF" onPlayerClick={onPlayerClick} weekOffset={weekOffset} />
        <Row position="MID" onPlayerClick={onPlayerClick} weekOffset={weekOffset} />
        <Row position="FWD" onPlayerClick={onPlayerClick} weekOffset={weekOffset} />
      </div>
    </Card>
  );
}
