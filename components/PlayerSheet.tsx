"use client";

import { useMemo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Player, Position, players as allPlayers } from "@/lib/data";
import { useSquadStore } from "@/store/squad";
import { FixturePill } from "@/components/FixturePill";
import { ValueBadge } from "@/components/ValueBadge";
import { toast } from "sonner";

function findLocation(squad: ReturnType<typeof useSquadStore.getState>["squad"], id: string): { area: "GK"|"DEF"|"MID"|"FWD"|"BENCH"|null; index: number } {
  for (const pos of ["GK","DEF","MID","FWD"] as Position[]) {
    const idx = squad.starters[pos].findIndex(p => p.id === id);
    if (idx !== -1) return { area: pos, index: idx } as any;
  }
  const bIdx = squad.bench.findIndex(p => p.id === id);
  if (bIdx !== -1) return { area: "BENCH", index: bIdx } as any;
  return { area: null, index: -1 };
}

export function PlayerSheet({ playerId, open, onOpenChange }: { playerId: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const squad = useSquadStore((s) => s.squad);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);
  const makeVice = useSquadStore((s) => s.makeVice);
  const removePlayer = useSquadStore((s) => s.removePlayer);
  const moveToBench = useSquadStore((s) => s.moveToBench);
  const moveToPitch = useSquadStore((s) => s.moveToPitch);

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

  const location = useMemo<ReturnType<typeof findLocation>>(
    () => (playerId ? findLocation(squad, playerId) : { area: null, index: -1 }),
    [playerId, squad]
  );

  if (!player) return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] max-w-md">
        <div className="p-2 text-sm text-muted-foreground">No player selected.</div>
      </SheetContent>
    </Sheet>
  );

  const isCaptain = squad.captainId === player.id;
  const isVice = squad.viceId === player.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] max-w-md">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{player.name}</div>
              <div className="text-xs text-muted-foreground">{player.team} • {player.position}</div>
            </div>
            <ValueBadge price={player.price} />
          </div>

          <Card className="p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">Upcoming</div>
            <div className="flex gap-1">
              {player.nextFixtures.slice(0,3).map((f, i) => (
                <FixturePill key={i} f={f} />
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={isCaptain ? "secondary" : "outline"}
              onClick={() => { makeCaptain(player.id); toast.success(`${player.name} is captain`); }}
              aria-label="Make Captain"
            >
              Make Captain
            </Button>
            <Button
              variant={isVice ? "secondary" : "outline"}
              onClick={() => { makeVice(player.id); toast.success(`${player.name} is vice-captain`); }}
              aria-label="Make Vice Captain"
            >
              Make Vice
            </Button>
            {location.area && location.area !== "BENCH" ? (
              <Button
                variant="outline"
                onClick={() => {
                  const res = moveToBench(player.id);
                  if (!res.ok) toast.error(res.reason);
                }}
                aria-label="Move to Bench"
              >
                Move to Bench
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  const res = moveToPitch(player.id, player.position as Position);
                  if (!res.ok) toast.error(res.reason);
                }}
                aria-label="Move to Pitch"
              >
                Move to Pitch
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => { removePlayer(player.id); onOpenChange(false); toast.success(`Removed ${player.name}`); }}
              aria-label="Remove Player"
            >
              Remove
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
