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
        "group relative rounded-xl border-2 shadow-sm transition-all w-full",
        isSelected 
          ? "border-solid border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-400 shadow-lg scale-105"
          : "border-dashed border-transparent bg-card/50 hover:border-primary/50 hover:bg-card/70 hover:shadow-md",
        className
      )}
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
          <div className="absolute left-0.5 sm:left-2 top-0.5 sm:top-2 z-10 flex gap-0.5">
            {isCaptain && (
              <span className="flex items-center justify-center w-4 h-4 sm:w-auto sm:h-auto sm:gap-1 rounded-full bg-emerald-600 sm:px-2 sm:py-0.5 text-[8px] sm:text-xs font-bold text-white shadow-sm" aria-label="Captain">
                <span className="hidden sm:inline"><Crown className="h-3.5 w-3.5" /></span> C
              </span>
            )}
            {isVice && (
              <span className="flex items-center justify-center w-4 h-4 sm:w-auto sm:h-auto sm:gap-1 rounded-full bg-sky-600 sm:px-2 sm:py-0.5 text-[8px] sm:text-xs font-bold text-white shadow-sm" aria-label="Vice Captain">
                <span className="hidden sm:inline"><Shield className="h-3.5 w-3.5" /></span> V
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

        {/* Team Shirt - smaller on mobile */}
        <div className="flex justify-center items-center pt-1 sm:pt-2">
          <TeamShirt team={player.team} className="w-8 h-8 sm:w-14 sm:h-14" />
        </div>

        {/* Player info - with dark background for readability */}
        <div className="bg-slate-900/85 rounded mx-0.5 sm:mx-1 px-1 py-0.5 text-center">
          {/* Name - truncated */}
          <div className="text-[8px] sm:text-[11px] font-bold text-white truncate leading-tight">
            {getFPLDisplayName(player.name)}
          </div>
          {/* Opponent fixture */}
          <div className="text-[7px] sm:text-[9px] text-amber-300 leading-tight">
            {fixText || (player.nextFixtures?.[0] ? `${player.nextFixtures[0].opp} (${player.nextFixtures[0].H ? 'H' : 'A'})` : player.team)}
          </div>
          {/* Points - prominent green */}
          <div className="text-[9px] sm:text-xs font-bold text-emerald-400 leading-tight">
            {weekPts.toFixed(1)}
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
