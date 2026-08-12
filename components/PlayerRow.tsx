"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Player, getFixturesForWeek, formatFixtureText } from "@/lib/data";
import { cn, getFPLDisplayName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { TeamShirt } from "@/components/TeamShirt";
import { useSquadStore } from "@/store/squad";
import { weeklyExp } from "@/lib/optimizer";

export function PlayerRow({ player, onAdd }: { player: Player; onAdd: (p: Player) => void }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "group relative flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2 shadow-sm",
        "hover:shadow-md transition-shadow"
      )}
      aria-label={`${player.name} ${player.position} from ${player.team}`}
    >
      {/* Smaller Team Shirt */}
      <div className="flex-shrink-0">
        <TeamShirt team={player.team} className="w-8 h-8" />
      </div>

      {/* Player Info Card - much more compact */}
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-white/95 rounded-md p-2 text-black">
          {/* Top section - Position, Name, Price */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-bold">{player.position}</span>
              <span className="text-xs font-medium truncate">{getFPLDisplayName(player.name)}</span>
            </div>
            <span className="text-xs font-bold">£{player.price.toFixed(1)}m</span>
          </div>

          {/* Status Flags */}
          {(() => {
            const ex: any = player.expExplain as any;
            const raw: string | undefined = ex?.rawStatus;
            if (!raw || raw === 'a') return null;
            const chance: number | undefined = ex?.chance;
            const news: string | undefined = ex?.news;
            const label = raw === 'i' ? 'Inj' : raw === 's' ? 'Sus' : raw === 'd' ? 'Doubt' : raw === 'n' ? 'N/A' : 'Flag';
            const color = raw === 'i'
              ? 'bg-red-100 text-red-800 border-red-300'
              : raw === 's'
              ? 'bg-orange-100 text-orange-800 border-orange-300'
              : 'bg-amber-100 text-amber-800 border-amber-300';
            return (
              <div className="mb-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Badge className={cn('border text-xs px-1 py-0', color)}>
                          {label}{typeof chance === 'number' ? ` ${chance}%` : ''}
                        </Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      {news || 'Status update'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })()}

          {/* Bottom section - Compact fixtures and points */}
          <div className="flex items-center justify-between">
            {/* Next 3 fixtures - compact format, DGW aware */}
            <div className="flex gap-2 text-xs font-medium text-gray-600 items-center">
              {(() => {
                const gw0 = getFixturesForWeek(player, 0);
                const isDGW = gw0.length >= 2;
                const isBlank = gw0.length === 0;
                return (
                  <>
                    {isDGW && (
                      <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-blue-500 text-white leading-none">DGW</span>
                    )}
                    {isBlank && (
                      <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-slate-400 text-white leading-none">BLANK</span>
                    )}
                    <span>{formatFixtureText(gw0) || player.team}</span>
                  </>
                );
              })()}
            </div>
            
            {/* Expected Points - smaller */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {player.expExplain ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-sm font-bold text-green-600">
                        {weeklyExp(player, 0).toFixed(1)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      {player.expExplain.source && (
                        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Source: {player.expExplain.source === 'market' ? 'Market' : 'FPL'}
                        </div>
                      )}
                      <div className="font-semibold">Expected points breakdown</div>
                      <div>Projection base: {player.expExplain.base.toFixed(1)}</div>
                      {player.expExplain.projectionBaseSource === 'preseason-blend' && (
                        <div>
                          Official EP {player.expExplain.officialBase?.toFixed(1)} + last-season PPG
                        </div>
                      )}
                      {player.expExplain.playingTime ? (
                        <div>
                          Playing time: {player.expExplain.playingTime.expectedMinutes.toFixed(0)} min,
                          {' '}{Math.round(player.expExplain.playingTime.startProbability * 100)}% start,
                          {' '}{Math.round(player.expExplain.playingTime.sixtyMinuteProbability * 100)}% 60+
                        </div>
                      ) : (
                        <div>60+ chance: {Math.round(player.expExplain.minutesProb*100)}%, factor={player.expExplain.minutesFactor.toFixed(2)}</div>
                      )}
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
                <span className="text-sm font-bold text-green-600">
                  {weeklyExp(player, 0).toFixed(1)}
                </span>
              )}
              
              {/* Status indicators - small dots */}
              <div className="flex flex-col gap-0.5">
                {player.expExplain?.source === 'market' && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500" title="Market data" />
                )}
                {typeof player.expExplain?.nextEventFixtureCount === 'number' && player.expExplain.nextEventFixtureCount !== 1 && (
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      player.expExplain.nextEventFixtureCount === 0 ? 'bg-gray-400' : 'bg-blue-500'
                    }`} 
                    title={player.expExplain.nextEventFixtureCount === 0 ? 'Blank GW' : 'Double GW'} 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex-shrink-0">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onAdd(player); }} 
          aria-label={`Add ${player.name}`} 
          className={cn("opacity-0 transition-opacity group-hover:opacity-100 h-6 w-6 p-0", hover && "opacity-100")}
        > 
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
