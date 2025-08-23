"use client";

import { motion } from "framer-motion";
import { useDrag } from "react-dnd";
import { Crown, Shield } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Player } from "@/lib/data";
import { cn, teamColor } from "@/lib/utils";
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
        "relative w-full overflow-hidden rounded-2xl border border-white/25 bg-transparent text-left shadow-lg",
        isDragging && "opacity-60",
        className
      )}
      aria-label={`${player.name}, ${player.position} from ${player.team}`}
    >
      {/* Kit header */}
      <div
        className="relative h-[92px] w-full"
        style={{ backgroundColor: teamColor(player.team) }}
      >
        {(isCaptain || isVice) && (
          <div className="absolute left-1 top-1 flex gap-1">
            {isCaptain && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white" aria-label="Captain">
                <Crown className="h-3.5 w-3.5" /> C
              </span>
            )}
            {isVice && (
              <span className="flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white" aria-label="Vice Captain">
                <Shield className="h-3.5 w-3.5" /> V
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="rounded-t-none rounded-b-2xl bg-white px-2 py-2 text-[11px] leading-tight text-slate-900 dark:bg-zinc-100">
        <div className="truncate font-semibold">{player.name}</div>
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-600">
          <span className="truncate">{player.team} • {player.position} • £{player.price.toFixed(1)}</span>
          <div className="flex items-center gap-1">
            {fixText && <span className="font-medium truncate max-w-[64px] sm:max-w-[92px]">{fixText}</span>}
            <span className="opacity-40">•</span>
            {player.expExplain ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help font-semibold text-amber-600 underline decoration-dotted underline-offset-2 dark:text-amber-500" aria-label={`Expected points for GW${w+1}: ${weekPts.toFixed(1)}`}>
                      {weekPts.toFixed(1)} pts
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {player.expExplain?.source && (
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Source: {player.expExplain.source === 'market' ? 'Market' : 'FPL'}</div>
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
              <span className="font-semibold text-amber-600 dark:text-amber-500" aria-label={`Expected points ${weekPts.toFixed(1)}`}>{weekPts.toFixed(1)} pts</span>
            )}
            {typeof fixtureCount === 'number' && (
              <span
                className={cn(
                  "ml-1 rounded px-1.5 py-0.5 text-[9px] font-medium",
                  fixtureCount === 0
                    ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"
                    : fixtureCount >= 2
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200"
                      : "bg-muted text-muted-foreground"
                )}
                aria-label={fixtureCount === 0 ? 'Blank GW' : fixtureCount >= 2 ? 'Double GW' : 'Single GW'}
              >
                {fixtureCount === 0 ? 'Blank' : fixtureCount >= 2 ? 'DGW' : 'SGW'}
              </span>
            )}
            {player.expExplain?.source && (
              <span
                className={cn(
                  "ml-1 rounded px-1.5 py-0.5 text-[9px] font-medium",
                  player.expExplain.source === 'market'
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"
                )}
                aria-label={`Projection source ${player.expExplain.source === 'market' ? 'Market' : 'FPL'}`}
              >
                {player.expExplain.source === 'market' ? 'Market' : 'FPL'}
              </span>
            )}
            {typeof player.eoRisk === 'number' && (
              <span className="ml-1 hidden rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 md:inline" aria-label={`EO risk ${player.eoRisk.toFixed(1)}`}>
                EO {player.eoRisk.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
});
