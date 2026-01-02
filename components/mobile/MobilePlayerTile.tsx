"use client";

import { memo, useMemo } from "react";
import { cn, getFPLDisplayName } from "@/lib/utils";
import { TeamShirt } from "@/components/TeamShirt";
import { Player } from "@/lib/data";
import { weeklyExp } from "@/lib/optimizer";

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
  const f0 = player.nextFixtures?.[weekOffset];
  const fixText = useMemo(() => {
    return f0 ? `${f0.opp} (${f0.H ? "H" : "A"})` : "";
  }, [f0]);

  const weekPts = useMemo(
    () => weeklyExp(player, weekOffset),
    [player.id, player.expExplain?.final, player.expPoints, player.nextFixtures, weekOffset]
  );

  // Check for injury/suspension status
  const ex: any = player.expExplain as any;
  const rawStatus: string | undefined = ex?.rawStatus;
  const hasFlag = rawStatus && rawStatus !== "a";

  // Fixture difficulty for coloring (diff is 1-5 scale)
  const fdr = f0?.diff ?? 3;
  const fdrColor = fdr <= 2 ? "bg-green-600" : fdr === 3 ? "bg-gray-500" : fdr === 4 ? "bg-orange-500" : "bg-red-600";

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
        <div className="px-2 py-0.5 rounded-sm text-[11px] font-bold mb-1 bg-purple-600 text-white shadow-sm">
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
          variant === "bench" && isSelected ? "bg-purple-600" : "bg-slate-800"
        )}>
          <div className="text-[10px] font-bold text-white truncate leading-tight">
            {getFPLDisplayName(player.name)}
          </div>
        </div>
        {/* Fixture row with FDR color */}
        <div className={cn(
          "px-1.5 py-0.5 text-center",
          fdrColor
        )}>
          <div className="text-[9px] font-medium text-white leading-tight" suppressHydrationWarning>
            {fixText || player.team}
          </div>
        </div>
        {/* Predicted points row */}
        <div className="bg-slate-700 px-1.5 py-0.5 text-center">
          <div className="text-[10px] font-bold text-emerald-400 leading-tight" suppressHydrationWarning>
            {weekPts.toFixed(1)}
          </div>
        </div>
      </div>
    </button>
  );
});
