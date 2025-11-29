"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { PlayerTile } from "@/components/PlayerTile";
import { useSquadStore } from "@/store/squad";
import { toast } from "sonner";

export function BenchRail({ onPlayerClick, weekOffset }: { onPlayerClick: (id: string) => void; weekOffset?: number }) {
  const squad = useSquadStore((s) => s.squad);
  const selectedPlayerId = useSquadStore((s) => s.selectedPlayerId);
  const selectPlayer = useSquadStore((s) => s.selectPlayer);
  const swapPlayers = useSquadStore((s) => s.swapPlayers);
  const removePlayer = useSquadStore((s) => s.removePlayer);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);
  const makeVice = useSquadStore((s) => s.makeVice);

  const slots = useMemo(() => Array.from({ length: 4 }), []);

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
    <div>
      <Card className="relative overflow-hidden border-dashed bg-green-100/80 border-green-300 p-2 sm:p-3">
        <div className="mb-1 sm:mb-2 text-xs font-semibold text-muted-foreground">Bench</div>
        {/* Labels row - hidden on mobile */}
        <div className="mb-2 hidden justify-center gap-1.5 sm:gap-4 text-[10px] text-muted-foreground sm:flex">
          {slots.map((_, i) => {
            const p = squad.bench[i];
            const label = i === 0 ? 'GKP' : `${i}.`;
            return (
              <div key={`label-${i}`} className="w-[68px] sm:w-[112px] text-center">
                <span>{label}</span>
                {i > 0 && p && (
                  <span className="ml-1 rounded bg-background px-1 py-[1px] text-[9px] uppercase opacity-70">{p.position}</span>
                )}
              </div>
            );
          })}
        </div>
        {/* Cards row */}
        <div className="flex flex-wrap items-start justify-center gap-1.5 sm:gap-3">
          {slots.map((_, idx) => {
            const p = squad.bench[idx];
            return p ? (
              <div key={p.id} className="w-[68px] sm:w-[112px]">
                <PlayerTile
                  player={p}
                  isCaptain={squad.captainId === p.id}
                  isVice={squad.viceId === p.id}
                  onClick={() => handlePlayerClick(p.id)}
                  className="h-[90px] sm:h-[130px]"
                  weekOffset={weekOffset}
                  isSelected={selectedPlayerId === p.id}
                  showActions={true}
                  onRemove={() => { removePlayer(p.id); toast.success(`Removed ${p.name}`); }}
                  onMakeCaptain={() => { makeCaptain(p.id); toast.success(`${p.name} is captain`); }}
                  onMakeVice={() => { makeVice(p.id); toast.success(`${p.name} is vice-captain`); }}
                />
              </div>
            ) : (
              <div
                key={idx}
                className="flex h-[90px] sm:h-[130px] w-[68px] sm:w-[112px] items-center justify-center rounded-xl sm:rounded-2xl border-2 border-dashed border-border/60 text-[10px] sm:text-xs text-muted-foreground"
                aria-label="Empty bench slot"
              >
                Empty
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
