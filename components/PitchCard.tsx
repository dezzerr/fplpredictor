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
    <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-4">
      {slots.map((_, idx) => {
        const p = squad.starters[position][idx];
        return (
          <div key={idx} className="w-[112px] sm:w-[132px]">
            {p ? (
              <PlayerTile
                player={p}
                isCaptain={squad.captainId === p.id}
                isVice={squad.viceId === p.id}
                onClick={() => handlePlayerClick(p.id)}
                className="h-[140px]"
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
      className="flex h-[140px] items-center justify-center rounded-2xl border-2 border-dashed border-white/30 text-xs text-white/80"
      aria-label={`Empty ${label} slot`}
    >
      Empty
    </div>
  );
}

export function PitchCard({ onPlayerClick, weekOffset }: { onPlayerClick: (id: string) => void; weekOffset?: number }) {
  const squad = useSquadStore((s) => s.squad);
  const formationText = `${squad.starters.DEF.length}-${squad.starters.MID.length}-${squad.starters.FWD.length} Formation`;
  return (
    <Card className="pitch-bg relative overflow-hidden p-4 sm:p-6">
      {/* pitch overlay shapes */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" style={{ width: 140, height: 140 }} />
        {/* penalty box near GK */}
        <div className="absolute left-1/2 top-[12%] h-24 w-2/3 -translate-x-1/2 rounded-md border border-white/35" />
      </div>
      <div className="mb-4 text-center text-white/90">{formationText}</div>
      <div className="space-y-4 sm:space-y-6">
        <Row position="GK" onPlayerClick={onPlayerClick} weekOffset={weekOffset} />
        <Row position="DEF" onPlayerClick={onPlayerClick} weekOffset={weekOffset} />
        <Row position="MID" onPlayerClick={onPlayerClick} weekOffset={weekOffset} />
        <Row position="FWD" onPlayerClick={onPlayerClick} weekOffset={weekOffset} />
      </div>
    </Card>
  );
}
