"use client";

import { TeamShirt } from "@/components/TeamShirt";
import { Player, getFixturesForWeek, formatFixtureText, getFixtureDifficulty } from "@/lib/data";
import { cn, getFPLDisplayName } from "@/lib/utils";
import { weeklyExp } from "@/lib/optimizer";
import { memo, useMemo } from "react";
import { useLiveGwContext } from "@/components/LiveGwProvider";

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

  const { isLive, livePoints } = useLiveGwContext();
  const w = weekOffset ?? 0;
  const showLive = isLive && w === 0;
  const livePlayerPts = showLive ? (livePoints[player.id] ?? null) : null;
  const gwFixtures = useMemo(() => getFixturesForWeek(player, w), [player.nextFixtures, w]);
  const fixText = useMemo(() => formatFixtureText(gwFixtures), [gwFixtures]);
  const isDGW = gwFixtures.length >= 2;
  const isBlank = gwFixtures.length === 0;
  const weekPts = useMemo(() => weeklyExp(player, w), [player.id, player.expExplain?.final, player.expPoints, player.nextFixtures, w]);

  // Check for injury/suspension status
  const ex: any = player.expExplain as any;
  const rawStatus: string | undefined = ex?.rawStatus;
  const hasFlag = rawStatus && rawStatus !== "a";

  // Fixture difficulty for coloring (diff is 1-5 scale)
  const fdr = useMemo(() => getFixtureDifficulty(gwFixtures), [gwFixtures]);
  const fdrColor = isBlank ? "bg-slate-400" : fdr <= 2 ? "bg-green-600" : fdr === 3 ? "bg-gray-500" : fdr === 4 ? "bg-orange-500" : "bg-red-600";

  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={`${getFPLDisplayName(player.name)}. ${isSelected ? "Selected for substitution." : "Open player details."}`}
      className={cn(
        "flex flex-col items-center w-full transition-all",
        isSelected && "scale-105 ring-2 ring-blue-400 rounded-lg",
        className
      )}
    >
      {/* Jersey with captain/vice badge */}
      <div className="relative">
        {/* Captain/Vice badge - positioned top-left like FPL app */}
        {(isCaptain || isVice) && (
          <div className={cn(
            "absolute -left-2 top-0 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md",
            isCaptain ? "bg-black" : "bg-gray-500"
          )}>
            {isCaptain ? "C" : "V"}
          </div>
        )}

        {/* Injury/flag indicator - positioned top-right */}
        {hasFlag && (
          <div className="absolute -right-2 top-0 z-10">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-md",
              rawStatus === "i" ? "bg-red-500 text-white" : 
              rawStatus === "s" ? "bg-orange-500 text-white" : 
              "bg-yellow-400 text-black"
            )}>
              !
            </div>
          </div>
        )}

        {/* DGW badge - green circle with number, positioned bottom-right */}
        {isDGW && (
          <div className={cn(
            "absolute z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white shadow-md bg-blue-500 border border-white",
            hasFlag ? "-right-2 bottom-0" : "-right-2 top-0"
          )}>
            {gwFixtures.length}
          </div>
        )}

        <TeamShirt team={player.team} className="w-14 h-14 sm:w-[72px] sm:h-[72px] drop-shadow-md" />
      </div>

      {/* Player info box - FPL style dark box */}
      <div className={cn(
        "w-full mt-2 rounded overflow-hidden min-w-[70px] sm:min-w-[90px]",
        isSelected ? "ring-2 ring-blue-400" : ""
      )}>
        {/* Name row */}
        <div className="bg-slate-800 px-2 py-1 sm:py-1.5 text-center">
          <div className="text-[11px] sm:text-sm font-bold text-white truncate leading-tight">
            {getFPLDisplayName(player.name)}
          </div>
        </div>
        {/* Fixture row with FDR color */}
        <div className={cn(
          "px-1 py-0.5 sm:py-1 text-center",
          fdrColor
        )}>
          <div className={cn(
            "font-medium text-white leading-tight",
            isDGW ? "text-[8px] sm:text-[10px]" : "text-[10px] sm:text-xs"
          )} suppressHydrationWarning>
            {isBlank ? 'BLANK' : fixText || player.team}
          </div>
        </div>
        {/* Points row - live or predicted */}
        <div className={cn(
          "px-2 py-1 sm:py-1.5 text-center",
          livePlayerPts !== null ? "bg-emerald-700" : "bg-slate-700"
        )}>
          <div className={cn(
            "text-[11px] sm:text-sm font-bold leading-tight",
            livePlayerPts !== null ? "text-white" : "text-emerald-400"
          )} suppressHydrationWarning>
            {livePlayerPts !== null ? (
              <span className="flex items-center justify-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-200" />
                </span>
                {livePlayerPts}
              </span>
            ) : (
              weekPts.toFixed(1)
            )}
          </div>
        </div>
      </div>
    </button>
  );
});
