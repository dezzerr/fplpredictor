"use client";

import { memo, useMemo } from "react";
import { cn, getFPLDisplayName } from "@/lib/utils";
import { TeamShirt } from "@/components/TeamShirt";
import { Player, getFixturesForWeek, formatFixtureText, getFixtureDifficulty } from "@/lib/data";
import { weeklyExp } from "@/lib/optimizer";
import { useLiveGwContext } from "@/components/LiveGwProvider";

interface MobilePlayerTileProps {
  player: Player;
  isCaptain?: boolean;
  isVice?: boolean;
  onClick?: () => void;
  weekOffset?: number;
  isSelected?: boolean;
  showPrice?: boolean;
  variant?: "starter" | "bench";
}

export const MobilePlayerTile = memo(function MobilePlayerTile({
  player,
  isCaptain,
  isVice,
  onClick,
  weekOffset = 0,
  isSelected,
  showPrice = false,
  variant = "starter",
}: MobilePlayerTileProps) {
  const { isLive, livePoints } = useLiveGwContext();
  const showLive = isLive && weekOffset === 0;
  const livePlayerPts = showLive ? (livePoints[player.id] ?? null) : null;

  const gwFixtures = useMemo(() => getFixturesForWeek(player, weekOffset), [player.nextFixtures, weekOffset]);
  const fixText = useMemo(() => formatFixtureText(gwFixtures), [gwFixtures]);
  const isDGW = gwFixtures.length >= 2;
  const isBlank = gwFixtures.length === 0;

  const weekPts = useMemo(
    () => weeklyExp(player, weekOffset),
    [player.id, player.expExplain?.final, player.expPoints, player.nextFixtures, weekOffset]
  );

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
      className={cn(
        "flex flex-col items-center w-full transition-all",
        isSelected && "scale-105 ring-2 ring-blue-400 rounded-lg"
      )}
    >
      {/* Price tag - shown in transfer view */}
      {showPrice && (
        <div className="px-2 py-0.5 rounded-sm text-[11px] font-bold mb-1 bg-violet-600 text-white shadow-sm">
          £{(player.price / 10).toFixed(1)}m
        </div>
      )}

      {/* Jersey with captain/vice badge */}
      <div className="relative">
        {/* Captain/Vice badge - positioned top-left like FPL app */}
        {(isCaptain || isVice) && (
          <div className={cn(
            "absolute -left-2 top-0 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md",
            isCaptain ? "bg-black" : "bg-gray-500"
          )}>
            {isCaptain ? "C" : "V"}
          </div>
        )}

        {/* Injury/flag indicator - positioned top-right */}
        {hasFlag && (
          <div className="absolute -right-2 top-0 z-10">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md",
              rawStatus === "i" ? "bg-red-500 text-white" : 
              rawStatus === "s" ? "bg-orange-500 text-white" : 
              "bg-yellow-400 text-black"
            )}>
              !
            </div>
          </div>
        )}

        {/* DGW badge */}
        {isDGW && (
          <div className={cn(
            "absolute z-10 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md bg-blue-500 border border-white",
            hasFlag ? "-right-2 bottom-0" : "-right-2 top-0"
          )}>
            {gwFixtures.length}
          </div>
        )}

        <TeamShirt team={player.team} className="w-14 h-14 drop-shadow-md" />
      </div>

      {/* Player info box - FPL style dark box */}
      <div className={cn(
        "w-full mt-1.5 rounded overflow-hidden min-w-[60px]",
        isSelected ? "ring-2 ring-blue-400" : ""
      )}>
        {/* Name row */}
        <div className={cn(
          "px-1.5 py-0.5 text-center",
          variant === "bench" && isSelected ? "bg-violet-600" : "bg-slate-800"
        )}>
          <div className="text-[10px] font-bold text-white truncate leading-tight">
            {getFPLDisplayName(player.name)}
          </div>
        </div>
        {/* Fixture row with FDR color */}
        <div className={cn(
          "px-1 py-0.5 text-center",
          fdrColor
        )}>
          <div className={cn(
            "font-medium text-white leading-tight",
            isDGW ? "text-[7px]" : "text-[9px]"
          )} suppressHydrationWarning>
            {isBlank ? 'BLANK' : fixText || player.team}
          </div>
        </div>
        {/* Points row - live or predicted */}
        <div className={cn(
          "px-1.5 py-0.5 text-center",
          livePlayerPts !== null ? "bg-emerald-700" : "bg-slate-700"
        )}>
          <div className={cn(
            "text-[10px] font-bold leading-tight",
            livePlayerPts !== null ? "text-white" : "text-emerald-400"
          )} suppressHydrationWarning>
            {livePlayerPts !== null ? (
              <span className="flex items-center justify-center gap-0.5">
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
