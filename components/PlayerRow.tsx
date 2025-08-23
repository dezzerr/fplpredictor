"use client";

import { useState } from "react";
import { useDrag } from "react-dnd";
import { Plus } from "lucide-react";
import { Player } from "@/lib/data";
import { FixturePill } from "@/components/FixturePill";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn, teamColor } from "@/lib/utils";
import { DND_ITEM } from "@/components/PlayerTile";

export function PlayerRow({ player, onAdd }: { player: Player; onAdd: (p: Player) => void }) {
  const [hover, setHover] = useState(false);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_ITEM.PLAYER,
    item: { player },
    collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
  }), [player]);

  return (
    <div
      ref={drag as any}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "group relative grid cursor-grab grid-cols-[auto,1fr,auto] items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-sm",
        "hover:shadow-lg-soft",
        isDragging && "opacity-60"
      )}
      aria-label={`${player.name} ${player.position} from ${player.team}`}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: teamColor(player.team) }} aria-hidden />
        <Badge className="bg-muted text-[10px]">{player.team}</Badge>
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-medium">
            {player.name}
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{player.position}</span>
          </div>
          <div className="text-sm font-semibold">£{player.price.toFixed(1)}m</div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {player.nextFixtures.slice(0,3).map((f, i) => (
              <FixturePill key={i} f={f} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {typeof player.eoRisk === 'number' && (
              <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300" aria-label={`EO risk ${player.eoRisk.toFixed(1)}`}>
                EO risk {player.eoRisk.toFixed(1)}
              </span>
            )}
            {player.expExplain ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-xs font-medium text-amber-600 underline decoration-dotted underline-offset-2 dark:text-amber-300" aria-label={`Expected points ${player.expPoints.toFixed(1)}`}>
                      {player.expPoints.toFixed(1)} pts
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {player.expExplain.source && (
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Source: {player.expExplain.source === 'market' ? 'Market' : 'FPL'}</div>
                    )}
                    <div className="font-semibold">Expected points breakdown</div>
                    <div>Base: {player.expExplain.base.toFixed(1)}</div>
                    <div>Minutes: p={Math.round(player.expExplain.minutesProb*100)}%, factor={player.expExplain.minutesFactor.toFixed(2)}</div>
                    <div>Injury penalty: {player.expExplain.injuryPenalty.toFixed(2)}</div>
                    <div>Form: {player.expExplain.form?.toFixed(1) ?? '-'} → factor={player.expExplain.formFactor.toFixed(2)}</div>
                    <div>Position factor: {player.expExplain.positionFactor.toFixed(2)}</div>
                    <div className="mt-1">Fixtures:</div>
                    {player.expExplain.fixtureWeights.map((fw, i) => (
                      <div key={i}>GW+{i+1}: w={fw.w.toFixed(2)}, d={fw.d}, {fw.H ? 'H' : 'A'}, factor={fw.factor.toFixed(2)}</div>
                    ))}
                    <div>Blended fixture factor: {player.expExplain.blendedFixtureFactor.toFixed(2)}</div>
                    {player.expExplain.eventFixtureCounts && (
                      <div className="mt-1">
                        <div className="font-medium">Next events:</div>
                        {player.expExplain.eventFixtureCounts.map((c, i) => (
                          <div key={i}>GW+{i+1}: {c} {c===0 ? '(Blank)' : c>=2 ? '(DGW)' : ''}</div>
                        ))}
                      </div>
                    )}
                    {typeof player.eoRisk === 'number' && (
                      <div className="mt-1 text-rose-700 dark:text-rose-300">EO risk: {player.eoRisk.toFixed(1)}</div>
                    )}
                    <div className="mt-1 font-semibold">Final: {player.expExplain.final.toFixed(1)} pts</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="text-xs text-amber-600 dark:text-amber-300" aria-label={`Expected points ${player.expPoints.toFixed(1)}`}>{player.expPoints.toFixed(1)} pts</div>
            )}
            {player.expExplain?.source && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                  player.expExplain.source === 'market'
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"
                )}
                aria-label={`Projection source ${player.expExplain.source === 'market' ? 'Market' : 'FPL'}`}
              >
                {player.expExplain.source === 'market' ? 'Market' : 'FPL'}
              </span>
            )}
            {typeof player.expExplain?.nextEventFixtureCount === 'number' && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                  player.expExplain.nextEventFixtureCount === 0
                    ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"
                    : player.expExplain.nextEventFixtureCount >= 2
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200"
                      : "bg-muted text-muted-foreground"
                )}
                aria-label={player.expExplain.nextEventFixtureCount === 0 ? 'Blank GW' : player.expExplain.nextEventFixtureCount >= 2 ? 'Double GW' : 'Single GW'}
              >
                {player.expExplain.nextEventFixtureCount === 0 ? 'Blank' : player.expExplain.nextEventFixtureCount >= 2 ? 'DGW' : 'SGW'}
              </span>
            )}
          </div>
        </div>
      </div>
      <div>
        <Button size="sm" variant="outline" onClick={(e)=>{ e.stopPropagation(); onAdd(player); }} aria-label={`Add ${player.name}`} className={cn("opacity-0 transition-opacity group-hover:opacity-100", hover && "opacity-100")}> 
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  );
}
