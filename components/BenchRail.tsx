"use client";

import { useMemo } from "react";
import { useDrop } from "react-dnd";
import { Card } from "@/components/ui/card";
import { PlayerTile, DND_ITEM } from "@/components/PlayerTile";
import { useSquadStore } from "@/store/squad";
import { Player } from "@/lib/data";
import { toast } from "sonner";

type DragItem = { id?: string; player?: Player };

export function BenchRail({ onPlayerClick, weekOffset }: { onPlayerClick: (id: string) => void; weekOffset?: number }) {
  const squad = useSquadStore((s) => s.squad);
  const moveToBench = useSquadStore((s) => s.moveToBench);
  const addPlayerToBench = useSquadStore((s) => s.addPlayerToBench);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: DND_ITEM.PLAYER,
    drop: (item: DragItem) => {
      if (item.id) {
        const res = moveToBench(item.id);
        if (!res.ok) toast.error(res.reason);
      } else if (item.player) {
        const res = addPlayerToBench(item.player);
        if (!res.ok) toast.error(res.reason);
        else toast.success(`Added ${item.player.name}`);
      }
    },
    collect: (monitor: any) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }), [moveToBench, addPlayerToBench]);

  const slots = useMemo(() => Array.from({ length: 4 }), []);

  return (
    <div ref={drop as any}>
      <Card className="relative overflow-hidden border-dashed bg-muted/40 p-3">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">Bench</div>
        {/* Labels row */}
        <div className="mb-2 hidden justify-center gap-3 sm:gap-4 text-[10px] text-muted-foreground sm:flex">
          {slots.map((_, i) => {
            const p = squad.bench[i];
            const label = i === 0 ? 'GKP' : `${i}.`;
            return (
              <div key={`label-${i}`} className="w-[112px] sm:w-[132px] text-center">
                <span>{label}</span>
                {i > 0 && p && (
                  <span className="ml-1 rounded bg-background px-1 py-[1px] text-[9px] uppercase opacity-70">{p.position}</span>
                )}
              </div>
            );
          })}
        </div>
        {/* Cards row */}
        <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-4">
          {slots.map((_, idx) => {
            const p = squad.bench[idx];
            return p ? (
              <div key={p.id} className="w-[112px] sm:w-[132px]">
                <PlayerTile
                  player={p}
                  isCaptain={squad.captainId === p.id}
                  isVice={squad.viceId === p.id}
                  onClick={() => onPlayerClick(p.id)}
                  className="h-[132px]"
                  weekOffset={weekOffset}
                />
              </div>
            ) : (
              <div
                key={idx}
                className="flex h-[132px] w-[112px] sm:w-[132px] items-center justify-center rounded-2xl border-2 border-dashed border-border/60 text-xs text-muted-foreground"
                aria-label="Empty bench slot"
              >
                Empty
              </div>
            );
          })}
        </div>
        {isOver && canDrop ? (
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-emerald-400/60" />
        ) : null}
      </Card>
    </div>
  );
}
