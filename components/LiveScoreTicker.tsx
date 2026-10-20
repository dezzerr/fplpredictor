"use client";

import { useLiveGwContext } from "@/components/LiveGwProvider";
import type { LiveFixture } from "@/hooks/useLiveGw";
import { cn } from "@/lib/utils";

export function LiveScoreTicker({ className }: { className?: string }) {
  const { isLive, fixtures } = useLiveGwContext();

  if (!isLive || fixtures.length === 0) return null;

  const inProgress = fixtures.filter((f) => f.started && !f.finished);
  const finished = fixtures.filter((f) => f.finished || f.finishedProvisional);
  const upcoming = fixtures.filter((f) => !f.started);

  return (
    <div className={cn("bg-slate-900 rounded-lg px-3 py-2 text-xs", className)}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-white font-semibold text-[11px] uppercase tracking-wide">
          Live Scores
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {inProgress.map((fx) => (
          <FixtureChip key={fx.id} fixture={fx} variant="live" />
        ))}
        {finished.map((fx) => (
          <FixtureChip key={fx.id} fixture={fx} variant="finished" />
        ))}
        {upcoming.map((fx) => (
          <FixtureChip key={fx.id} fixture={fx} variant="upcoming" />
        ))}
      </div>
    </div>
  );
}

function FixtureChip({
  fixture,
  variant,
}: {
  fixture: LiveFixture;
  variant: "live" | "finished" | "upcoming";
}) {
  return (
    <div
      className={cn(
        "flex-shrink-0 flex items-center gap-1.5 rounded-md px-2 py-1",
        variant === "live" && "bg-emerald-900/50 border border-emerald-700/50",
        variant === "finished" && "bg-slate-800",
        variant === "upcoming" && "bg-slate-800/60 opacity-70"
      )}
    >
      <span className="text-white font-medium">{fixture.home}</span>
      <span
        className={cn(
          "font-bold tabular-nums",
          variant === "live" ? "text-emerald-400" : "text-slate-300"
        )}
      >
        {fixture.homeScore ?? "-"} - {fixture.awayScore ?? "-"}
      </span>
      <span className="text-white font-medium">{fixture.away}</span>
      {variant === "live" && fixture.minutes > 0 && (
        <span className="text-emerald-400 text-[9px] font-bold ml-0.5">
          {fixture.minutes}&apos;
        </span>
      )}
      {variant === "finished" && (
        <span className="text-slate-500 text-[9px] font-medium ml-0.5">FT</span>
      )}
    </div>
  );
}
