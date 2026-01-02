"use client";

import { useSquadStore } from "@/store/squad";

interface MobileKpisHeaderProps {
  weekOffset?: number;
}

export function MobileKpisHeader({ weekOffset = 0 }: MobileKpisHeaderProps) {
  const teamRatingForWeek = useSquadStore((s) => s.teamRatingForWeek);
  const gwRatingForWeek = useSquadStore((s) => s.gwRatingForWeek);
  const totalExpForWeek = useSquadStore((s) => s.totalExpForWeek);
  const squad = useSquadStore((s) => s.squad);

  const teamRating = teamRatingForWeek(weekOffset);
  const gwRating = gwRatingForWeek(weekOffset);
  const predictedPts = totalExpForWeek(weekOffset);
  const bank = squad.bank;

  // Color coding for ratings
  const getRatingColor = (rating: number) => {
    if (rating >= 85) return "text-emerald-400";
    if (rating >= 70) return "text-lime-400";
    if (rating >= 55) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 backdrop-blur-sm rounded-lg mx-2">
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">Team</span>
        <span className={`text-sm font-bold ${getRatingColor(teamRating)}`} suppressHydrationWarning>
          {teamRating.toFixed(0)}%
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">GW</span>
        <span className={`text-sm font-bold ${getRatingColor(gwRating)}`} suppressHydrationWarning>
          {gwRating.toFixed(0)}%
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">Pts</span>
        <span className="text-sm font-bold text-white" suppressHydrationWarning>
          {predictedPts.toFixed(1)}
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">Bank</span>
        <span className="text-sm font-bold text-white" suppressHydrationWarning>
          £{bank.toFixed(1)}m
        </span>
      </div>
    </div>
  );
}
