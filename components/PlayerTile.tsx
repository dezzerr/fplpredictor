"use client";

import { motion } from "framer-motion";
import { useDrag } from "react-dnd";
import { Crown, Shield } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TeamShirt } from "@/components/TeamShirt";
import { Player } from "@/lib/data";
import { cn, getFPLDisplayName } from "@/lib/utils";
import { weeklyExp } from "@/lib/optimizer";
import { memo, useMemo } from "react";

export const DND_ITEM = {
  PLAYER: "PLAYER",
} as const;

export const PlayerTile = memo(function PlayerTile({ player, isCaptain, isVice, onClick, className, weekOffset }: {
  player: Player;
  isCaptain?: boolean;
  isVice?: boolean;
  onClick?: () => void;
  className?: string;
  weekOffset?: number;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_ITEM.PLAYER,
    item: { id: player.id },
    collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
  }), [player.id]);

  const w = weekOffset ?? 0;
  const f0 = player.nextFixtures?.[w];
  const fixText = useMemo(() => {
    return f0 ? `${f0.opp} (${f0.H ? 'H' : 'A'})` : '';
  }, [f0]);
  const weekPts = useMemo(() => weeklyExp(player, w), [player.id, player.expExplain?.final, player.expPoints, player.nextFixtures, w]);
  const fixtureCount = useMemo(() => {
    const counts = player.expExplain?.eventFixtureCounts;
    if (Array.isArray(counts) && w >= 0 && w < counts.length) return counts[w] as number;
    if (w === 0) return player.expExplain?.nextEventFixtureCount;
    return undefined;
  }, [player.id, player.expExplain, w]);

  return (
    <motion.button
      ref={drag as any}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative rounded-xl border-2 border-dashed border-transparent bg-card/50 shadow-sm transition-all",
        "hover:border-primary/50 hover:bg-card/70 hover:shadow-md",
        isDragging && "opacity-50 scale-95",
        className
      )}
      style={{ width: '140px', height: '200px' }}
      aria-label={`${player.name}, ${player.position} from ${player.team}`}
    >
      <div className="relative">
        {/* Captain/Vice Captain Badges */}
        {(isCaptain || isVice) && (
          <div className="absolute left-2 top-2 z-10 flex gap-1">
            {isCaptain && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm" aria-label="Captain">
                <Crown className="h-3.5 w-3.5" /> C
              </span>
            )}
            {isVice && (
              <span className="flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm" aria-label="Vice Captain">
                <Shield className="h-3.5 w-3.5" /> V
              </span>
            )}
          </div>
        )}

        {/* Large Team Shirt - visible and prominent */}
        <div className="flex justify-center items-center h-32 pt-2 pb-2">
          <TeamShirt team={player.team} className="w-24 h-24" />
        </div>

        {/* Ultra-compact transparent info card */}
        <div className="bg-white/60 rounded-md mx-2 mb-1 px-2 py-0.5 shadow-sm">
          {/* Single line - Name and Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-black">{player.position}</span>
              <span className="text-[10px] font-medium truncate text-black max-w-[50px]">{getFPLDisplayName(player.name)}</span>
            </div>
            <span className="text-[10px] font-bold text-black">{player.price.toFixed(1)}m</span>
          </div>

          {/* Bottom line - Fixture and Points */}
          <div className="flex items-center justify-between">
            {/* Fixture display - very compact */}
            <div className="text-[9px] font-medium text-gray-600">
              {fixText || (
                player.nextFixtures.length > 0 && 
                `${player.nextFixtures[0].opp} (${player.nextFixtures[0].H ? 'H' : 'A'})`
              )}
            </div>
            
            {/* Expected Points - prominent green */}
            <div className="flex items-center gap-0.5">
              {player.expExplain ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-xs font-bold text-green-600">
                        {weekPts.toFixed(1)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      {player.expExplain?.source && (
                        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Source: {player.expExplain.source === 'market' ? 'Market' : 'FPL'}
                        </div>
                      )}
                      <div className="font-semibold">Expected points breakdown for GW{w+1}</div>
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
                      <div className="mt-1 font-semibold">Final (this GW): {weekPts.toFixed(1)} pts</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="text-xs font-bold text-green-600">
                  {weekPts.toFixed(1)}
                </span>
              )}
              
              {/* Tiny status indicators */}
              <div className="flex gap-0.5">
                {player.expExplain?.source === 'market' && (
                  <div className="w-1 h-1 rounded-full bg-emerald-500" title="Market data" />
                )}
                {typeof fixtureCount === 'number' && fixtureCount !== 1 && (
                  <div 
                    className={`w-1 h-1 rounded-full ${
                      fixtureCount === 0 ? 'bg-gray-400' : 'bg-blue-500'
                    }`} 
                    title={fixtureCount === 0 ? 'Blank GW' : 'Double GW'} 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
});
