"use client";

import { useMemo } from "react";
import { useDrop } from "react-dnd";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { PlayerTile, DND_ITEM } from "@/components/PlayerTile";
import { useSquadStore } from "@/store/squad";
import { Player, Position } from "@/lib/data";
import { toast } from "sonner";

// Dynamic formation rendered from current starters; no fixed constant
const STARTERS_MAX: Record<Position, number> = { GK: 1, DEF: 5, MID: 5, FWD: 3 };

type DragItem = { id?: string; player?: Player };

function Row({ position, onPlayerClick, weekOffset }: { position: Position; onPlayerClick: (id: string) => void; weekOffset?: number }) {
  const squad = useSquadStore((s) => s.squad);
  const placeOnPitch = useSquadStore((s) => s.placeOnPitch);
  const addPlayer = useSquadStore((s) => s.addPlayer);

  const count = squad.starters[position].length;
  const total = squad.starters.GK.length + squad.starters.DEF.length + squad.starters.MID.length + squad.starters.FWD.length;
  const canGrowRow = total < 11 && count < STARTERS_MAX[position];
  const slots = useMemo(() => Array.from({ length: Math.max(1, count + (canGrowRow ? 1 : 0)) }), [count, canGrowRow]);

  return (
    <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-4">
      {slots.map((_, idx) => {
        const p = squad.starters[position][idx];
        return (
          <DroppableSlot
            key={idx}
            acceptPosition={position}
            occupied={Boolean(p)}
            slotIndex={idx}
            onDrop={(item, targetIndex) => {
              if (item.player) {
                const res = addPlayer(item.player);
                if (!res.ok) toast.error(res.reason);
                else toast.success(`Added ${item.player.name}`);
              } else if (item.id) {
                const res = placeOnPitch(item.id, position, targetIndex);
                if (!res.ok) toast.error(res.reason);
              }
            }}
          >
            <div className="w-[112px] sm:w-[132px]">
              {p ? (
                <PlayerTile
                  player={p}
                  isCaptain={squad.captainId === p.id}
                  isVice={squad.viceId === p.id}
                  onClick={() => onPlayerClick(p.id)}
                  className="h-[140px]"
                  weekOffset={weekOffset}
                />
              ) : (
                <EmptySlot position={position} />
              )}
            </div>
          </DroppableSlot>
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
      aria-label={`Empty ${label} slot. Drag a ${label} here.`}
    >
      Drag here
    </div>
  );
}

function DroppableSlot({ children, onDrop, acceptPosition, occupied, slotIndex }: { children: React.ReactNode; onDrop: (item: DragItem, replaceIndex: number) => void; acceptPosition: Position; occupied?: boolean; slotIndex: number }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DND_ITEM.PLAYER,
    drop: (item: DragItem) => onDrop(item, slotIndex),
    canDrop: (item: DragItem) => {
      // Allow adding a new player only to the matching position row AND only onto an empty slot
      // (replacements must be performed via a swap from the bench).
      if (item.player) return item.player.position === acceptPosition && !occupied;
      // For existing players (by id), only allow dropping onto an occupied slot to perform a swap.
      if (item.id) return !!occupied;
      return false;
    },
    collect: (monitor: any) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }), [acceptPosition, onDrop, slotIndex, occupied]);

  return (
    <div ref={drop as any} className="relative">
      <motion.div
        animate={{ scale: isOver && canDrop ? 1.02 : 1 }}
        className={isOver && canDrop ? "ring-2 ring-white/60 rounded-2xl" : undefined}
      >
        {children}
      </motion.div>
      {occupied ? null : (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/20" />
      )}
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
