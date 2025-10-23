"use client";

import { motion } from "framer-motion";
import { Crown, Shield, Trash2 } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TeamShirt } from "@/components/TeamShirt";
import { Player } from "@/lib/data";
import { cn, getFPLDisplayName } from "@/lib/utils";
import { weeklyExp } from "@/lib/optimizer";
import { memo, useMemo } from "react";

export const PlayerTile = memo(function PlayerTile({ player, isCaptain, isVice, onClick, className, weekOffset, isSelected, onRemove, onMakeCaptain, onMakeVice, showActions }: {
  player: Player;
  isCaptain?: boolean;
  isVice?: boolean;
  onClick?: () => void;
  className?: string;
  weekOffset?: number;
  isSelected?: boolean;
  onRemove?: () => void;
  onMakeCaptain?: () => void;
  onMakeVice?: () => void;
  showActions?: boolean;
}) {

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
    <motion.div
      className={cn(
        "group relative rounded-xl border-2 shadow-sm transition-all",
        isSelected 
          ? "border-solid border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-400 shadow-lg scale-105"
          : "border-dashed border-transparent bg-card/50 hover:border-primary/50 hover:bg-card/70 hover:shadow-md",
        className
      )}
      style={{ width: '140px', height: '200px' }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <button
        onClick={onClick}
        className="w-full h-full cursor-pointer"
        aria-label={`${player.name}, ${player.position} from ${player.team}${isSelected ? ' (selected for swap)' : ''}`}
      >
      <div className="relative h-full">
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

        {/* Injury/Suspension/Doubtful flag */}
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
            <div className="absolute right-2 top-2 z-10">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${color}`}>
                      {label}{typeof chance === 'number' ? ` ${chance}%` : ''}
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

        {/* Large Team Shirt - visible and prominent */}
        <div className="flex justify-center items-center h-32 pt-2 pb-2">
          <TeamShirt team={player.team} className="w-24 h-24" />
        </div>

        {/* Ultra-compact transparent info card */}
        <div className="bg-white/60 rounded-md mx-2 mb-2 px-2 py-0.5 shadow-sm">
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
      </button>

      {/* Quick Action Buttons */}
      {showActions && (onRemove || onMakeCaptain || onMakeVice) && (
        <div className="absolute bottom-1 left-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {onMakeCaptain && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMakeCaptain(); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-0.5 rounded py-1 text-[10px] font-bold transition-colors",
                      isCaptain 
                        ? "bg-emerald-600 text-white"
                        : "bg-white/90 hover:bg-emerald-100 text-emerald-700 border border-emerald-300"
                    )}
                    aria-label="Make Captain"
                  >
                    <Crown className="h-3 w-3" /> C
                  </button>
                </TooltipTrigger>
                <TooltipContent>Make Captain</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onMakeVice && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMakeVice(); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-0.5 rounded py-1 text-[10px] font-bold transition-colors",
                      isVice 
                        ? "bg-sky-600 text-white"
                        : "bg-white/90 hover:bg-sky-100 text-sky-700 border border-sky-300"
                    )}
                    aria-label="Make Vice Captain"
                  >
                    <Shield className="h-3 w-3" /> V
                  </button>
                </TooltipTrigger>
                <TooltipContent>Make Vice Captain</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onRemove && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="flex-1 flex items-center justify-center rounded py-1 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 transition-colors"
                    aria-label="Remove Player"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Remove Player</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </motion.div>
  );
});
